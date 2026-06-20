import { NextRequest, NextResponse } from "next/server";
import pool from "@/database/db";
import type { PoolClient } from "pg";
import { AuthError, requireRoles } from "@/src/lib/server/auth";
import { resolveActorStaffId } from "@/src/lib/server/actor";
import { logAuditEvent } from "@/src/lib/server/audit";
import { enqueueNotification } from "@/src/lib/server/notifications";

const RESULT_ROLES = ["admin", "super_admin", "lab_technician", "doctor"];

// POST /api/lab/results — enter results for a lab order.
// body: { order_id, results: [{ parameter_id, result_value, technician_notes? }] }
// Flags each value abnormal (outside the parameter's reference range) and, when
// the parameter is_critical, raises a critical-value alert (queued to the
// ordering doctor + returned in the response). Sets the order to 'Performed'.
export async function POST(req: NextRequest) {
  let client: PoolClient | undefined;
  try {
    await requireRoles(req, RESULT_ROLES);
    const body = await req.json();
    const orderId = Number(body?.order_id ?? 0);
    const results = Array.isArray(body?.results) ? body.results : [];
    if (!orderId || results.length === 0) {
      return NextResponse.json({ error: "order_id and a non-empty results[] are required" }, { status: 400 });
    }

    client = await pool.connect();
    await client.query("BEGIN");
    const staffId = await resolveActorStaffId(req, client);

    const order = await client.query(
      `SELECT order_id, test_id, ordered_by, status FROM lab_order WHERE order_id = $1 FOR UPDATE`,
      [orderId]
    );
    if (order.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Lab order not found" }, { status: 404 });
    }

    // reference ranges + critical flags for this test's parameters
    const paramRows = await client.query(
      `SELECT parameter_id, parameter_name, reference_range_min, reference_range_max, is_critical
       FROM lab_test_parameters WHERE test_id = $1`,
      [order.rows[0].test_id]
    );
    const paramById = new Map<number, any>(paramRows.rows.map((p) => [Number(p.parameter_id), p]));

    const criticalAlerts: { parameter: string; value: string }[] = [];
    let entered = 0;
    for (const r of results) {
      const parameterId = Number(r?.parameter_id ?? 0);
      const param = paramById.get(parameterId);
      if (!parameterId || !param) continue; // ignore params not belonging to this test
      const rawValue = String(r?.result_value ?? "").trim();
      const numeric = Number(rawValue);
      const min = param.reference_range_min == null ? null : Number(param.reference_range_min);
      const max = param.reference_range_max == null ? null : Number(param.reference_range_max);
      const isAbnormal =
        rawValue !== "" && !Number.isNaN(numeric) && ((min != null && numeric < min) || (max != null && numeric > max));
      const isCritical = isAbnormal && param.is_critical === true;

      await client.query(
        `INSERT INTO lab_test_results (order_id, parameter_id, result_value, is_abnormal, technician_notes, entered_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, parameterId, rawValue, isAbnormal, r?.technician_notes ?? null, staffId]
      );
      entered++;
      if (isCritical) criticalAlerts.push({ parameter: param.parameter_name, value: rawValue });
    }

    await client.query(
      `UPDATE lab_order SET status = 'Performed', results_entered_at = now(), results_entered_by = $2 WHERE order_id = $1`,
      [orderId, staffId]
    );

    // critical-value alert -> queue a message to the ordering doctor
    if (criticalAlerts.length > 0) {
      const doc = await client.query(`SELECT contact_number FROM doctor WHERE doctor_id = $1`, [order.rows[0].ordered_by]);
      await enqueueNotification(client, {
        channel: "sms",
        recipient: doc.rows[0]?.contact_number,
        template: "critical_lab_value",
        payload: { order_id: orderId, criticals: criticalAlerts },
        relatedEntity: `lab_order:${orderId}`,
      });
    }

    await logAuditEvent(
      {
        actorStaffId: staffId,
        action: "lab.results.enter",
        entityType: "lab_order",
        entityId: orderId,
        details: { entered, criticalCount: criticalAlerts.length },
      },
      client
    );
    await client.query("COMMIT");
    return NextResponse.json({ success: true, entered, critical_alerts: criticalAlerts }, { status: 201 });
  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("lab results POST error", err);
    return NextResponse.json({ error: "Failed to enter results" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
