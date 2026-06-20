import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { resolveActorStaffId } from "@/src/lib/server/actor";
import { logAuditEvent } from "@/src/lib/server/audit";

// DELETE /api/patient/[id]/allergies/[allergyId] — soft-deactivate an allergy
// (kept for history; is_active=false so it no longer fires conflict checks).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; allergyId: string }> }) {
  try {
    await getAuthenticatedUser(req);
    const { id, allergyId } = await params;
    const patientId = Number(id);
    const aId = Number(allergyId);
    if (!Number.isInteger(patientId) || patientId <= 0 || !Number.isInteger(aId) || aId <= 0) {
      return NextResponse.json({ error: "Invalid patient or allergy id" }, { status: 400 });
    }
    const staffId = await resolveActorStaffId(req, { query });
    const r = await query(
      `UPDATE patient_allergy SET is_active = false
        WHERE allergy_id = $1 AND patient_id = $2 AND is_active
        RETURNING allergy_id`,
      [aId, patientId]
    );
    if (r.rows.length === 0) {
      return NextResponse.json({ error: "Active allergy not found" }, { status: 404 });
    }
    await logAuditEvent({
      actorStaffId: staffId,
      action: "patient.allergy.remove",
      entityType: "patient_allergy",
      entityId: aId,
      details: { patientId },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("patient allergy DELETE error", err);
    return NextResponse.json({ error: "Failed to remove allergy" }, { status: 500 });
  }
}
