import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { assertPermitted } from "@/src/lib/server/permissions";
import { logAuditEvent } from "@/src/lib/server/audit";

export async function GET(req: NextRequest) {
  try {
    const viewer = await requireAdminOrSuperAdmin(req);
    await assertPermitted(viewer, "leave", "view");
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const personId = Number(searchParams.get("person_id") ?? searchParams.get("staff_id") ?? 0) || null;
    const accountType = searchParams.get("account_type");
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    const params: any[] = [];
    let where = "WHERE 1=1";
    if (status) {
      params.push(status);
      where += ` AND lr.request_status = $${params.length}`;
    }
    if (accountType === "staff" || accountType === "doctor") {
      params.push(accountType);
      where += ` AND COALESCE(lr.account_type, CASE WHEN lr.doctor_id IS NOT NULL THEN 'doctor' ELSE 'staff' END) = $${params.length}`;
    }
    if (personId) {
      params.push(personId);
      where += ` AND COALESCE(lr.person_id, COALESCE(lr.staff_id, lr.doctor_id)) = $${params.length}`;
    }
    if (fromDate) {
      params.push(fromDate);
      where += ` AND lr.from_date >= $${params.length}`;
    }
    if (toDate) {
      params.push(toDate);
      where += ` AND lr.to_date <= $${params.length}`;
    }

    const result = await query(
      `
      SELECT
        lr.leave_request_id,
        COALESCE(lr.account_type, CASE WHEN lr.doctor_id IS NOT NULL THEN 'doctor' ELSE 'staff' END) AS account_type,
        COALESCE(lr.person_id, COALESCE(lr.staff_id, lr.doctor_id)) AS person_id,
        lr.staff_id,
        lr.doctor_id,
        COALESCE(s.name, d.doctor_name) AS staff_name,
        COALESCE(s.user_code, d.user_code) AS user_code,
        COALESCE(s.department, d.specialization) AS department,
        COALESCE(s.facility_code, 'MAIN') AS facility_code,
        lt.leave_code,
        lt.leave_name,
        lr.from_date,
        lr.to_date,
        lr.is_half_day,
        lr.requested_hours,
        lr.reason,
        lr.attachment_url,
        lr.request_status,
        lr.requested_at,
        lr.final_approver,
        approver.name AS final_approver_name,
        lr.final_decision_at,
        lr.decision_note
      FROM staff_leave_requests lr
      LEFT JOIN staff s ON s.staff_id = lr.staff_id
      LEFT JOIN doctor d ON d.doctor_id = lr.doctor_id
      JOIN staff_leave_types lt ON lt.leave_type_id = lr.leave_type_id
      LEFT JOIN staff approver ON approver.staff_id = lr.final_approver
      ${where}
      ORDER BY lr.requested_at DESC
      `,
      params
    );

    return NextResponse.json(result.rows);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 leave GET error", error);
    return NextResponse.json({ error: "Failed to load leave requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    await assertPermitted(actor, "leave", "create");
    const body = await req.json();

    const accountType = body?.account_type === "doctor" ? "doctor" : "staff";
    const personId = Number(body?.person_id ?? body?.staff_id ?? 0);
    const leaveTypeId = Number(body?.leave_type_id ?? 0);
    const fromDate = body?.from_date;
    const toDate = body?.to_date;

    if (!personId || !leaveTypeId || !fromDate || !toDate) {
      return NextResponse.json(
        { error: "person_id (or staff_id), leave_type_id, from_date and to_date are required" },
        { status: 400 }
      );
    }

    const staffId = accountType === "staff" ? personId : null;
    const doctorId = accountType === "doctor" ? personId : null;

    const inserted = await query(
      `
      INSERT INTO staff_leave_requests (
        account_type,
        person_id,
        staff_id,
        doctor_id,
        leave_type_id,
        from_date,
        to_date,
        is_half_day,
        requested_hours,
        reason,
        attachment_url,
        request_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, false), $9, $10, $11, 'pending')
      RETURNING *
      `,
      [
        accountType,
        personId,
        staffId,
        doctorId,
        leaveTypeId,
        fromDate,
        toDate,
        body?.is_half_day ?? false,
        body?.requested_hours ?? null,
        body?.reason ?? null,
        body?.attachment_url ?? null,
      ]
    );

    await logAuditEvent({
      actorUserCode: actor.user_code,
      action: "Leave request created",
      entityType: "staff_leave_request",
      entityId: inserted.rows[0]?.leave_request_id ?? null,
      details: {
        accountType,
        personId,
        leaveTypeId,
        fromDate,
        toDate,
      },
    });

    return NextResponse.json(inserted.rows[0], { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 leave POST error", error);
    return NextResponse.json({ error: "Failed to create leave request" }, { status: 500 });
  }
}
