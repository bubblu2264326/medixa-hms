import { NextRequest, NextResponse } from "next/server";
import pool from "@/database/db";
import type { PoolClient } from "pg";
import { AuthError, requireRoles } from "@/src/lib/server/auth";
import { resolveActorStaffId } from "@/src/lib/server/actor";
import { logAuditEvent } from "@/src/lib/server/audit";

const VERIFY_ROLES = ["admin", "super_admin", "lab_technician", "doctor"];

// POST /api/lab/results/verify — pathologist/senior sign-off on a lab order.
// body: { order_id, approval_status: 'approved'|'rejected', notes?, signature_data? }
// Approval finalizes the order (status Completed, results marked verified) so the
// report can be released; rejection records the review without finalizing.
export async function POST(req: NextRequest) {
  let client: PoolClient | undefined;
  try {
    await requireRoles(req, VERIFY_ROLES);
    const body = await req.json();
    const orderId = Number(body?.order_id ?? 0);
    const approvalStatus = String(body?.approval_status ?? "");
    if (!orderId || !["approved", "rejected"].includes(approvalStatus)) {
      return NextResponse.json({ error: "order_id and approval_status (approved|rejected) are required" }, { status: 400 });
    }

    client = await pool.connect();
    await client.query("BEGIN");
    const staffId = await resolveActorStaffId(req, client);

    const order = await client.query(`SELECT order_id FROM lab_order WHERE order_id = $1 FOR UPDATE`, [orderId]);
    if (order.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Lab order not found" }, { status: 404 });
    }

    await client.query(
      `INSERT INTO lab_result_approvals (order_id, approved_by, approval_status, approval_notes, signature_data)
       VALUES ($1, $2, $3, $4, $5)`,
      [orderId, staffId, approvalStatus, body?.notes ?? null, body?.signature_data ?? null]
    );

    if (approvalStatus === "approved") {
      await client.query(
        `UPDATE lab_order SET status = 'Completed', finalized_at = now(), finalized_by = $2 WHERE order_id = $1`,
        [orderId, staffId]
      );
      await client.query(
        `UPDATE lab_test_results SET verified_by = $2, verified_at = now()
          WHERE order_id = $1 AND verified_by IS NULL`,
        [orderId, staffId]
      );
    }

    await logAuditEvent(
      {
        actorStaffId: staffId,
        action: "lab.results.verify",
        entityType: "lab_order",
        entityId: orderId,
        details: { approvalStatus },
      },
      client
    );
    await client.query("COMMIT");
    return NextResponse.json({ success: true, order_id: orderId, approval_status: approvalStatus });
  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("lab verify POST error", err);
    return NextResponse.json({ error: "Failed to verify results" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
