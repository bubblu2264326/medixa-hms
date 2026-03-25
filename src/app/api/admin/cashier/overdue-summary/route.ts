import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { getCurrentDateInTimezone, getSystemTimezone } from "@/src/lib/server/systemTimezone";

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    const timeZone = await getSystemTimezone();
    const localDate = getCurrentDateInTimezone(timeZone);

    const [summary, topOverdue] = await Promise.all([
      query(
        `
          WITH due_base AS (
            SELECT
              ps.sale_id,
              GREATEST(COALESCE(ps.due_amount, 0), 0) AS due_amount,
              GREATEST(($1::date - (ps.sale_timestamp AT TIME ZONE $2)::date), 0)::int AS overdue_days
            FROM pharmacy_sale ps
            WHERE ps.settlement_channel = 'pharmacy'
              AND ps.settlement_status = 'settled'
              AND ps.status IN ('Completed', 'Returned')
          )
          SELECT
            COUNT(*) FILTER (WHERE due_amount > 0) AS total_due_bills,
            COALESCE(SUM(due_amount) FILTER (WHERE due_amount > 0), 0) AS total_due_amount,
            COUNT(*) FILTER (WHERE due_amount > 0 AND overdue_days >= 7 AND overdue_days < 30) AS bucket_7,
            COUNT(*) FILTER (WHERE due_amount > 0 AND overdue_days >= 30 AND overdue_days < 60) AS bucket_30,
            COUNT(*) FILTER (WHERE due_amount > 0 AND overdue_days >= 60) AS bucket_60
          FROM due_base
        `,
        [localDate, timeZone]
      ),
      query(
        `
          WITH due_base AS (
            SELECT
              ps.sale_id,
              ps.bill_id,
              ps.visit_id,
              p.patient_name,
              GREATEST(COALESCE(ps.due_amount, 0), 0) AS due_amount,
              GREATEST(($1::date - (ps.sale_timestamp AT TIME ZONE $2)::date), 0)::int AS overdue_days
            FROM pharmacy_sale ps
            LEFT JOIN visit v ON v.visit_id = ps.visit_id
            LEFT JOIN bill b ON b.bill_id = ps.bill_id
            LEFT JOIN patient p ON p.patient_id = COALESCE(b.patient_id, v.patient_id)
            WHERE ps.settlement_channel = 'pharmacy'
              AND ps.settlement_status = 'settled'
              AND ps.status IN ('Completed', 'Returned')
          )
          SELECT *
          FROM due_base
          WHERE due_amount > 0
          ORDER BY due_amount DESC, overdue_days DESC
          LIMIT 10
        `,
        [localDate, timeZone]
      ),
    ]);

    return NextResponse.json({
      summary: {
        totalDueBills: Number(summary.rows[0]?.total_due_bills ?? 0),
        totalDueAmount: Number(summary.rows[0]?.total_due_amount ?? 0),
        bucket7: Number(summary.rows[0]?.bucket_7 ?? 0),
        bucket30: Number(summary.rows[0]?.bucket_30 ?? 0),
        bucket60: Number(summary.rows[0]?.bucket_60 ?? 0),
      },
      topOverdue: topOverdue.rows.map((row) => ({
        billId: Number(row.bill_id ?? row.sale_id),
        visitId: Number(row.visit_id ?? 0),
        patientName: row.patient_name ?? `Sale #${row.sale_id}`,
        dueAmount: Number(row.due_amount ?? 0),
        overdueDays: Number(row.overdue_days ?? 0),
      })),
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("admin cashier overdue summary error:", error);
    return NextResponse.json({ error: "Failed to load overdue summary" }, { status: 500 });
  }
}
