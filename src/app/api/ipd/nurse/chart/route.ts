import { NextRequest, NextResponse } from "next/server";
import pool from "@/database/db";
import type { PoolClient } from "pg";
import { AuthError, requireRoles } from "@/src/lib/server/auth";
import { resolveActorStaffId } from "@/src/lib/server/actor";
import { logAuditEvent } from "@/src/lib/server/audit";

const NURSE_ROLES = ["admin", "super_admin", "nurse", "doctor"];

// POST /api/ipd/nurse/chart — nursing documentation: vitals | note | io.
// body: { kind: 'vitals'|'note'|'io', admission_id, ...kind-specific fields }
export async function POST(req: NextRequest) {
  let client: PoolClient | undefined;
  try {
    await requireRoles(req, NURSE_ROLES);
    const body = await req.json();
    const kind = String(body?.kind ?? "");
    const admissionId = Number(body?.admission_id ?? 0);
    if (!admissionId || !["vitals", "note", "io"].includes(kind)) {
      return NextResponse.json({ error: "admission_id and kind (vitals|note|io) are required" }, { status: 400 });
    }

    client = await pool.connect();
    await client.query("BEGIN");
    const exists = await client.query(`SELECT 1 FROM admission WHERE admission_id = $1`, [admissionId]);
    if (exists.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Admission not found" }, { status: 404 });
    }
    const staffId = await resolveActorStaffId(req, client);

    let entityId: number | null = null;
    if (kind === "vitals") {
      const r = await client.query(
        `INSERT INTO patient_vitals (admission_id, blood_pressure, heart_rate, temperature, weight, height, blood_group)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING vital_id`,
        [
          admissionId,
          body?.blood_pressure ?? null,
          body?.heart_rate ?? null,
          body?.temperature ?? null,
          body?.weight ?? null,
          body?.height ?? null,
          body?.blood_group ?? null,
        ]
      );
      entityId = r.rows[0].vital_id;
    } else if (kind === "note") {
      const note = String(body?.note ?? "").trim();
      if (!note) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "note is required" }, { status: 400 });
      }
      const r = await client.query(
        `INSERT INTO nursing_note (admission_id, shift, author_staff_id, note)
         VALUES ($1, $2, $3, $4) RETURNING note_id`,
        [admissionId, body?.shift ?? null, staffId, note]
      );
      entityId = r.rows[0].note_id;
    } else {
      const ioType = String(body?.io_type ?? "");
      const volume = Number(body?.volume_ml ?? -1);
      if (!["intake", "output"].includes(ioType) || !(volume >= 0)) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "io_type (intake|output) and a non-negative volume_ml are required" }, { status: 400 });
      }
      const r = await client.query(
        `INSERT INTO intake_output (admission_id, io_type, category, volume_ml, recorded_by_staff_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING io_id`,
        [admissionId, ioType, body?.category ?? null, volume, staffId]
      );
      entityId = r.rows[0].io_id;
    }

    await logAuditEvent(
      {
        actorStaffId: staffId,
        action: `ipd.nurse.${kind}`,
        entityType: kind === "vitals" ? "patient_vitals" : kind === "note" ? "nursing_note" : "intake_output",
        entityId,
        details: { admissionId },
      },
      client
    );
    await client.query("COMMIT");
    return NextResponse.json({ success: true, kind, id: entityId }, { status: 201 });
  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("ipd nurse chart error", err);
    return NextResponse.json({ error: "Failed to record nursing chart entry" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
