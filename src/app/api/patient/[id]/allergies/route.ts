import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { resolveActorStaffId } from "@/src/lib/server/actor";
import { logAuditEvent } from "@/src/lib/server/audit";
import { listActiveAllergies, ALLERGY_SEVERITIES } from "@/src/lib/server/allergy";

// GET /api/patient/[id]/allergies — active allergies for a patient.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getAuthenticatedUser(req);
    const patientId = Number((await params).id);
    if (!Number.isInteger(patientId) || patientId <= 0) {
      return NextResponse.json({ error: "Invalid patient id" }, { status: 400 });
    }
    const rows = await listActiveAllergies({ query }, patientId);
    return NextResponse.json(rows, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("patient allergies GET error", err);
    return NextResponse.json({ error: "Failed to load allergies" }, { status: 500 });
  }
}

// POST /api/patient/[id]/allergies — record a patient allergy.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getAuthenticatedUser(req);
    const patientId = Number((await params).id);
    const body = await req.json();
    const allergen = String(body?.allergen ?? "").trim();
    const severity = String(body?.severity ?? "unknown");
    if (!Number.isInteger(patientId) || patientId <= 0 || !allergen) {
      return NextResponse.json({ error: "patient id and allergen are required" }, { status: 400 });
    }
    if (!ALLERGY_SEVERITIES.includes(severity as (typeof ALLERGY_SEVERITIES)[number])) {
      return NextResponse.json({ error: `severity must be one of: ${ALLERGY_SEVERITIES.join(", ")}` }, { status: 400 });
    }
    const staffId = await resolveActorStaffId(req, { query });
    const r = await query(
      `INSERT INTO patient_allergy (patient_id, allergen, reaction, severity, noted_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING allergy_id`,
      [patientId, allergen, body?.reaction ?? null, severity, staffId]
    );
    await logAuditEvent({
      actorStaffId: staffId,
      action: "patient.allergy.add",
      entityType: "patient_allergy",
      entityId: r.rows[0].allergy_id,
      details: { patientId, allergen, severity },
    });
    return NextResponse.json({ success: true, allergy_id: r.rows[0].allergy_id }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("patient allergies POST error", err);
    return NextResponse.json({ error: "Failed to add allergy" }, { status: 500 });
  }
}
