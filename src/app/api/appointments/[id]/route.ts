import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireRoles } from "@/src/lib/server/auth";
import { resolveActorStaffId } from "@/src/lib/server/actor";
import { logAuditEvent } from "@/src/lib/server/audit";

const MANAGE_ROLES = ["admin", "super_admin", "receptionist", "front_desk", "doctor"];
const STATUSES = ["booked", "confirmed", "arrived", "completed", "cancelled", "no_show"];

// PATCH /api/appointments/[id] — update appointment status.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRoles(req, MANAGE_ROLES);
    const appointmentId = Number((await params).id);
    const body = await req.json();
    const status = String(body?.status ?? "");
    if (!Number.isInteger(appointmentId) || appointmentId <= 0 || !STATUSES.includes(status)) {
      return NextResponse.json({ error: `valid appointment id and status (${STATUSES.join(", ")}) are required` }, { status: 400 });
    }
    const staffId = await resolveActorStaffId(req, { query });
    const res = await query(
      `UPDATE appointment SET status = $2, updated_at = CURRENT_TIMESTAMP
        WHERE appointment_id = $1 RETURNING appointment_id, status`,
      [appointmentId, status]
    );
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    await logAuditEvent({
      actorStaffId: staffId,
      action: "appointment.status",
      entityType: "appointment",
      entityId: appointmentId,
      details: { status },
    });
    return NextResponse.json({ success: true, appointment: res.rows[0] });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("appointment PATCH error", err);
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
  }
}
