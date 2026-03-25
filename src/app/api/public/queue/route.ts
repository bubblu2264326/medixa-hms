import { query } from "@/database/db";
import { NextRequest, NextResponse } from "next/server";
import { getSystemTimezone, getUtcDayRangeForTimezone } from "@/src/lib/server/systemTimezone";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get("doctor_id");

  try {
    const timeZone = await getSystemTimezone();
    const dayRange = getUtcDayRangeForTimezone({ timeZone });
    let sql = `
      SELECT 
        p.patient_id, 
        v.visit_id, 
        p.patient_name, 
        v.clinic_number, 
        d.doctor_name, 
        d.doctor_id, 
        v.visit_type, 
        v.status 
      FROM visit v 
      JOIN doctor d ON v.doctor_id = d.doctor_id 
      JOIN patient p ON v.patient_id = p.patient_id 
      WHERE v.visit_timestamp >= $1::timestamptz
        AND v.visit_timestamp < $2::timestamptz
        AND v.is_deleted = false
    `;

    const params: any[] = [dayRange.startUtcIso, dayRange.endUtcIso];
    if (doctorId && doctorId !== "all") {
      sql += ` AND d.doctor_id = $3`;
      params.push(doctorId);
    }

    sql += ` ORDER BY v.visit_timestamp DESC`;

    const data = await query(sql, params);

    return NextResponse.json(data.rows, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch public queue" }, { status: 500 });
  }
}
