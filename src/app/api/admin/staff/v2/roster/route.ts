import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
    const toDate = searchParams.get("to") ?? fromDate;
    const department = searchParams.get("department");
    const accountType = searchParams.get("account_type");

    const params: any[] = [fromDate, toDate];
    const filters: string[] = [];

    if (department) {
      params.push(department);
      filters.push(`COALESCE(r.department, st.department, s.department, d.specialization) = $${params.length}`);
    }
    if (accountType === "staff" || accountType === "doctor") {
      params.push(accountType);
      filters.push(`COALESCE(r.account_type, CASE WHEN r.doctor_id IS NOT NULL THEN 'doctor' ELSE 'staff' END) = $${params.length}`);
    }

    const filterSql = filters.length ? ` AND ${filters.join(" AND ")}` : "";

    const result = await query(
      `
      SELECT
        r.roster_id,
        r.roster_date,
        COALESCE(r.account_type, CASE WHEN r.doctor_id IS NOT NULL THEN 'doctor' ELSE 'staff' END) AS account_type,
        r.person_id,
        r.staff_id,
        r.doctor_id,
        r.on_call,
        r.standby,
        r.assignment_status,
        COALESCE(r.department, st.department, s.department, d.specialization) AS department,
        r.ward,
        r.unit,
        COALESCE(s.name, d.doctor_name) AS staff_name,
        COALESCE(s.user_code, d.user_code) AS user_code,
        COALESCE(s.role, 'Doctor') AS role,
        st.shift_code,
        st.shift_name,
        st.start_time,
        st.end_time,
        st.is_night_shift
      FROM staff_roster_assignments r
      LEFT JOIN staff s ON s.staff_id = r.staff_id
      LEFT JOIN doctor d ON d.doctor_id = r.doctor_id
      JOIN staff_shift_templates st ON st.shift_template_id = r.shift_template_id
      WHERE r.roster_date BETWEEN $1 AND $2
      ${filterSql}
      ORDER BY r.roster_date, st.start_time, COALESCE(s.name, d.doctor_name)
      `,
      params
    );

    return NextResponse.json(result.rows);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 roster GET error", error);
    return NextResponse.json({ error: "Failed to load roster" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const requestStartedAtMs = Date.now();
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const validationStartedAtMs = Date.now();
    const body = await req.json();
    const assignments = Array.isArray(body?.assignments) ? body.assignments : [];

    if (assignments.length === 0) {
      return NextResponse.json({ error: "assignments[] is required" }, { status: 400 });
    }

    const normalizedAssignments: Array<{
      account_type: "staff" | "doctor";
      person_id: number;
      shift_template_id: number;
      roster_date: string;
      department: string | null;
      ward: string | null;
      unit: string | null;
      on_call: boolean;
      standby: boolean;
      assignment_status: string;
    }> = [];

    for (const assignment of assignments) {
      const assignmentAccountType: "staff" | "doctor" =
        assignment?.account_type === "doctor" ? "doctor" : "staff";
      const personId = Number(assignment?.person_id ?? assignment?.staff_id ?? 0);
      const shiftTemplateId = Number(assignment?.shift_template_id ?? 0);

      if (!personId || !shiftTemplateId || !assignment?.roster_date) {
        return NextResponse.json(
          { error: "Each assignment requires person_id (or staff_id), shift_template_id and roster_date" },
          { status: 400 }
        );
      }

      normalizedAssignments.push({
        account_type: assignmentAccountType,
        person_id: personId,
        shift_template_id: shiftTemplateId,
        roster_date: String(assignment.roster_date),
        department: assignment.department ?? null,
        ward: assignment.ward ?? null,
        unit: assignment.unit ?? null,
        on_call: Boolean(assignment.on_call ?? false),
        standby: Boolean(assignment.standby ?? false),
        assignment_status: String(assignment.assignment_status ?? "scheduled"),
      });
    }

    const validationEndedAtMs = Date.now();

    const actorResolveStartedAtMs = Date.now();
    const actorStaffResult = await query(
      `SELECT staff_id FROM staff WHERE user_code = $1 LIMIT 1`,
      [actor.user_code]
    );
    const actorStaffId = actorStaffResult.rows[0]?.staff_id
      ? Number(actorStaffResult.rows[0].staff_id)
      : null;
    const actorResolveEndedAtMs = Date.now();

    const bulkUpsertStartedAtMs = Date.now();
    const upsertResult = await query(
      `
      WITH input_rows AS (
        SELECT *
        FROM jsonb_to_recordset($1::jsonb) AS row_data (
          account_type text,
          person_id integer,
          shift_template_id bigint,
          roster_date date,
          department text,
          ward text,
          unit text,
          on_call boolean,
          standby boolean,
          assignment_status text
        )
      ),
      prepared AS (
        SELECT
          CASE WHEN account_type = 'doctor' THEN 'doctor' ELSE 'staff' END::text AS account_type,
          person_id,
          CASE WHEN account_type = 'doctor' THEN NULL::integer ELSE person_id END AS staff_id,
          CASE WHEN account_type = 'doctor' THEN person_id ELSE NULL::integer END AS doctor_id,
          shift_template_id,
          roster_date,
          NULLIF(department, '') AS department,
          NULLIF(ward, '') AS ward,
          NULLIF(unit, '') AS unit,
          COALESCE(on_call, false) AS on_call,
          COALESCE(standby, false) AS standby,
          COALESCE(NULLIF(assignment_status, ''), 'scheduled') AS assignment_status
        FROM input_rows
      ),
      upserted AS (
        INSERT INTO staff_roster_assignments (
          account_type,
          person_id,
          staff_id,
          doctor_id,
          shift_template_id,
          roster_date,
          department,
          ward,
          unit,
          on_call,
          standby,
          assignment_status,
          assigned_by
        )
        SELECT
          p.account_type,
          p.person_id,
          p.staff_id,
          p.doctor_id,
          p.shift_template_id,
          p.roster_date,
          p.department,
          p.ward,
          p.unit,
          p.on_call,
          p.standby,
          p.assignment_status,
          $2::integer
        FROM prepared p
        ON CONFLICT (account_type, person_id, roster_date)
        DO UPDATE SET
          staff_id = EXCLUDED.staff_id,
          doctor_id = EXCLUDED.doctor_id,
          shift_template_id = EXCLUDED.shift_template_id,
          department = EXCLUDED.department,
          ward = EXCLUDED.ward,
          unit = EXCLUDED.unit,
          on_call = EXCLUDED.on_call,
          standby = EXCLUDED.standby,
          assignment_status = EXCLUDED.assignment_status,
          assigned_by = EXCLUDED.assigned_by
        RETURNING roster_id, roster_date
      )
      SELECT
        COUNT(*)::int AS affected_count,
        MIN(roster_date)::text AS first_date,
        MAX(roster_date)::text AS last_date,
        MIN(roster_id)::bigint AS first_roster_id
      FROM upserted
      `,
      [JSON.stringify(normalizedAssignments), actorStaffId]
    );
    const bulkUpsertEndedAtMs = Date.now();

    const affectedCount = Number(upsertResult.rows[0]?.affected_count ?? 0);
    const firstDate = upsertResult.rows[0]?.first_date ? String(upsertResult.rows[0].first_date) : null;
    const lastDate = upsertResult.rows[0]?.last_date ? String(upsertResult.rows[0].last_date) : null;
    const firstRosterId = upsertResult.rows[0]?.first_roster_id
      ? Number(upsertResult.rows[0].first_roster_id)
      : null;

    const auditStartedAtMs = Date.now();
    await logAuditEvent({
      actorStaffId,
      action: "Roster assignments updated",
      entityType: "staff_roster",
      entityId: firstRosterId,
      details: {
        count: affectedCount,
        first_date: firstDate,
        last_date: lastDate,
      },
    });
    const auditEndedAtMs = Date.now();

    const totalMs = Date.now() - requestStartedAtMs;
    console.info("staff v2 roster POST performance", {
      assignment_count: normalizedAssignments.length,
      affected_count: affectedCount,
      validation_ms: validationEndedAtMs - validationStartedAtMs,
      actor_resolve_ms: actorResolveEndedAtMs - actorResolveStartedAtMs,
      bulk_upsert_ms: bulkUpsertEndedAtMs - bulkUpsertStartedAtMs,
      audit_log_ms: auditEndedAtMs - auditStartedAtMs,
      total_ms: totalMs,
    });

    return NextResponse.json({
      success: true,
      count: affectedCount,
      first_date: firstDate,
      last_date: lastDate,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 roster POST error", error);
    return NextResponse.json({ error: "Failed to update roster" }, { status: 500 });
  }
}
