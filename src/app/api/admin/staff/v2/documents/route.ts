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

async function appendDocumentReview(input: {
  documentId: number;
  versionId?: number | null;
  reviewerStaffId?: number | null;
  action: string;
  note?: string | null;
}) {
  await query(
    `
    INSERT INTO employee_document_reviews (
      document_id,
      version_id,
      reviewer_staff_id,
      review_action,
      review_note
    )
    VALUES ($1, $2, $3, $4, $5)
    `,
    [input.documentId, input.versionId ?? null, input.reviewerStaffId ?? null, input.action, input.note ?? null]
  );
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    const { searchParams } = new URL(req.url);

    const accountType = searchParams.get("account_type");
    const personId = toNullableNumber(searchParams.get("person_id") ?? searchParams.get("staff_id"));
    const status = searchParams.get("status");
    const documentTypeId = toNullableNumber(searchParams.get("document_type_id"));
    const department = searchParams.get("department");
    const facilityCode = searchParams.get("facility_code");
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const expiringDays = toNullableNumber(searchParams.get("expiring_days")) ?? 30;

    const params: any[] = [];
    let where = "WHERE 1=1";

    if (accountType === "staff" || accountType === "doctor") {
      params.push(accountType);
      where += ` AND ed.account_type = $${params.length}`;
    }
    if (personId) {
      params.push(personId);
      where += ` AND ed.person_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      where += ` AND ed.review_status = $${params.length}`;
    }
    if (documentTypeId) {
      params.push(documentTypeId);
      where += ` AND ed.document_type_id = $${params.length}`;
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
      where += ` AND ed.created_at::date >= $${params.length}::date`;
    }
    if (toDate) {
      params.push(toDate);
      where += ` AND ed.created_at::date <= $${params.length}::date`;
    }

    const documents = await query(
      `
      SELECT
        ed.document_id,
        ed.account_type,
        ed.person_id,
        ed.staff_id,
        ed.doctor_id,
        ed.document_type_id,
        edt.document_code,
        edt.document_name,
        edt.document_category,
        edt.requires_expiry,
        ed.document_title,
        ed.document_description,
        ed.review_status,
        ed.visibility,
        ed.current_version_no,
        ed.effective_from,
        ed.effective_to,
        ed.expires_on,
        ed.required_by,
        ed.submitted_by,
        ed.submitted_at,
        ed.reviewed_by,
        reviewer.name AS reviewed_by_name,
        ed.reviewed_at,
        ed.review_note,
        ed.created_at,
        ed.updated_at,
        COALESCE(s.name, d.doctor_name) AS employee_name,
        COALESCE(s.user_code, d.user_code) AS user_code,
        COALESCE(s.role, 'Doctor') AS role,
        COALESCE(s.department, d.specialization) AS department,
        COALESCE(s.facility_code, 'MAIN') AS facility_code,
        latest.version_id AS latest_version_id,
        latest.file_url,
        latest.file_name,
        latest.mime_type,
        latest.file_size_bytes,
        latest.uploaded_at,
        CASE
          WHEN ed.expires_on IS NULL THEN NULL
          ELSE (ed.expires_on - CURRENT_DATE)
        END AS days_until_expiry
      FROM employee_documents ed
      JOIN employee_document_types edt ON edt.document_type_id = ed.document_type_id
      LEFT JOIN staff s ON s.staff_id = ed.staff_id
      LEFT JOIN doctor d ON d.doctor_id = ed.doctor_id
      LEFT JOIN staff reviewer ON reviewer.staff_id = ed.reviewed_by
      LEFT JOIN LATERAL (
        SELECT
          dv.version_id,
          dv.file_url,
          dv.file_name,
          dv.mime_type,
          dv.file_size_bytes,
          dv.uploaded_at
        FROM employee_document_versions dv
        WHERE dv.document_id = ed.document_id
          AND dv.is_active = true
        ORDER BY dv.version_no DESC
        LIMIT 1
      ) latest ON true
      ${where}
      ORDER BY
        CASE WHEN ed.expires_on IS NULL THEN 1 ELSE 0 END,
        ed.expires_on ASC,
        ed.created_at DESC
      `,
      params
    );

    const summary = await query(
      `
      WITH filtered AS (
        SELECT ed.*
        FROM employee_documents ed
        LEFT JOIN staff s ON s.staff_id = ed.staff_id
        LEFT JOIN doctor d ON d.doctor_id = ed.doctor_id
        ${where}
      ),
      employees AS (
        SELECT
          'staff'::text AS account_type,
          s.staff_id AS person_id,
          s.role,
          s.department,
          COALESCE(s.facility_code, 'MAIN') AS facility_code
        FROM staff s
        WHERE s.employment_status = 'active'
        UNION ALL
        SELECT
          'doctor'::text AS account_type,
          d.doctor_id AS person_id,
          'Doctor'::text AS role,
          d.specialization AS department,
          'MAIN'::text AS facility_code
        FROM doctor d
        WHERE COALESCE(d.employment_status, 'active') = 'active'
      ),
      required_pairs AS (
        SELECT DISTINCT
          e.account_type,
          e.person_id,
          r.document_type_id
        FROM employees e
        JOIN employee_document_requirements r ON r.active = true AND r.mandatory = true
        WHERE
          r.target_type = 'global'
          OR (r.target_type = 'account_type' AND r.target_value = e.account_type)
          OR (r.target_type = 'department' AND r.target_value = e.department)
          OR (r.target_type = 'facility' AND r.target_value = e.facility_code)
          OR (r.target_type = 'role' AND r.target_value = e.role)
      ),
      satisfied_required AS (
        SELECT DISTINCT
          ed.account_type,
          ed.person_id,
          ed.document_type_id
        FROM employee_documents ed
        WHERE ed.review_status IN ('approved', 'submitted', 'under_review')
      ),
      missing_required AS (
        SELECT COUNT(*)::int AS missing_count
        FROM required_pairs rp
        LEFT JOIN satisfied_required sr
          ON sr.account_type = rp.account_type
         AND sr.person_id = rp.person_id
         AND sr.document_type_id = rp.document_type_id
        WHERE sr.document_type_id IS NULL
      )
      SELECT
        (SELECT COUNT(*)::int FROM filtered) AS total,
        (SELECT COUNT(*)::int FROM filtered WHERE review_status = 'approved') AS approved,
        (SELECT COUNT(*)::int FROM filtered WHERE review_status IN ('draft', 'submitted', 'under_review')) AS in_progress,
        (SELECT COUNT(*)::int FROM filtered WHERE review_status = 'rejected') AS rejected,
        (SELECT COUNT(*)::int FROM filtered WHERE expires_on IS NOT NULL AND expires_on < CURRENT_DATE) AS expired,
        (SELECT COUNT(*)::int FROM filtered WHERE expires_on IS NOT NULL AND expires_on <= (CURRENT_DATE + ($${params.length + 1}::int * INTERVAL '1 day')) AND expires_on >= CURRENT_DATE) AS expiring_soon,
        (SELECT missing_count FROM missing_required) AS missing_required
      `,
      [...params, expiringDays]
    );

    const types = await query(
      `
      SELECT
        document_type_id,
        document_code,
        document_name,
        document_category,
        required_default,
        requires_expiry,
        retention_days
      FROM employee_document_types
      WHERE active = true
      ORDER BY document_name
      `
    );

    return NextResponse.json({
      items: documents.rows,
      summary: summary.rows[0] ?? {
        total: 0,
        approved: 0,
        in_progress: 0,
        rejected: 0,
        expired: 0,
        expiring_soon: 0,
        missing_required: 0,
      },
      document_types: types.rows,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 documents GET error", error);
    return NextResponse.json({ error: "Failed to load documents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const body = await req.json();

    const accountType = normalizeAccountType(body?.account_type);
    const personId = toNullableNumber(body?.person_id ?? body?.staff_id);
    const documentTypeId = toNullableNumber(body?.document_type_id);
    const documentTitle = String(body?.document_title ?? "").trim();

    if (!personId || !documentTypeId || !documentTitle) {
      return NextResponse.json(
        { error: "account_type, person_id (or staff_id), document_type_id and document_title are required" },
        { status: 400 }
      );
    }

    const actorStaffId = await resolveActorStaffId(actor.user_code);
    const staffId = accountType === "staff" ? personId : null;
    const doctorId = accountType === "doctor" ? personId : null;

    const inserted = await query(
      `
      INSERT INTO employee_documents (
        account_type,
        person_id,
        staff_id,
        doctor_id,
        document_type_id,
        document_title,
        document_description,
        visibility,
        effective_from,
        effective_to,
        expires_on,
        required_by,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'internal'), $9, $10, $11, $12, COALESCE($13::jsonb, '{}'::jsonb))
      RETURNING *
      `,
      [
        accountType,
        personId,
        staffId,
        doctorId,
        documentTypeId,
        documentTitle,
        body?.document_description ?? null,
        body?.visibility ?? "internal",
        body?.effective_from ?? null,
        body?.effective_to ?? null,
        body?.expires_on ?? null,
        body?.required_by ?? null,
        body?.metadata ? JSON.stringify(body.metadata) : null,
      ]
    );

    const row = inserted.rows[0];
    let createdVersionId: number | null = null;

    if (body?.file_url || body?.storage_path) {
      const versionInsert = await query(
        `
        INSERT INTO employee_document_versions (
          document_id,
          version_no,
          storage_path,
          file_url,
          file_name,
          mime_type,
          file_size_bytes,
          checksum_sha256,
          uploaded_by,
          metadata
        )
        VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9::jsonb, '{}'::jsonb))
        RETURNING *
        `,
        [
          row.document_id,
          body?.storage_path ?? null,
          body?.file_url ?? null,
          body?.file_name ?? null,
          body?.mime_type ?? null,
          body?.file_size_bytes ?? null,
          body?.checksum_sha256 ?? null,
          actorStaffId,
          body?.file_metadata ? JSON.stringify(body.file_metadata) : null,
        ]
      );

      createdVersionId = Number(versionInsert.rows[0]?.version_id ?? 0) || null;
      await query(
        `UPDATE employee_documents SET current_version_no = 1, updated_at = CURRENT_TIMESTAMP WHERE document_id = $1`,
        [row.document_id]
      );
    }

    await appendDocumentReview({
      documentId: Number(row.document_id),
      versionId: createdVersionId,
      reviewerStaffId: actorStaffId,
      action: "submitted",
      note: "Document record created",
    });

    await logAuditEvent({
      actorUserCode: actor.user_code,
      action: "Employee document created",
      entityType: "employee_document",
      entityId: row.document_id,
      details: {
        accountType,
        personId,
        documentTypeId,
        hasVersion: Boolean(createdVersionId),
      },
    });

    return NextResponse.json({ ...row, latest_version_id: createdVersionId }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 documents POST error", error);
    return NextResponse.json({ error: "Failed to create document record" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const body = await req.json();
    const documentId = toNullableNumber(body?.document_id);
    const action = String(body?.action ?? "update").toLowerCase();

    if (!documentId) {
      return NextResponse.json({ error: "document_id is required" }, { status: 400 });
    }

    const actorStaffId = await resolveActorStaffId(actor.user_code);
    const existing = await query(`SELECT * FROM employee_documents WHERE document_id = $1 LIMIT 1`, [documentId]);
    if (!existing.rows[0]) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    let item = existing.rows[0];
    let affectedVersionId: number | null = null;

    if (action === "update") {
      const updated = await query(
        `
        UPDATE employee_documents
        SET
          document_title = COALESCE($2, document_title),
          document_description = COALESCE($3, document_description),
          visibility = COALESCE($4, visibility),
          effective_from = COALESCE($5, effective_from),
          effective_to = COALESCE($6, effective_to),
          expires_on = COALESCE($7, expires_on),
          required_by = COALESCE($8, required_by),
          metadata = COALESCE($9::jsonb, metadata),
          updated_at = CURRENT_TIMESTAMP
        WHERE document_id = $1
        RETURNING *
        `,
        [
          documentId,
          body?.document_title ?? null,
          body?.document_description ?? null,
          body?.visibility ?? null,
          body?.effective_from ?? null,
          body?.effective_to ?? null,
          body?.expires_on ?? null,
          body?.required_by ?? null,
          body?.metadata ? JSON.stringify(body.metadata) : null,
        ]
      );
      item = updated.rows[0];
    } else if (action === "add_version") {
      if (!body?.file_url && !body?.storage_path) {
        return NextResponse.json({ error: "file_url or storage_path is required for add_version" }, { status: 400 });
      }

      const current = await query(
        `SELECT current_version_no FROM employee_documents WHERE document_id = $1 LIMIT 1`,
        [documentId]
      );
      const nextVersion = Number(current.rows[0]?.current_version_no ?? 0) + 1;

      const version = await query(
        `
        INSERT INTO employee_document_versions (
          document_id,
          version_no,
          storage_path,
          file_url,
          file_name,
          mime_type,
          file_size_bytes,
          checksum_sha256,
          uploaded_by,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::jsonb, '{}'::jsonb))
        RETURNING *
        `,
        [
          documentId,
          nextVersion,
          body?.storage_path ?? null,
          body?.file_url ?? null,
          body?.file_name ?? null,
          body?.mime_type ?? null,
          body?.file_size_bytes ?? null,
          body?.checksum_sha256 ?? null,
          actorStaffId,
          body?.file_metadata ? JSON.stringify(body.file_metadata) : null,
        ]
      );

      affectedVersionId = Number(version.rows[0]?.version_id ?? 0) || null;
      const updated = await query(
        `
        UPDATE employee_documents
        SET current_version_no = $2, updated_at = CURRENT_TIMESTAMP
        WHERE document_id = $1
        RETURNING *
        `,
        [documentId, nextVersion]
      );
      item = updated.rows[0];
      await appendDocumentReview({
        documentId,
        versionId: affectedVersionId,
        reviewerStaffId: actorStaffId,
        action: "submitted",
        note: "New version uploaded",
      });
    } else if (action === "submit" || action === "under_review" || action === "approve" || action === "reject" || action === "archive") {
      const statusMap: Record<string, string> = {
        submit: "submitted",
        under_review: "under_review",
        approve: "approved",
        reject: "rejected",
        archive: "archived",
      };
      const nextStatus = statusMap[action];

      const latestVersion = await query(
        `
        SELECT version_id
        FROM employee_document_versions
        WHERE document_id = $1
        ORDER BY version_no DESC
        LIMIT 1
        `,
        [documentId]
      );
      affectedVersionId = latestVersion.rows[0]?.version_id ? Number(latestVersion.rows[0].version_id) : null;

      const updated = await query(
        `
        UPDATE employee_documents
        SET
          review_status = $2,
          submitted_by = CASE WHEN $2 = 'submitted' THEN $3 ELSE submitted_by END,
          submitted_at = CASE WHEN $2 = 'submitted' THEN CURRENT_TIMESTAMP ELSE submitted_at END,
          reviewed_by = CASE WHEN $2 IN ('under_review','approved','rejected','archived') THEN $3 ELSE reviewed_by END,
          reviewed_at = CASE WHEN $2 IN ('under_review','approved','rejected','archived') THEN CURRENT_TIMESTAMP ELSE reviewed_at END,
          review_note = COALESCE($4, review_note),
          updated_at = CURRENT_TIMESTAMP
        WHERE document_id = $1
        RETURNING *
        `,
        [documentId, nextStatus, actorStaffId, body?.review_note ?? null]
      );
      item = updated.rows[0];

      await appendDocumentReview({
        documentId,
        versionId: affectedVersionId,
        reviewerStaffId: actorStaffId,
        action: nextStatus,
        note: body?.review_note ?? null,
      });
    } else {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }

    await logAuditEvent({
      actorUserCode: actor.user_code,
      action: `Employee document ${action}`,
      entityType: "employee_document",
      entityId: documentId,
      details: {
        reviewStatus: item.review_status,
        versionId: affectedVersionId,
      },
    });

    return NextResponse.json({ success: true, item, version_id: affectedVersionId });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 documents PATCH error", error);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}
