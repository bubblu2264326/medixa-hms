import { NextRequest, NextResponse } from "next/server";
import pool from "@/database/db";
import type { PoolClient } from "pg";
import { AuthError, getAuthenticatedUser, requireRoles } from "@/src/lib/server/auth";
import { resolveActorStaffId } from "@/src/lib/server/actor";
import { logAuditEvent } from "@/src/lib/server/audit";
import { admitPatient, ADMISSION_TYPES, IpdError } from "@/src/lib/server/ipd";

const ADMIT_ROLES = ["admin", "super_admin", "doctor", "receptionist", "front_desk"];

// POST /api/ipd/admissions — admit a patient to a bed (explicit, optional IPD entry).
export async function POST(req: NextRequest) {
  let client: PoolClient | undefined;
  try {
    await requireRoles(req, ADMIT_ROLES);
    const body = await req.json();
    const patientId = Number(body?.patient_id ?? 0);
    const bedId = Number(body?.bed_id ?? 0);
    if (!patientId || !bedId) {
      return NextResponse.json({ error: "patient_id and bed_id are required" }, { status: 400 });
    }
    if (body?.admission_type && !ADMISSION_TYPES.includes(body.admission_type)) {
      return NextResponse.json({ error: "Invalid admission_type" }, { status: 400 });
    }

    client = await pool.connect();
    await client.query("BEGIN");
    const staffId = await resolveActorStaffId(req, client);
    const result = await admitPatient(client, {
      patientId,
      visitId: body?.visit_id ? Number(body.visit_id) : null,
      attendingDoctorId: body?.attending_doctor_id ? Number(body.attending_doctor_id) : null,
      admissionType: body?.admission_type,
      bedId,
      provisionalDiagnosis: body?.provisional_diagnosis ?? null,
      createdBy: staffId,
    });
    await logAuditEvent(
      {
        actorStaffId: staffId,
        action: "ipd.admit",
        entityType: "admission",
        entityId: result.admissionId,
        details: { admissionNo: result.admissionNo, patientId, bedId },
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
    console.error("ipd admit error", err);
    return NextResponse.json({ error: "Failed to admit patient" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

// GET /api/ipd/admissions?status=admitted — list admissions with live bill balance.
export async function GET(req: NextRequest) {
  try {
    await getAuthenticatedUser(req);
    const status = new URL(req.url).searchParams.get("status") ?? "admitted";
    const { query } = await import("@/database/db");
    const res = await query(
      `
      SELECT a.admission_id, a.admission_no, a.status, a.admission_datetime, a.admission_type,
             a.patient_id, p.patient_name, p.cnic,
             a.current_bed_id, bd.bed_number, rm.room_number, w.name AS ward_name,
             a.attending_doctor_id, d.doctor_name,
             rb.total_charges, rb.total_advances, rb.balance_due
      FROM admission a
      JOIN patient p ON p.patient_id = a.patient_id
      LEFT JOIN bed bd ON bd.bed_id = a.current_bed_id
      LEFT JOIN room rm ON rm.room_id = bd.room_id
      LEFT JOIN ward w ON w.ward_id = rm.ward_id
      LEFT JOIN doctor d ON d.doctor_id = a.attending_doctor_id
      LEFT JOIN v_ip_running_bill rb ON rb.admission_id = a.admission_id
      WHERE a.status = $1
      ORDER BY a.admission_datetime DESC
      `,
      [status]
    );
    return NextResponse.json(res.rows, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("ipd admissions list error", err);
    return NextResponse.json({ error: "Failed to load admissions" }, { status: 500 });
  }
}
