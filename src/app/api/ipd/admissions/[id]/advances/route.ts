import { NextRequest, NextResponse } from "next/server";
import pool, { query } from "@/database/db";
import type { PoolClient } from "pg";
import { AuthError, getAuthenticatedUser, requireRoles } from "@/src/lib/server/auth";
import { resolveActorStaffId } from "@/src/lib/server/actor";
import { logAuditEvent } from "@/src/lib/server/audit";

const ADVANCE_ROLES = ["admin", "super_admin", "cashier", "receptionist", "front_desk"];
const PAYMENT_TYPES = ["CASH", "CARD", "INSURANCE", "MOBILE", "SPLIT"];

// POST /api/ipd/admissions/[id]/advances — collect an advance/deposit on an admission.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let client: PoolClient | undefined;
  try {
    await requireRoles(req, ADVANCE_ROLES);
    const { id } = await params;
    const admissionId = Number(id);
    const body = await req.json();
    const amount = Number(body?.amount ?? 0);
    const paymentType = String(body?.payment_type ?? "CASH").toUpperCase();
    if (!Number.isInteger(admissionId) || admissionId <= 0 || !(amount > 0)) {
      return NextResponse.json({ error: "valid admission id and a positive amount are required" }, { status: 400 });
    }
    if (!PAYMENT_TYPES.includes(paymentType)) {
      return NextResponse.json({ error: "Invalid payment_type" }, { status: 400 });
    }

    client = await pool.connect();
    await client.query("BEGIN");
    const exists = await client.query(`SELECT 1 FROM admission WHERE admission_id = $1`, [admissionId]);
    if (exists.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Admission not found" }, { status: 404 });
    }
    const staffId = await resolveActorStaffId(req, client);
    const inserted = await client.query(
      `INSERT INTO ip_advance (admission_id, amount, payment_type, receipt_no, received_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING advance_id, amount, payment_type, received_at`,
      [admissionId, amount, paymentType, body?.receipt_no ?? null, staffId, body?.notes ?? null]
    );
    await logAuditEvent(
      {
        actorStaffId: staffId,
        action: "ipd.advance",
        entityType: "admission",
        entityId: admissionId,
        details: { amount, paymentType },
      },
      client
    );
    await client.query("COMMIT");
    return NextResponse.json({ success: true, advance: inserted.rows[0] }, { status: 201 });
  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("ipd advance error", err);
    return NextResponse.json({ error: "Failed to record advance" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

// GET /api/ipd/admissions/[id]/advances — list advances on an admission.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getAuthenticatedUser(req);
    const { id } = await params;
    const admissionId = Number(id);
    if (!Number.isInteger(admissionId) || admissionId <= 0) {
      return NextResponse.json({ error: "Invalid admission id" }, { status: 400 });
    }
    const res = await query(
      `SELECT advance_id, amount, payment_type, receipt_no, received_at, notes
       FROM ip_advance WHERE admission_id = $1 ORDER BY received_at`,
      [admissionId]
    );
    return NextResponse.json(res.rows, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("ipd advances list error", err);
    return NextResponse.json({ error: "Failed to load advances" }, { status: 500 });
  }
}
