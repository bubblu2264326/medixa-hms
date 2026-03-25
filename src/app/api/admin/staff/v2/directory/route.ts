import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { hashPassword } from "@/src/lib/server/password";
import { logAuditEvent } from "@/src/lib/server/audit";

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") ?? "").trim();
    const department = searchParams.get("department");
    const facility = searchParams.get("facility");
    const status = searchParams.get("status");

    const params: any[] = [];
    let where = "WHERE 1=1";

    if (q) {
      params.push(`%${q}%`);
      where += ` AND (
        c.name ILIKE $${params.length}
        OR c.user_code ILIKE $${params.length}
        OR COALESCE(c.designation, '') ILIKE $${params.length}
      )`;
    }
    if (department) {
      params.push(department);
      where += ` AND c.department = $${params.length}`;
    }
    if (facility) {
      params.push(facility);
      where += ` AND c.facility_code = $${params.length}`;
    }
    if (status) {
      params.push(status);
      where += ` AND c.employment_status = $${params.length}`;
    }

    const result = await query(
      `
      SELECT *
      FROM (
        SELECT
          'staff'::text AS account_type,
          s.staff_id,
          s.user_code,
          s.name,
          s.role,
          s.photo_url,
          s.gender,
          s.dob,
          s.contact_number,
          s.email,
          s.emergency_contact_name,
          s.emergency_contact_number,
          s.address_line_1,
          s.address_line_2,
          s.city,
          s.state,
          s.postal_code,
          s.national_id,
          s.license_id,
          s.department,
          s.designation,
          s.employment_type,
          s.work_location,
          s.facility_code,
          s.branch_code,
          s.reporting_manager_staff_id,
          s.joined_at,
          s.exited_at,
          s.employment_status,
          s.staff_tags
        FROM staff s
        UNION ALL
        SELECT
          'doctor'::text AS account_type,
          d.doctor_id AS staff_id,
          d.user_code,
          d.doctor_name AS name,
          'Doctor'::text AS role,
          NULL::text AS photo_url,
          NULL::text AS gender,
          NULL::date AS dob,
          d.contact_number,
          d.email,
          NULL::text AS emergency_contact_name,
          NULL::text AS emergency_contact_number,
          NULL::text AS address_line_1,
          NULL::text AS address_line_2,
          NULL::text AS city,
          NULL::text AS state,
          NULL::text AS postal_code,
          NULL::text AS national_id,
          NULL::text AS license_id,
          d.specialization AS department,
          'Doctor'::text AS designation,
          NULL::text AS employment_type,
          NULL::text AS work_location,
          'MAIN'::text AS facility_code,
          'HQ'::text AS branch_code,
          NULL::integer AS reporting_manager_staff_id,
          NULL::timestamp AS joined_at,
          NULL::timestamp AS exited_at,
          COALESCE(d.employment_status, 'active') AS employment_status,
          ARRAY['doctor']::text[] AS staff_tags
        FROM doctor d
      ) c
      ${where}
      ORDER BY c.name ASC
      `,
      params
    );

    return NextResponse.json(result.rows);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 directory GET error", error);
    return NextResponse.json({ error: "Failed to load staff directory" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const body = await req.json();

    const required = ["name", "user_code", "role", "password"] as const;
    for (const key of required) {
      if (!body?.[key]) {
        return NextResponse.json({ error: `${key} is required` }, { status: 400 });
      }
    }

    const inserted = await query(
      `
      INSERT INTO staff (
        name,
        user_code,
        role,
        password,
        contact_number,
        email,
        photo_url,
        gender,
        dob,
        emergency_contact_name,
        emergency_contact_number,
        address_line_1,
        address_line_2,
        city,
        state,
        postal_code,
        national_id,
        license_id,
        department,
        designation,
        employment_type,
        work_location,
        facility_code,
        branch_code,
        reporting_manager_staff_id,
        joined_at,
        exited_at,
        employment_status,
        staff_tags
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25,
        $26, $27, COALESCE($28, 'active'), COALESCE($29, '{}'::text[])
      )
      RETURNING staff_id, user_code, name, role, employment_status
      `,
      [
        body.name,
        String(body.user_code).toUpperCase(),
        body.role,
        hashPassword(String(body.password)),
        body.contact_number ?? null,
        body.email ?? null,
        body.photo_url ?? null,
        body.gender ?? null,
        body.dob ?? null,
        body.emergency_contact_name ?? null,
        body.emergency_contact_number ?? null,
        body.address_line_1 ?? null,
        body.address_line_2 ?? null,
        body.city ?? null,
        body.state ?? null,
        body.postal_code ?? null,
        body.national_id ?? null,
        body.license_id ?? null,
        body.department ?? null,
        body.designation ?? null,
        body.employment_type ?? null,
        body.work_location ?? null,
        body.facility_code ?? null,
        body.branch_code ?? null,
        body.reporting_manager_staff_id ?? null,
        body.joined_at ?? null,
        body.exited_at ?? null,
        body.employment_status ?? "active",
        Array.isArray(body.staff_tags) ? body.staff_tags : null,
      ]
    );

    await logAuditEvent({
      actorUserCode: actor.user_code,
      action: "Staff directory profile created",
      entityType: "staff",
      entityId: inserted.rows[0]?.staff_id ?? null,
      details: {
        userCode: inserted.rows[0]?.user_code ?? null,
        role: inserted.rows[0]?.role ?? null,
        employmentStatus: inserted.rows[0]?.employment_status ?? null,
      },
    });

    return NextResponse.json(inserted.rows[0], { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 directory POST error", error);
    return NextResponse.json({ error: "Failed to create staff profile" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const body = await req.json();
    const staffId = Number(body?.staff_id ?? 0);
    const accountType = body?.account_type === "doctor" ? "doctor" : "staff";

    if (!staffId) {
      return NextResponse.json({ error: "staff_id is required" }, { status: 400 });
    }
    if (!body?.name || !body?.role || !body?.user_code) {
      return NextResponse.json({ error: "name, user_code and role are required" }, { status: 400 });
    }

    const nextPassword = String(body?.password ?? "").trim();
    const safeUserCode = String(body.user_code).toUpperCase();

    if (accountType === "doctor") {
      const existingDoctor = await query(
        `
        SELECT doctor_id, user_code, doctor_name
        FROM doctor
        WHERE doctor_id = $1
        LIMIT 1
        `,
        [staffId]
      );
      if (!existingDoctor.rows[0]) {
        return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
      }

      await query(
        `
        UPDATE doctor
        SET
          doctor_name = $2,
          user_code = $3,
          specialization = $4,
          contact_number = $5,
          email = $6,
          employment_status = COALESCE($7, employment_status),
          password = CASE WHEN $8 <> '' THEN $9 ELSE password END,
          password_changed_at = CASE WHEN $8 <> '' THEN CURRENT_TIMESTAMP ELSE password_changed_at END,
          password_reset_token = CASE WHEN $8 <> '' THEN NULL ELSE password_reset_token END,
          password_reset_expires_at = CASE WHEN $8 <> '' THEN NULL ELSE password_reset_expires_at END,
          failed_login_attempts = CASE WHEN $8 <> '' THEN 0 ELSE failed_login_attempts END,
          account_locked_until = CASE WHEN $8 <> '' THEN NULL ELSE account_locked_until END,
          session_version = CASE WHEN $8 <> '' THEN session_version + 1 ELSE session_version END
        WHERE doctor_id = $1
        `,
        [
          staffId,
          body.name,
          safeUserCode,
          body.department ?? null,
          body.contact_number ?? null,
          body.email ?? null,
          body.employment_status ?? null,
          nextPassword,
          nextPassword ? hashPassword(nextPassword) : "",
        ]
      );

      if (nextPassword) {
        await query(
          `
          UPDATE doctor_security_sessions
          SET revoked_at = CURRENT_TIMESTAMP,
              revoked_reason = 'password_reset'
          WHERE doctor_id = $1
            AND revoked_at IS NULL
          `,
          [staffId]
        );
      }

      const updatedDoctor = await query(
        `
        SELECT
          'doctor'::text AS account_type,
          doctor_id AS staff_id,
          user_code,
          doctor_name AS name,
          'Doctor'::text AS role,
          COALESCE(employment_status, 'active') AS employment_status,
          specialization AS department,
          'Doctor'::text AS designation,
          'MAIN'::text AS facility_code,
          'HQ'::text AS branch_code,
          contact_number,
          email
        FROM doctor
        WHERE doctor_id = $1
        LIMIT 1
        `,
        [staffId]
      );

      await logAuditEvent({
        actorUserCode: actor.user_code,
        action: "Doctor directory profile updated",
        entityType: "doctor",
        entityId: staffId,
        details: {
          userCode: updatedDoctor.rows[0]?.user_code ?? null,
          employmentStatus: updatedDoctor.rows[0]?.employment_status ?? null,
          passwordChanged: Boolean(nextPassword),
        },
      });

      return NextResponse.json(updatedDoctor.rows[0]);
    }

    const existing = await query(
      `
      SELECT staff_id, user_code, name, role, employment_status
      FROM staff
      WHERE staff_id = $1
      LIMIT 1
      `,
      [staffId]
    );
    if (!existing.rows[0]) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    await query(
      `
      UPDATE staff
      SET
        name = $2,
        user_code = $3,
        role = $4,
        contact_number = $5,
        email = $6,
        department = $7,
        designation = $8,
        facility_code = $9,
        branch_code = $10,
        employment_status = COALESCE($11, employment_status),
        password = CASE WHEN $12 <> '' THEN $13 ELSE password END,
        password_changed_at = CASE WHEN $12 <> '' THEN CURRENT_TIMESTAMP ELSE password_changed_at END,
        password_reset_token = CASE WHEN $12 <> '' THEN NULL ELSE password_reset_token END,
        password_reset_expires_at = CASE WHEN $12 <> '' THEN NULL ELSE password_reset_expires_at END,
        failed_login_attempts = CASE WHEN $12 <> '' THEN 0 ELSE failed_login_attempts END,
        account_locked_until = CASE WHEN $12 <> '' THEN NULL ELSE account_locked_until END,
        session_version = CASE WHEN $12 <> '' THEN session_version + 1 ELSE session_version END
      WHERE staff_id = $1
      `,
      [
        staffId,
        body.name,
        safeUserCode,
        body.role,
        body.contact_number ?? null,
        body.email ?? null,
        body.department ?? null,
        body.designation ?? null,
        body.facility_code ?? null,
        body.branch_code ?? null,
        body.employment_status ?? null,
        nextPassword,
        nextPassword ? hashPassword(nextPassword) : "",
      ]
    );

    if (nextPassword) {
      await query(
        `
        UPDATE staff_security_sessions
        SET revoked_at = CURRENT_TIMESTAMP,
            revoked_reason = 'password_reset'
        WHERE staff_id = $1
          AND revoked_at IS NULL
        `,
        [staffId]
      );
    }

    const updated = await query(
      `
      SELECT
        staff_id,
        user_code,
        name,
        role,
        employment_status,
        department,
        designation,
        facility_code,
        branch_code,
        contact_number,
        email
      FROM staff
      WHERE staff_id = $1
      LIMIT 1
      `,
      [staffId]
    );

    await logAuditEvent({
      actorUserCode: actor.user_code,
      action: "Staff directory profile updated",
      entityType: "staff",
      entityId: staffId,
      details: {
        userCode: updated.rows[0]?.user_code ?? null,
        role: updated.rows[0]?.role ?? null,
        employmentStatus: updated.rows[0]?.employment_status ?? null,
        passwordChanged: Boolean(nextPassword),
      },
    });

    return NextResponse.json(updated.rows[0]);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 directory PATCH error", error);
    return NextResponse.json({ error: "Failed to update staff profile" }, { status: 500 });
  }
}
