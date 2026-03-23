import { query } from "@/database/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const patientId = request.nextUrl.searchParams.get("patientId");

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: "patientId is required" },
        { status: 400 }
      );
    }

    const result = await query(
      `
        select
          v.visit_id,
          v.patient_id,
          v.clinic_number,
          v.visit_type,
          v.status,
          v.doctor_id,
          d.doctor_name,
          v.visit_timestamp,
          exists (
            select 1
            from prescription p
            join prescription_medicines pm on pm.prescription_id = p.prescription_id
            where p.visit_id = v.visit_id
              and coalesce(pm.dispensed_quantity, 0) < coalesce(pm.prescribed_quantity, 0)
          ) as has_pending_prescription
        from visit v
        join doctor d on d.doctor_id = v.doctor_id
        where v.patient_id = $1
          and v.is_deleted = false
          and v.status not in ('completed', 'discharged')
        order by
          case when v.status = 'dispensing' then 0 else 1 end,
          v.visit_timestamp desc
      `,
      [Number(patientId)]
    );

    return NextResponse.json({ success: true, data: result.rows }, { status: 200 });
  } catch (error) {
    console.error("Pharmacy active visits error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load active visits" },
      { status: 500 }
    );
  }
}
