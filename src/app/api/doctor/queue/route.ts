import { query } from "@/database/db";
import { ACTIVE_QUEUE_STATUSES } from "@/src/lib/server/queueConfig";
import { getAuthenticatedDoctor } from "@/src/lib/server/doctor";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const doctor = await getAuthenticatedDoctor(req);

    const queueResult = await query(
      `
        select
          p.patient_id,
          p.patient_name,
          v.visit_id,
          v.clinic_number,
          v.visit_type,
          v.status,
          d.doctor_id,
          d.doctor_name
        from visit v
        join patient p on p.patient_id = v.patient_id
        join doctor d on d.doctor_id = v.doctor_id
        where v.doctor_id = $1
          and v.visit_timestamp >= current_date
          and v.visit_timestamp < current_date + interval '1 day'
          and v.is_deleted = false
          and v.status = any($2::text[])
        order by
          case when v.visit_type = 'Emergency' then 0 else 1 end,
          v.clinic_number asc nulls last,
          v.visit_timestamp asc
      `,
      [doctor.doctor_id, ACTIVE_QUEUE_STATUSES]
    );

    return NextResponse.json(queueResult.rows, { status: 200 });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to fetch queue";
    const status = message === "Not authenticated" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
