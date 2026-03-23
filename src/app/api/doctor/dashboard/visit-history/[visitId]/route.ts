import { query } from "@/database/db";
import { getAuthenticatedDoctor } from "@/src/lib/server/doctor";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const doctor = await getAuthenticatedDoctor(req);
    const { visitId } = await params;

    const visitResult = await query(
      `
        select
          v.visit_id,
          v.patient_id,
          p.patient_name,
          p.age,
          p.gender,
          v.clinic_number,
          v.visit_type,
          v.status,
          v.reason,
          to_char(v.visit_timestamp, 'YYYY-MM-DD HH24:MI') as visit_timestamp,
          lcd.doctor_name as last_checked_by_doctor_name
        from visit v
        join patient p on p.patient_id = v.patient_id
        left join lateral (
          select d.doctor_name
          from visit_status_history vsh
          join doctor d on d.doctor_id = vsh.updated_by_doctor
          where vsh.visit_id = v.visit_id
            and vsh.status = 'seen_by_doctor'
          order by vsh.updated_at desc, vsh.visit_status_id desc
          limit 1
        ) lcd on true
        where v.visit_id = $1
          and v.doctor_id = $2
          and v.is_deleted = false
        limit 1
      `,
      [Number(visitId), doctor.doctor_id]
    );

    if (visitResult.rows.length === 0) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    const historyResult = await query(
      `
        select
          vsh.visit_status_id,
          vsh.status,
          vsh.updated_by_doctor,
          vsh.updated_by_staff,
          d.doctor_name as updated_by_doctor_name,
          s.name as updated_by_staff_name,
          to_char(vsh.updated_at, 'YYYY-MM-DD HH24:MI') as updated_at
        from visit_status_history vsh
        left join doctor d on d.doctor_id = vsh.updated_by_doctor
        left join staff s on s.staff_id = vsh.updated_by_staff
        where vsh.visit_id = $1
        order by vsh.updated_at asc, vsh.visit_status_id asc
      `,
      [Number(visitId)]
    );

    return NextResponse.json(
      {
        visit: visitResult.rows[0],
        history: historyResult.rows,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch visit history";
    const status = message === "Not authenticated" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
