import { NextRequest, NextResponse } from "next/server";
import pool from "@/database/db";
import type { PoolClient } from "pg";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { accrueRoomRent, getRunningBill } from "@/src/lib/server/ipd";

// GET /api/ipd/admissions/[id] — admission detail + live running bill.
// Accrues room rent on view so the displayed balance is current (idempotent).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let client: PoolClient | undefined;
  try {
    await getAuthenticatedUser(req);
    const { id } = await params;
    const admissionId = Number(id);
    if (!Number.isInteger(admissionId) || admissionId <= 0) {
      return NextResponse.json({ error: "Invalid admission id" }, { status: 400 });
    }

    client = await pool.connect();
    await client.query("BEGIN");
    await accrueRoomRent(client, admissionId, null);
    const detail = await client.query(
      `SELECT a.admission_id, a.admission_no, a.status, a.admission_datetime, a.admission_type,
              a.provisional_diagnosis, a.final_diagnosis, a.discharge_datetime, a.discharge_type,
              a.patient_id, p.patient_name, p.cnic,
              a.current_bed_id, bd.bed_number, rm.room_number, w.name AS ward_name,
              a.attending_doctor_id, d.doctor_name
       FROM admission a
       JOIN patient p ON p.patient_id = a.patient_id
       LEFT JOIN bed bd ON bd.bed_id = a.current_bed_id
       LEFT JOIN room rm ON rm.room_id = bd.room_id
       LEFT JOIN ward w ON w.ward_id = rm.ward_id
       LEFT JOIN doctor d ON d.doctor_id = a.attending_doctor_id
       WHERE a.admission_id = $1`,
      [admissionId]
    );
    if (detail.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Admission not found" }, { status: 404 });
    }
    const bill = await getRunningBill(client, admissionId);
    const charges = await client.query(
      `SELECT charge_id, charge_type, description, qty, unit_rate, amount, posted_at
       FROM ip_charge WHERE admission_id = $1 ORDER BY posted_at`,
      [admissionId]
    );
    const advances = await client.query(
      `SELECT advance_id, amount, payment_type, received_at, receipt_no
       FROM ip_advance WHERE admission_id = $1 ORDER BY received_at`,
      [admissionId]
    );
    await client.query("COMMIT");
    return NextResponse.json({
      admission: detail.rows[0],
      bill,
      charges: charges.rows,
      advances: advances.rows,
    });
  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("ipd admission detail error", err);
    return NextResponse.json({ error: "Failed to load admission" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
