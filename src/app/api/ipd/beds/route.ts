import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";

// GET /api/ipd/beds — bed-occupancy board (ward -> room -> bed + current occupant).
export async function GET(req: NextRequest) {
  try {
    await getAuthenticatedUser(req);
    const res = await query(
      `
      SELECT w.ward_id, w.name AS ward_name, w.ward_type,
             rm.room_id, rm.room_number, rm.room_class,
             bd.bed_id, bd.bed_number, bd.status, bd.daily_rate,
             a.admission_id, a.admission_no, a.patient_id, p.patient_name
      FROM ward w
      JOIN room rm ON rm.ward_id = w.ward_id
      JOIN bed bd ON bd.room_id = rm.room_id
      LEFT JOIN admission a ON a.current_bed_id = bd.bed_id AND a.status = 'admitted'
      LEFT JOIN patient p ON p.patient_id = a.patient_id
      WHERE w.is_active AND rm.is_active AND bd.is_active
      ORDER BY w.name, rm.room_number, bd.bed_number
      `
    );
    return NextResponse.json(res.rows, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("ipd beds board error", err);
    return NextResponse.json({ error: "Failed to load bed board" }, { status: 500 });
  }
}
