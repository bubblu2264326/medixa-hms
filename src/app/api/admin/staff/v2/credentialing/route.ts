import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";

type AccountType = "staff" | "doctor";

function normalizeAccountType(value: unknown): AccountType {
  return value === "doctor" ? "doctor" : "staff";
}

function toNullableNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function resolveActorStaffId(userCode: string) {
  const result = await query("SELECT staff_id FROM staff WHERE user_code = $1 LIMIT 1", [userCode]);
  return result.rows[0]?.staff_id ? Number(result.rows[0].staff_id) : null;
}

async function recordCredentialEvent(input: {
  credentialId: number;
  actorStaffId: number | null;
  eventType: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  note?: string | null;
  payload?: unknown;
}) {
  await query(
    `
    INSERT INTO employee_credential_events (
      credential_id,
      actor_staff_id,
      event_type,
      from_status,
      to_status,
      event_note,
      payload
    ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `,
    [
      input.credentialId,
      input.actorStaffId,
      input.eventType,
      input.fromStatus ?? null,
      input.toStatus ?? null,
      input.note ?? null,
      input.payload == null ? null : JSON.stringify(input.payload),
    ]
  );
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    const { searchParams } = new URL(req.url);

    const accountType = searchParams.get("account_type");
    const personId = toNullableNumber(searchParams.get("person_id") ?? searchParams.get("staff_id"));
    const status = searchParams.get("status");
    const department = searchParams.get("department");
    const facilityCode = searchParams.get("facility_code");
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const expiringDays = toNullableNumber(searchParams.get("expiring_days")) ?? 30;

    const params: any[] = [];
    let where = "WHERE 1=1";

    if (accountType === "staff" || accountType === "doctor") {
      params.push(accountType);
      where += ` AND ec.account_type = $${params.length}`;
    }
    if (personId) {
      params.push(personId);
      where += ` AND ec.person_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      where += ` AND ec.verification_status = $${params.length}`;
    }
    if (department) {
      params.push(department);
      where += ` AND COALESCE(s.department, d.specialization) = $${params.length}`;
    }
    if (facilityCode) {
      params.push(facilityCode);
      where += ` AND COALESCE(s.facility_code, 'MAIN') = $${params.length}`;
    }
    if (fromDate) {
      params.push(fromDate);
      where += ` AND ec.created_at::date >= $${params.length}::date`;
    }
    if (toDate) {
      params.push(toDate);
      where += ` AND ec.created_at::date <= $${params.length}::date`;
    }

    const list = await query(
      `
      SELECT
        ec.credential_id,
        ec.account_type,
        ec.person_id,
        ec.staff_id,
        ec.doctor_id,
        ec.credential_type_id,
        ect.credential_code,
        ect.credential_name,
        ect.credential_category,
        ec.credential_number,
        ec.credential_title,
        ec.issued_on,
        ec.expires_on,
        ec.issuing_authority,
        ec.issuing_country,
        ec.verification_status,
        ec.renewal_status,
        ec.reminder_status,
        ec.submitted_at,
        ec.reviewed_by,
        reviewer.name AS reviewed_by_name,
        ec.reviewed_at,
        ec.review_note,
        ec.verified_at,
        ec.revoked_at,
        ec.revoke_reason,
        ec.created_at,
        ec.updated_at,
        COALESCE(s.name, d.doctor_name) AS employee_name,
        COALESCE(s.user_code, d.user_code) AS user_code,
        COALESCE(s.role, 'Doctor') AS role,
        COALESCE(s.department, d.specialization) AS department,
        COALESCE(s.facility_code, 'MAIN') AS facility_code,
        CASE
          WHEN ec.expires_on IS NULL THEN NULL
          ELSE (ec.expires_on - CURRENT_DATE)
        END AS days_until_expiry
      FROM employee_credentials ec
      JOIN employee_credential_types ect ON ect.credential_type_id = ec.credential_type_id
      LEFT JOIN staff s ON s.staff_id = ec.staff_id
      LEFT JOIN doctor d ON d.doctor_id = ec.doctor_id
      LEFT JOIN staff reviewer ON reviewer.staff_id = ec.reviewed_by
      ${where}
      ORDER BY
        CASE WHEN ec.expires_on IS NULL THEN 1 ELSE 0 END,
        ec.expires_on ASC,
        ec.created_at DESC
      `,
      params
    );

    const summary = await query(
      `
      WITH filtered AS (
        SELECT ec.*
        FROM employee_credentials ec
        LEFT JOIN staff s ON s.staff_id = ec.staff_id
        LEFT JOIN doctor d ON d.doctor_id = ec.doctor_id
        ${where}
      )
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE verification_status = 'verified')::int AS verified,
        COUNT(*) FILTER (WHERE verification_status IN ('draft','submitted','under_review'))::int AS in_progress,
        COUNT(*) FILTER (WHERE verification_status = 'rejected')::int AS rejected,
        COUNT(*) FILTER (WHERE verification_status = 'revoked')::int AS revoked,
        COUNT(*) FILTER (WHERE expires_on IS NOT NULL AND expires_on < CURRENT_DATE)::int AS expired,
        COUNT(*) FILTER (
          WHERE expires_on IS NOT NULL
            AND expires_on >= CURRENT_DATE
            AND expires_on <= (CURRENT_DATE + ($${params.length + 1}::int * INTERVAL '1 day'))
        )::int AS expiring_soon
      FROM filtered
      `,
      [...params, expiringDays]
    );

    const alerts = await query(
      `
      WITH filtered AS (
        SELECT
          ec.credential_id,
          ec.account_type,
          ec.person_id,
          ec.verification_status,
          ec.expires_on,
          COALESCE(s.name, d.doctor_name) AS employee_name,
          COALESCE(s.user_code, d.user_code) AS user_code,
          ect.credential_name
        FROM employee_credentials ec
        JOIN employee_credential_types ect ON ect.credential_type_id = ec.credential_type_id
        LEFT JOIN staff s ON s.staff_id = ec.staff_id
        LEFT JOIN doctor d ON d.doctor_id = ec.doctor_id
        ${where}
      )
      SELECT
        credential_id,
        account_type,
        person_id,
        employee_name,
        user_code,
        credential_name,
        verification_status,
        expires_on,
        CASE
          WHEN expires_on IS NULL THEN NULL
          ELSE (expires_on - CURRENT_DATE)
        END AS days_until_expiry
      FROM filtered
      WHERE expires_on IS NOT NULL
        AND expires_on <= (CURRENT_DATE + ($${params.length + 1}::int * INTERVAL '1 day'))
      ORDER BY expires_on ASC
      LIMIT 100
      `,
      [...params, expiringDays]
    );

    const credentialTypes = await query(
      `
      SELECT
        credential_type_id,
        credential_code,
        credential_name,
        credential_category
      FROM employee_credential_types
      WHERE active = true
      ORDER BY credential_name
      `
    );

    return NextResponse.json({
      items: list.rows,
      summary: summary.rows[0] ?? {
        total: 0,
        verified: 0,
        in_progress: 0,
        rejected: 0,
        revoked: 0,
        expired: 0,
        expiring_soon: 0,
      },
      alerts: alerts.rows,
      credential_types: credentialTypes.rows,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 credentialing GET error", error);
    return NextResponse.json({ error: "Failed to load credentialing data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const body = await req.json();

    const accountType = normalizeAccountType(body?.account_type);
    const personId = toNullableNumber(body?.person_id ?? body?.staff_id);
    const credentialTypeId = toNullableNumber(body?.credential_type_id);
    const credentialNumber = String(body?.credential_number ?? "").trim();

    if (!personId || !credentialTypeId || !credentialNumber) {
      return NextResponse.json(
        { error: "account_type, person_id (or staff_id), credential_type_id and credential_number are required" },
        { status: 400 }
      );
    }

    const staffId = accountType === "staff" ? personId : null;
    const doctorId = accountType === "doctor" ? personId : null;

    const inserted = await query(
      `
      INSERT INTO employee_credentials (
        account_type,
        person_id,
        staff_id,
        doctor_id,
        credential_type_id,
        credential_number,
        credential_title,
        issued_on,
        expires_on,
        issuing_authority,
        issuing_country,
        metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12::jsonb, '{}'::jsonb)
      )
      RETURNING *
      `,
      [
        accountType,
        personId,
        staffId,
        doctorId,
        credentialTypeId,
        credentialNumber,
        body?.credential_title ?? null,
        body?.issued_on ?? null,
        body?.expires_on ?? null,
        body?.issuing_authority ?? null,
        body?.issuing_country ?? null,
        body?.metadata ? JSON.stringify(body.metadata) : null,
      ]
    );

    const actorStaffId = await resolveActorStaffId(actor.user_code);
    const row = inserted.rows[0];

    await recordCredentialEvent({
      credentialId: Number(row.credential_id),
      actorStaffId,
      eventType: "created",
      toStatus: String(row.verification_status),
      payload: {
        accountType,
        personId,
        credentialTypeId,
      },
    });

    await logAuditEvent({
      actorUserCode: actor.user_code,
      action: "Credential record created",
      entityType: "employee_credential",
      entityId: row?.credential_id ?? null,
      details: {
        accountType,
        personId,
        credentialTypeId,
        credentialNumber,
      },
    });

    return NextResponse.json(row, { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 credentialing POST error", error);
    return NextResponse.json({ error: "Failed to create credential record" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const body = await req.json();
    const credentialId = toNullableNumber(body?.credential_id);
    const action = String(body?.action ?? "update").toLowerCase();

    if (!credentialId) {
      return NextResponse.json({ error: "credential_id is required" }, { status: 400 });
    }

    const existing = await query(
      `SELECT * FROM employee_credentials WHERE credential_id = $1 LIMIT 1`,
      [credentialId]
    );

    if (!existing.rows[0]) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    const before = existing.rows[0];
    const actorStaffId = await resolveActorStaffId(actor.user_code);

    let updatedRow = before;

    if (action === "update") {
      const updated = await query(
        `
        UPDATE employee_credentials
        SET
          credential_number = COALESCE($2, credential_number),
          credential_title = COALESCE($3, credential_title),
          issued_on = COALESCE($4, issued_on),
          expires_on = COALESCE($5, expires_on),
          issuing_authority = COALESCE($6, issuing_authority),
          issuing_country = COALESCE($7, issuing_country),
          metadata = COALESCE($8::jsonb, metadata),
          updated_at = CURRENT_TIMESTAMP
        WHERE credential_id = $1
        RETURNING *
        `,
        [
          credentialId,
          body?.credential_number ?? null,
          body?.credential_title ?? null,
          body?.issued_on ?? null,
          body?.expires_on ?? null,
          body?.issuing_authority ?? null,
          body?.issuing_country ?? null,
          body?.metadata ? JSON.stringify(body.metadata) : null,
        ]
      );
      updatedRow = updated.rows[0];
    } else if (action === "submit") {
      const updated = await query(
        `
        UPDATE employee_credentials
        SET
          verification_status = 'submitted',
          submitted_at = CURRENT_TIMESTAMP,
          review_note = COALESCE($2, review_note),
          updated_at = CURRENT_TIMESTAMP
        WHERE credential_id = $1
        RETURNING *
        `,
        [credentialId, body?.review_note ?? null]
      );
      updatedRow = updated.rows[0];
    } else if (action === "verify") {
      const updated = await query(
        `
        UPDATE employee_credentials
        SET
          verification_status = 'verified',
          reviewed_by = $2,
          reviewed_at = CURRENT_TIMESTAMP,
          verified_at = CURRENT_TIMESTAMP,
          review_note = $3,
          renewal_status = CASE
            WHEN expires_on IS NULL THEN 'not_due'
            WHEN expires_on < CURRENT_DATE THEN 'overdue'
            WHEN expires_on <= (CURRENT_DATE + INTERVAL '60 day') THEN 'due'
            ELSE 'not_due'
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE credential_id = $1
        RETURNING *
        `,
        [credentialId, actorStaffId, body?.review_note ?? null]
      );
      updatedRow = updated.rows[0];
    } else if (action === "reject") {
      const updated = await query(
        `
        UPDATE employee_credentials
        SET
          verification_status = 'rejected',
          reviewed_by = $2,
          reviewed_at = CURRENT_TIMESTAMP,
          review_note = COALESCE($3, review_note),
          updated_at = CURRENT_TIMESTAMP
        WHERE credential_id = $1
        RETURNING *
        `,
        [credentialId, actorStaffId, body?.review_note ?? null]
      );
      updatedRow = updated.rows[0];
    } else if (action === "renew") {
      const updated = await query(
        `
        UPDATE employee_credentials
        SET
          verification_status = CASE WHEN $3::date IS NOT NULL THEN 'verified' ELSE verification_status END,
          renewal_status = CASE WHEN $3::date IS NOT NULL THEN 'renewed' ELSE 'in_progress' END,
          issued_on = COALESCE($2::date, issued_on),
          expires_on = COALESCE($3::date, expires_on),
          review_note = COALESCE($4, review_note),
          updated_at = CURRENT_TIMESTAMP
        WHERE credential_id = $1
        RETURNING *
        `,
        [credentialId, body?.issued_on ?? null, body?.expires_on ?? null, body?.review_note ?? null]
      );
      updatedRow = updated.rows[0];
    } else if (action === "revoke") {
      const updated = await query(
        `
        UPDATE employee_credentials
        SET
          verification_status = 'revoked',
          revoked_by = $2,
          revoked_at = CURRENT_TIMESTAMP,
          revoke_reason = COALESCE($3, revoke_reason),
          updated_at = CURRENT_TIMESTAMP
        WHERE credential_id = $1
        RETURNING *
        `,
        [credentialId, actorStaffId, body?.revoke_reason ?? null]
      );
      updatedRow = updated.rows[0];
    } else {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }

    await recordCredentialEvent({
      credentialId,
      actorStaffId,
      eventType: action,
      fromStatus: before.verification_status,
      toStatus: updatedRow.verification_status,
      note: body?.review_note ?? body?.revoke_reason ?? null,
      payload: {
        action,
      },
    });

    await logAuditEvent({
      actorUserCode: actor.user_code,
      action: `Credential ${action}`,
      entityType: "employee_credential",
      entityId: credentialId,
      details: {
        fromStatus: before.verification_status,
        toStatus: updatedRow.verification_status,
      },
    });

    return NextResponse.json({ success: true, item: updatedRow });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 credentialing PATCH error", error);
    return NextResponse.json({ error: "Failed to update credential record" }, { status: 500 });
  }
}
