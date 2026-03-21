import pool from "@/database/db";
import { ACTIVE_QUEUE_STATUSES, QUEUE_STATEMENT_TIMEOUT_MS } from "@/src/lib/server/queueConfig";
import { NextResponse } from "next/server";

function getQueueErrorStatus(error: unknown) {
  if (
    (typeof error === "object" && error !== null && "code" in error && error.code === "57014") ||
    (typeof error === "object" && error !== null && "code" in error && error.code === "ETIMEDOUT")
  ) {
    return 503;
  }

  return 500;
}

export async function GET() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL statement_timeout = ${QUEUE_STATEMENT_TIMEOUT_MS}`);

    const data = await client.query(
      `
        select
          p.patient_id,
          v.visit_id,
          p.patient_name,
          v.clinic_number,
          d.doctor_name,
          d.doctor_id,
          v.visit_type,
          v.status
        from visit v
        join doctor d on v.doctor_id = d.doctor_id
        join patient p on v.patient_id = p.patient_id
        where v.visit_timestamp >= current_date
          and v.visit_timestamp < current_date + interval '1 day'
          and v.is_deleted = false
          and v.status = any($1::text[])
        order by
          case when v.visit_type = 'Emergency' then 0 else 1 end,
          v.clinic_number asc nulls last,
          v.visit_timestamp asc
      `,
      [ACTIVE_QUEUE_STATUSES]
    );

    await client.query("COMMIT");
    return NextResponse.json(data.rows, { status: 200 });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    const status = getQueueErrorStatus(error);
    const message =
      status === 503 ? "Queue request timed out. Please retry." : "Failed to fetch queue";
    return NextResponse.json({ error: message }, { status });
  } finally {
    client.release();
  }
}
