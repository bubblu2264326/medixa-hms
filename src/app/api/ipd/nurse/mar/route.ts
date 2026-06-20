import { NextRequest, NextResponse } from "next/server";
import pool, { query } from "@/database/db";
import type { PoolClient } from "pg";
import { AuthError, getAuthenticatedUser, requireRoles } from "@/src/lib/server/auth";
import { resolveActorStaffId } from "@/src/lib/server/actor";
import { logAuditEvent } from "@/src/lib/server/audit";
import { chartMedicationAdministration, MAR_ACTIONS, IpdError } from "@/src/lib/server/ipd";

const MAR_ROLES = ["admin", "super_admin", "nurse", "doctor"];

// POST /api/ipd/nurse/mar — a nurse charts a medication administration.
// Safety (in the domain helper): active-order check, given-requires-nurse,
// allergy block (override-able + audited).
export async function POST(req: NextRequest) {
  let client: PoolClient | undefined;
  try {
    await requireRoles(req, MAR_ROLES);
    const body = await req.json();
    const medOrderId = Number(body?.med_order_id ?? 0);
    const action = String(body?.action ?? "");
    if (!medOrderId || !MAR_ACTIONS.includes(action as (typeof MAR_ACTIONS)[number])) {
      return NextResponse.json(
        { error: `med_order_id and a valid action (${MAR_ACTIONS.join(", ")}) are required` },
        { status: 400 }
      );
    }

    client = await pool.connect();
    await client.query("BEGIN");
    const staffId = await resolveActorStaffId(req, client);
    const result = await chartMedicationAdministration(client, {
      medOrderId,
      action: action as (typeof MAR_ACTIONS)[number],
      scheduledDt: body?.scheduled_dt ?? null,
      doseGiven: body?.dose_given ?? null,
      route: body?.route ?? null,
      reason: body?.reason ?? null,
      notes: body?.notes ?? null,
      administeredByStaffId: staffId,
      allowAllergyOverride: body?.allow_allergy_override === true,
    });
    await logAuditEvent(
      {
        actorStaffId: staffId,
        action: "ipd.mar",
        entityType: "medication_administration",
        entityId: result.marId,
        details: { medOrderId, action, allergyOverride: body?.allow_allergy_override === true },
      },
      client
    );
    await client.query("COMMIT");
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (err instanceof AuthError || err instanceof IpdError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("ipd mar error", err);
    return NextResponse.json({ error: "Failed to chart administration" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

// GET /api/ipd/nurse/mar?admission_id= — the MAR timeline for an admission.
export async function GET(req: NextRequest) {
  try {
    await getAuthenticatedUser(req);
    const admissionId = Number(new URL(req.url).searchParams.get("admission_id") ?? 0);
    if (!admissionId) return NextResponse.json({ error: "admission_id is required" }, { status: 400 });
    const res = await query(
      `SELECT m.mar_id, m.med_order_id, m.scheduled_dt, m.action, m.administered_dt,
              m.administered_by_staff_id, s.name AS administered_by_name,
              m.dose_given, m.route, m.reason, m.notes,
              mo.drug_name
       FROM medication_administration m
       JOIN medication_order mo ON mo.med_order_id = m.med_order_id
       JOIN doctor_order o ON o.order_id = mo.order_id
       LEFT JOIN staff s ON s.staff_id = m.administered_by_staff_id
       WHERE o.admission_id = $1
       ORDER BY COALESCE(m.scheduled_dt, m.administered_dt, m.created_at) DESC`,
      [admissionId]
    );
    return NextResponse.json(res.rows, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("ipd mar list error", err);
    return NextResponse.json({ error: "Failed to load MAR" }, { status: 500 });
  }
}
