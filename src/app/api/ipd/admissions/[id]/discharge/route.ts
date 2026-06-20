import { NextRequest, NextResponse } from "next/server";
import pool from "@/database/db";
import type { PoolClient } from "pg";
import { AuthError, requireRoles } from "@/src/lib/server/auth";
import { resolveActorStaffId } from "@/src/lib/server/actor";
import { logAuditEvent } from "@/src/lib/server/audit";
import { dischargePatient, DISCHARGE_TYPES, IpdError } from "@/src/lib/server/ipd";

const DISCHARGE_ROLES = ["admin", "super_admin", "doctor"];

// POST /api/ipd/admissions/[id]/discharge — discharge, accrue final rent, build final bill.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let client: PoolClient | undefined;
  try {
    await requireRoles(req, DISCHARGE_ROLES);
    const { id } = await params;
    const admissionId = Number(id);
    if (!Number.isInteger(admissionId) || admissionId <= 0) {
      return NextResponse.json({ error: "Invalid admission id" }, { status: 400 });
    }
    const body = await req.json();
    const dischargeType = String(body?.discharge_type ?? "");
    if (!DISCHARGE_TYPES.includes(dischargeType as (typeof DISCHARGE_TYPES)[number])) {
      return NextResponse.json(
        { error: `discharge_type must be one of: ${DISCHARGE_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    client = await pool.connect();
    await client.query("BEGIN");
    const staffId = await resolveActorStaffId(req, client);
    await dischargePatient(client, {
      admissionId,
      dischargeType,
      finalDiagnosis: body?.final_diagnosis ?? null,
      byStaffId: staffId,
    });
    const finalBill = await client.query(`SELECT * FROM ip_final_bill WHERE admission_id = $1`, [admissionId]);
    await logAuditEvent(
      {
        actorStaffId: staffId,
        action: "ipd.discharge",
        entityType: "admission",
        entityId: admissionId,
        details: { dischargeType, netDue: finalBill.rows[0]?.net_due ?? null },
      },
      client
    );
    await client.query("COMMIT");
    return NextResponse.json({ success: true, finalBill: finalBill.rows[0] ?? null });
  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (err instanceof AuthError || err instanceof IpdError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("ipd discharge error", err);
    return NextResponse.json({ error: "Failed to discharge" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
