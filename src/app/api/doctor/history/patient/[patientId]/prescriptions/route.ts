import { query } from "@/database/db";
import { getAuthenticatedDoctor } from "@/src/lib/server/doctor";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const HISTORY_LIMIT = 120;

  try {
    await getAuthenticatedDoctor(req);
    const { patientId } = await params;

    const prescriptionResult = await query(
      `
        select
          v.visit_id,
          p.prescription_id,
          pm.prescription_medicine_id,
          m.category,
          m.generic_name,
          m.brand_name,
          pm.dosage,
          m.form,
          pm.frequency,
          pm.duration,
          pm.prescribed_quantity,
          pm.dispensed_quantity,
          pm.instructions,
          d.doctor_name as prescribed_by,
          s.name as dispensed_by,
          to_char(p.created_at, 'YYYY-MM-DD') as order_date,
          to_char(v.visit_timestamp, 'YYYY-MM-DD HH24:MI') as visit_timestamp
        from visit v
        join prescription p on p.visit_id = v.visit_id
        join prescription_medicines pm on pm.prescription_id = p.prescription_id
        join medicine m on m.medicine_id = pm.medicine_id
        join doctor d on d.doctor_id = p.doctor_id
        left join staff s on s.staff_id = pm.dispensed_by
        where v.patient_id = $1
        order by v.visit_timestamp desc, p.created_at desc, pm.prescription_medicine_id desc
        limit $2
      `,
      [Number(patientId), HISTORY_LIMIT]
    );

    return NextResponse.json(prescriptionResult.rows, { status: 200 });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch doctor prescriptions";
    const status = message === "Not authenticated" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
