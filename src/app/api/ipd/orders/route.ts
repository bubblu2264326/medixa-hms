import { NextRequest, NextResponse } from "next/server";
import pool, { query } from "@/database/db";
import type { PoolClient } from "pg";
import { AuthError, getAuthenticatedUser, requireRoles } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";
import { placeDoctorOrder, ORDER_TYPES, IpdError } from "@/src/lib/server/ipd";

const ORDER_ROLES = ["admin", "super_admin", "doctor"];

// POST /api/ipd/orders — a doctor places an inpatient order (+ medication detail).
export async function POST(req: NextRequest) {
  let client: PoolClient | undefined;
  try {
    const user = await requireRoles(req, ORDER_ROLES);
    const body = await req.json();
    const admissionId = Number(body?.admission_id ?? 0);
    const orderType = String(body?.order_type ?? "");
    if (!admissionId || !ORDER_TYPES.includes(orderType as (typeof ORDER_TYPES)[number])) {
      return NextResponse.json(
        { error: `admission_id and a valid order_type (${ORDER_TYPES.join(", ")}) are required` },
        { status: 400 }
      );
    }
    if (orderType === "medication" && !body?.medication?.drug_name) {
      return NextResponse.json({ error: "medication.drug_name is required for a medication order" }, { status: 400 });
    }

    client = await pool.connect();
    await client.query("BEGIN");
    const result = await placeDoctorOrder(client, {
      admissionId,
      orderedByDoctorId: body?.ordered_by_doctor_id ? Number(body.ordered_by_doctor_id) : null,
      orderType: orderType as (typeof ORDER_TYPES)[number],
      details: body?.details ?? null,
      priority: body?.priority,
      medication: body?.medication
        ? {
            medicineId: body.medication.medicine_id ? Number(body.medication.medicine_id) : null,
            drugName: body.medication.drug_name,
            dose: body.medication.dose ?? null,
            route: body.medication.route ?? null,
            frequency: body.medication.frequency ?? null,
            scheduleTimes: body.medication.schedule_times ?? null,
          }
        : undefined,
    });
    await logAuditEvent(
      {
        actorUserCode: user.user_code,
        action: "ipd.order",
        entityType: "doctor_order",
        entityId: result.orderId,
        details: { admissionId, orderType },
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
    console.error("ipd order error", err);
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

// GET /api/ipd/orders?admission_id= — orders (+ medication detail) for an admission.
export async function GET(req: NextRequest) {
  try {
    await getAuthenticatedUser(req);
    const admissionId = Number(new URL(req.url).searchParams.get("admission_id") ?? 0);
    if (!admissionId) return NextResponse.json({ error: "admission_id is required" }, { status: 400 });
    const res = await query(
      `SELECT o.order_id, o.order_type, o.details, o.priority, o.status, o.start_dt, o.stop_dt,
              o.ordered_by_doctor_id, d.doctor_name,
              mo.med_order_id, mo.drug_name, mo.dose, mo.route, mo.frequency, mo.schedule_times
       FROM doctor_order o
       LEFT JOIN doctor d ON d.doctor_id = o.ordered_by_doctor_id
       LEFT JOIN medication_order mo ON mo.order_id = o.order_id
       WHERE o.admission_id = $1
       ORDER BY o.start_dt DESC, o.order_id DESC`,
      [admissionId]
    );
    return NextResponse.json(res.rows, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("ipd orders list error", err);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}
