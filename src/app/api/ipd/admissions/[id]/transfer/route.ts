import { NextRequest, NextResponse } from "next/server";
import pool from "@/database/db";
import type { PoolClient } from "pg";
import { AuthError, requireRoles } from "@/src/lib/server/auth";
import { resolveActorStaffId } from "@/src/lib/server/actor";
import { logAuditEvent } from "@/src/lib/server/audit";
import { transferBed, IpdError } from "@/src/lib/server/ipd";

const TRANSFER_ROLES = ["admin", "super_admin", "doctor", "receptionist", "front_desk", "nurse"];

// POST /api/ipd/admissions/[id]/transfer — move an active admission to another bed.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let client: PoolClient | undefined;
  try {
    await requireRoles(req, TRANSFER_ROLES);
    const { id } = await params;
    const admissionId = Number(id);
    const body = await req.json();
    const toBedId = Number(body?.to_bed_id ?? 0);
    if (!Number.isInteger(admissionId) || admissionId <= 0 || !toBedId) {
      return NextResponse.json({ error: "valid admission id and to_bed_id are required" }, { status: 400 });
    }

    client = await pool.connect();
    await client.query("BEGIN");
    const staffId = await resolveActorStaffId(req, client);
    await transferBed(client, { admissionId, toBedId, reason: body?.reason ?? null, byStaffId: staffId });
    await logAuditEvent(
      {
        actorStaffId: staffId,
        action: "ipd.transfer",
        entityType: "admission",
        entityId: admissionId,
        details: { toBedId, reason: body?.reason ?? null },
      },
      client
    );
    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (err instanceof AuthError || err instanceof IpdError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("ipd transfer error", err);
    return NextResponse.json({ error: "Failed to transfer" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
