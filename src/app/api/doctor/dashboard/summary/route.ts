import { query } from "@/database/db";
import { getAuthenticatedDoctor } from "@/src/lib/server/doctor";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const doctor = await getAuthenticatedDoctor(req);
    const searchParams = req.nextUrl.searchParams;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const summaryResult = await query(
      `
        with seen_events as (
          select distinct vsh.visit_id
          from visit_status_history vsh
          join visit v on v.visit_id = vsh.visit_id
          where vsh.status = 'seen_by_doctor'
            and v.doctor_id = $1
            and v.is_deleted = false
            and vsh.updated_at::date between coalesce($2::date, current_date)
            and coalesce($3::date, current_date)
        )
        select
          count(*)::int as assigned_total,
          count(*) filter (where status = 'waiting')::int as waiting_total,
          (select count(*)::int from seen_events) as checked_total,
          count(*) filter (
            where status not in ('waiting', 'seen_by_doctor')
          )::int as other_progressed_total
        from visit
        where doctor_id = $1
          and is_deleted = false
          and visit_timestamp::date between coalesce($2::date, current_date)
          and coalesce($3::date, current_date)
      `,
      [doctor.doctor_id, from, to]
    );

    return NextResponse.json(
      {
        from: from ?? null,
        to: to ?? null,
        doctor_id: doctor.doctor_id,
        ...summaryResult.rows[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch dashboard summary";
    const status = message === "Not authenticated" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
