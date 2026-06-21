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

    const ordersResult = await query(
      `
        select
          v.visit_id,
          lo.order_id,
          lt.test_id,
          lt.test_name,
          lt.category,
          lt.price,
          lt.description,
          lo.status,
          lo.urgency,
          d.doctor_name as ordered_by,
          s.name as performed_by,
          to_char(lo.created_at, 'YYYY-MM-DD') as order_date,
          to_char(v.visit_timestamp, 'YYYY-MM-DD HH24:MI') as visit_timestamp
        from visit v
        join lab_order lo on lo.visit_id = v.visit_id
        join lab_test lt on lt.test_id = lo.test_id
        join doctor d on d.doctor_id = lo.ordered_by
        left join staff s on s.staff_id = lo.performed_by
        where v.patient_id = $1
        order by v.visit_timestamp desc, lo.order_id desc
        limit $2
      `,
      [Number(patientId), HISTORY_LIMIT]
    );

    // Attach result values + abnormal/critical flags so the ordering doctor can
    // actually SEE results (not just status) — patient-safety: a critical value
    // must surface to the doctor in-app.
    const orders = ordersResult.rows as Array<{ order_id: number }>;
    const orderIds = orders.map((o) => o.order_id);
    const resultsByOrder: Record<number, unknown[]> = {};
    if (orderIds.length) {
      const rres = await query(
        `
          select
            r.order_id,
            p.parameter_name,
            p.unit,
            p.reference_range_min,
            p.reference_range_max,
            p.reference_value_text,
            p.is_critical,
            r.result_value,
            r.is_abnormal,
            to_char(r.verified_at, 'YYYY-MM-DD HH24:MI') as verified_at
          from lab_test_results r
          join lab_test_parameters p on p.parameter_id = r.parameter_id
          where r.order_id = any($1::int[])
          order by p.display_order asc, p.parameter_name asc
        `,
        [orderIds]
      );
      for (const row of ((rres?.rows ?? []) as Array<{ order_id: number }>)) {
        (resultsByOrder[row.order_id] ||= []).push(row);
      }
    }
    const withResults = orders.map((o) => ({ ...o, results: resultsByOrder[o.order_id] ?? [] }));

    return NextResponse.json(withResults, { status: 200 });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch lab orders";
    const status = message === "Not authenticated" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
