import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const staffId = Number(searchParams.get("staff_id") ?? 0) || null;

    const params: any[] = [];
    let where = "WHERE 1=1";
    if (status) {
      params.push(status);
      where += ` AND arr.request_status = $${params.length}`;
    }
    if (staffId) {
      params.push(staffId);
      where += ` AND arr.staff_id = $${params.length}`;
    }

    const result = await query(
      `
      SELECT
        arr.regularization_id,
        arr.staff_id,
        s.name AS staff_name,
        arr.attendance_id,
        arr.requested_check_in,
        arr.requested_check_out,
        arr.requested_status,
        arr.reason,
        arr.request_status,
        arr.approved_by,
        approver.name AS approved_by_name,
        arr.approved_at,
        arr.decision_note,
        arr.created_at
      FROM attendance_regularization_requests arr
      JOIN staff s ON s.staff_id = arr.staff_id
      LEFT JOIN staff approver ON approver.staff_id = arr.approved_by
      ${where}
      ORDER BY arr.created_at DESC
      `,
      params
    );

    return NextResponse.json(result.rows);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 attendance-corrections GET error", error);
    return NextResponse.json({ error: "Failed to load attendance corrections" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const body = await req.json();
    const staffId = Number(body?.staff_id ?? 0);
    const reason = body?.reason ? String(body.reason) : "";

    if (!staffId || !reason) {
      return NextResponse.json({ error: "staff_id and reason are required" }, { status: 400 });
    }

    const inserted = await query(
      `
      INSERT INTO attendance_regularization_requests (
        staff_id,
        attendance_id,
        requested_check_in,
        requested_check_out,
        requested_status,
        reason,
        request_status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
      `,
      [
        staffId,
        body?.attendance_id ?? null,
        body?.requested_check_in ?? null,
        body?.requested_check_out ?? null,
        body?.requested_status ?? null,
        reason,
      ]
    );

    await logAuditEvent({
      actorUserCode: actor.user_code,
      action: "Attendance correction requested",
      entityType: "attendance_regularization",
      entityId: inserted.rows[0]?.regularization_id ?? null,
      details: {
        staffId,
      },
    });

    return NextResponse.json(inserted.rows[0], { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 attendance-corrections POST error", error);
    return NextResponse.json({ error: "Failed to submit attendance correction" }, { status: 500 });
  }
}
