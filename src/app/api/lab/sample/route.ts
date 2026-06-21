import { NextRequest, NextResponse } from "next/server";
import pool from "@/database/db";
import { AuthError, requireRoles } from "@/src/lib/server/auth";
import { resolveActorStaffId } from "@/src/lib/server/actor";
import { logAuditEvent } from "@/src/lib/server/audit";

const LAB_ROLES = ["lab_technician", "admin", "super_admin"];

// POST body: { order_id, specimen_type }
// Marks a Pending lab order as Collected with specimen traceability.
export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    await requireRoles(req, LAB_ROLES);
    const body = await req.json();
    const orderId = Number(body?.order_id ?? 0);
    const specimenType = String(body?.specimen_type ?? "").trim();
    if (!orderId) return NextResponse.json({ error: "order_id is required" }, { status: 400 });
    if (!specimenType) return NextResponse.json({ error: "specimen_type is required" }, { status: 400 });

    await client.query("BEGIN");
    const staffId = await resolveActorStaffId(req, client);
    const ord = await client.query(
      `SELECT order_id, status FROM lab_order WHERE order_id = $1 FOR UPDATE`,
      [orderId]
    );
    if (ord.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Lab order not found" }, { status: 404 });
    }
    const current = String(ord.rows[0].status ?? "");
    if (current !== "Pending") {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: `Sample can only be collected for Pending orders (current: ${current}).` },
        { status: 409 }
      );
    }
    const upd = await client.query(
      `UPDATE lab_order
         SET status = 'Collected',
             sample_collected_at = current_timestamp,
             sample_collected_by = $2,
             specimen_type = $3
       WHERE order_id = $1 AND status = 'Pending'
       RETURNING order_id, status, specimen_type, sample_collected_at`,
      [orderId, staffId, specimenType]
    );
    await logAuditEvent(
      {
        action: "Lab sample collected",
        entityType: "lab_order",
        entityId: String(orderId),
        details: { specimenType, collectedBy: staffId },
      },
      client
    );
    await client.query("COMMIT");
    return NextResponse.json({ success: true, data: upd.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to record sample collection" }, { status: 500 });
  } finally {
    client.release();
  }
}
