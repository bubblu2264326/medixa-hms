import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "all";
    const decided = searchParams.get("decided") === "true";

    // Decision history: who decided each leave/attendance request, when, and why.
    // The pending queue (below) only shows status='pending', so this surfaces the
    // already-actioned trail.
    if (decided) {
      const [leaveHist, attHist] = await Promise.all([
        query(
          `
          SELECT
            'leave'::text AS approval_type,
            lr.leave_request_id::text AS request_id,
            lr.request_status AS status,
            lr.final_decision_at AS decided_at,
            ap.name AS approver_name,
            lr.decision_note,
            COALESCE(s.name, d.doctor_name) AS staff_name,
            lt.leave_name AS title
          FROM staff_leave_requests lr
          LEFT JOIN staff s ON s.staff_id = lr.staff_id
          LEFT JOIN doctor d ON d.doctor_id = lr.doctor_id
          LEFT JOIN staff ap ON ap.staff_id = lr.final_approver
          JOIN staff_leave_types lt ON lt.leave_type_id = lr.leave_type_id
          WHERE lr.request_status IN ('approved', 'rejected')
          ORDER BY lr.final_decision_at DESC NULLS LAST
          LIMIT 200
          `
        ),
        query(
          `
          SELECT
            'attendance'::text AS approval_type,
            arr.regularization_id::text AS request_id,
            arr.request_status AS status,
            arr.approved_at AS decided_at,
            ap.name AS approver_name,
            arr.decision_note,
            s.name AS staff_name,
            'Attendance correction'::text AS title
          FROM attendance_regularization_requests arr
          JOIN staff s ON s.staff_id = arr.staff_id
          LEFT JOIN staff ap ON ap.staff_id = arr.approved_by
          WHERE arr.request_status IN ('approved', 'rejected')
          ORDER BY arr.approved_at DESC NULLS LAST
          LIMIT 200
          `
        ),
      ]);
      return NextResponse.json({ decided: [...leaveHist.rows, ...attHist.rows] });
    }

    const payload: Record<string, any> = {};

    if (type === "all" || type === "leave") {
      const leave = await query(
        `
        SELECT
          'leave'::text AS approval_type,
          lr.leave_request_id::text AS request_id,
          lr.requested_at AS created_at,
          lr.request_status AS status,
          COALESCE(lr.account_type, CASE WHEN lr.doctor_id IS NOT NULL THEN 'doctor' ELSE 'staff' END) AS account_type,
          COALESCE(lr.person_id, COALESCE(lr.staff_id, lr.doctor_id)) AS person_id,
          COALESCE(s.name, d.doctor_name) AS staff_name,
          lt.leave_name AS title,
          CONCAT(lr.from_date, ' to ', lr.to_date) AS subtitle
        FROM staff_leave_requests lr
        LEFT JOIN staff s ON s.staff_id = lr.staff_id
        LEFT JOIN doctor d ON d.doctor_id = lr.doctor_id
        JOIN staff_leave_types lt ON lt.leave_type_id = lr.leave_type_id
        WHERE lr.request_status = 'pending'
        ORDER BY lr.requested_at DESC
        LIMIT 200
        `
      );
      payload.leave = leave.rows;
    }

    if (type === "all" || type === "attendance") {
      const attendance = await query(
        `
        SELECT
          'attendance'::text AS approval_type,
          arr.regularization_id::text AS request_id,
          arr.created_at,
          arr.request_status AS status,
          s.staff_id,
          s.name AS staff_name,
          'Attendance correction'::text AS title,
          arr.reason AS subtitle
        FROM attendance_regularization_requests arr
        JOIN staff s ON s.staff_id = arr.staff_id
        WHERE arr.request_status = 'pending'
        ORDER BY arr.created_at DESC
        LIMIT 200
        `
      );
      payload.attendance = attendance.rows;
    }

    return NextResponse.json(payload);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 approvals GET error", error);
    return NextResponse.json({ error: "Failed to load approvals" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const body = await req.json();
    const approvalType = String(body?.approval_type ?? "");
    const requestId = Number(body?.request_id ?? 0);
    const decision = String(body?.decision ?? "").toLowerCase();
    const note = body?.note ? String(body.note) : null;

    if (!approvalType || !requestId || (decision !== "approved" && decision !== "rejected")) {
      return NextResponse.json(
        { error: "approval_type, request_id and decision(approved|rejected) are required" },
        { status: 400 }
      );
    }

    const approverResult = await query("SELECT staff_id FROM staff WHERE user_code = $1 LIMIT 1", [actor.user_code]);
    const approverStaffId = approverResult.rows[0]?.staff_id ? Number(approverResult.rows[0].staff_id) : null;

    if (approvalType === "leave") {
      const updated = await query(
        `
        UPDATE staff_leave_requests
        SET request_status = $2,
            final_approver = $3,
            final_decision_at = CURRENT_TIMESTAMP,
            decision_note = $4
        WHERE leave_request_id = $1
        RETURNING *
        `,
        [requestId, decision, approverStaffId, note]
      );
      if (!updated.rows[0]) {
        return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
      }

      await logAuditEvent({
        actorUserCode: actor.user_code,
        action: `Leave request ${decision}`,
        entityType: "staff_leave_request",
        entityId: requestId,
        details: { note },
      });

      return NextResponse.json({ success: true, item: updated.rows[0] });
    }

    if (approvalType === "attendance") {
      const updated = await query(
        `
        UPDATE attendance_regularization_requests
        SET request_status = $2,
            approved_by = $3,
            approved_at = CURRENT_TIMESTAMP,
            decision_note = $4
        WHERE regularization_id = $1
        RETURNING *
        `,
        [requestId, decision, approverStaffId, note]
      );
      if (!updated.rows[0]) {
        return NextResponse.json({ error: "Regularization request not found" }, { status: 404 });
      }

      await logAuditEvent({
        actorUserCode: actor.user_code,
        action: `Attendance correction ${decision}`,
        entityType: "attendance_regularization",
        entityId: requestId,
        details: { note },
      });

      return NextResponse.json({ success: true, item: updated.rows[0] });
    }

    return NextResponse.json({ error: "Unsupported approval_type" }, { status: 400 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 approvals PATCH error", error);
    return NextResponse.json({ error: "Failed to process approval" }, { status: 500 });
  }
}
