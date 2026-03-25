import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";
import { resolvePersonByUserCode } from "@/src/lib/server/workforceFinance";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const person = await resolvePersonByUserCode(user.user_code);

    if (!person) {
      return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const params: any[] = [person.accountType, person.personId];
    const filters: string[] = [
      `COALESCE(lr.account_type, CASE WHEN lr.doctor_id IS NOT NULL THEN 'doctor' ELSE 'staff' END) = $1`,
      `COALESCE(lr.person_id, COALESCE(lr.staff_id, lr.doctor_id)) = $2`,
    ];

    if (status) {
      params.push(status);
      filters.push(`lr.request_status = $${params.length}`);
    }

    const rows = await query(
      `
      SELECT
        lr.*, 
        lt.leave_code,
        lt.leave_name,
        approver.name AS approver_name
      FROM staff_leave_requests lr
      JOIN staff_leave_types lt ON lt.leave_type_id = lr.leave_type_id
      LEFT JOIN staff approver ON approver.staff_id = lr.final_approver
      WHERE ${filters.join(" AND ")}
      ORDER BY lr.requested_at DESC
      `,
      params
    );

    return NextResponse.json(rows.rows);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("employee leave requests GET error", error);
    return NextResponse.json({ error: "Failed to load leave requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const person = await resolvePersonByUserCode(user.user_code);

    if (!person) {
      return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
    }

    const body = await req.json();
    if (!body?.leave_type_id || !body?.from_date || !body?.to_date) {
      return NextResponse.json({ error: "leave_type_id, from_date and to_date are required" }, { status: 400 });
    }

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
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6::date,
        $7::date,
        COALESCE($8, false),
        $9,
        $10,
        $11,
        'pending'
      )
      RETURNING *
      `,
      [
        person.accountType,
        person.personId,
        person.accountType === "staff" ? person.personId : null,
        person.accountType === "doctor" ? person.personId : null,
        Number(body.leave_type_id),
        body.from_date,
        body.to_date,
        body?.is_half_day ?? false,
        body?.requested_hours ?? null,
        body?.reason ?? null,
        body?.attachment_url ?? null,
      ]
    );

    await logAuditEvent({
      actorUserCode: user.user_code,
      action: "Employee leave request submitted",
      entityType: "staff_leave_request",
      entityId: inserted.rows[0]?.leave_request_id ?? null,
      details: {
        accountType: person.accountType,
        personId: person.personId,
      },
    });

    return NextResponse.json(inserted.rows[0], { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("employee leave requests POST error", error);
    return NextResponse.json({ error: "Failed to create leave request" }, { status: 500 });
  }
}
