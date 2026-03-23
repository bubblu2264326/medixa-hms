import { query } from "@/database/db";
import { getAuthenticatedDoctor } from "@/src/lib/server/doctor";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const doctor = await getAuthenticatedDoctor(req);
    const searchParams = req.nextUrl.searchParams;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const checkedPatientsResult = await query(
      `
        with seen_events as (
          select
            vsh.visit_id,
            max(vsh.updated_at) as seen_at
          from visit_status_history vsh
          where vsh.status = 'seen_by_doctor'
          group by vsh.visit_id
        )
        select
          v.visit_id,
          v.patient_id,
          p.patient_name,
          p.age,
          p.gender,
          v.clinic_number,
          v.visit_type,
          v.status as current_status,
          v.reason,
          to_char(v.visit_timestamp, 'YYYY-MM-DD HH24:MI') as visit_timestamp,
          to_char(se.seen_at, 'YYYY-MM-DD HH24:MI') as seen_at,
          to_char(se.seen_at, 'YYYY-MM-DD HH24:MI') as checked_at,
          count(vsh.visit_status_id)::int as history_count
        from visit v
        join patient p on p.patient_id = v.patient_id
        join seen_events se on se.visit_id = v.visit_id
        left join visit_status_history vsh on vsh.visit_id = v.visit_id
        where v.doctor_id = $1
          and v.is_deleted = false
          and se.seen_at::date between coalesce($2::date, current_date)
          and coalesce($3::date, current_date)
        group by
          v.visit_id,
          v.patient_id,
          p.patient_name,
          p.age,
          p.gender,
          v.clinic_number,
          v.visit_type,
          v.status,
          v.reason,
          v.visit_timestamp,
          se.seen_at
        order by se.seen_at desc, v.visit_timestamp desc
      `,
      [doctor.doctor_id, from, to]
    );

    return NextResponse.json(
      {
        from: from ?? null,
        to: to ?? null,
        rows: checkedPatientsResult.rows,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch checked patients";
    const status = message === "Not authenticated" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
