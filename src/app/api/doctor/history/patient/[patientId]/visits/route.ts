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

    const visitsResult = await query(
      `
        select
          v.visit_id,
          p.patient_id,
          p.patient_name,
          p.age,
          p.gender,
          v.clinic_number,
          d.doctor_name,
          v.visit_type,
          v.reason,
          v.status,
          to_char(v.visit_timestamp, 'YYYY-MM-DD HH24:MI') as visit_timestamp
        from visit v
        join patient p on p.patient_id = v.patient_id
        join doctor d on d.doctor_id = v.doctor_id
        where v.patient_id = $1
          and v.is_deleted = false
        order by v.visit_timestamp desc, v.visit_id desc
        limit $2
      `,
      [Number(patientId), HISTORY_LIMIT]
    );

    return NextResponse.json(visitsResult.rows, { status: 200 });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch doctor visit history";
    const status = message === "Not authenticated" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
