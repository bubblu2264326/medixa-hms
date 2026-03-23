import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);

    const [todayCollections, outstanding, cashierWise, reversals, shifts, agingTrend] = await Promise.all([
      query(
        `
          SELECT COALESCE(SUM(amount), 0) AS total
          FROM cashier_payment_txn
          WHERE txn_type = 'payment'
            AND created_at::date = CURRENT_DATE
        `
      ),
      query(
        `
          SELECT
            COALESCE(SUM(GREATEST(COALESCE(b.total_amount, 0) - COALESCE(p.paid_amount, 0), 0)), 0) AS outstanding_due
          FROM bill b
          LEFT JOIN (
            SELECT bill_id, COALESCE(SUM(amount), 0) AS paid_amount
            FROM cashier_payment_txn
            GROUP BY bill_id
          ) p ON p.bill_id = b.bill_id
        `
      ),
      query(
        `
          SELECT
            s.staff_id,
            s.name AS cashier_name,
            COALESCE(SUM(cpt.amount), 0) AS total
          FROM cashier_payment_txn cpt
          LEFT JOIN staff s ON s.staff_id = cpt.received_by
          WHERE cpt.txn_type = 'payment'
            AND cpt.created_at::date = CURRENT_DATE
          GROUP BY s.staff_id, s.name
          ORDER BY total DESC
        `
      ),
      query(
        `
          SELECT
            COUNT(*)::int AS reversal_count,
            COALESCE(SUM(ABS(amount)), 0) AS reversal_amount
          FROM cashier_payment_txn
          WHERE txn_type = 'reversal'
            AND created_at::date = CURRENT_DATE
        `
      ),
      query(
        `
          SELECT
            COUNT(*) FILTER (WHERE status = 'open')::int AS open_shifts,
            COALESCE(SUM(variance) FILTER (WHERE status = 'closed' AND closed_at::date = CURRENT_DATE), 0) AS today_variance
          FROM cashier_shift
        `
      ),
      query(
        `
          WITH days AS (
            SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day')::date AS day
          )
          SELECT
            d.day,
            COALESCE(
              SUM(
                GREATEST(
                  COALESCE(b.total_amount, 0) - COALESCE(p.paid_amount, 0),
                  0
                )
              ),
              0
            ) AS outstanding_due
          FROM days d
          CROSS JOIN bill b
          LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(cpt.amount), 0) AS paid_amount
            FROM cashier_payment_txn cpt
            WHERE cpt.bill_id = b.bill_id
              AND cpt.created_at::date <= d.day
          ) p ON true
          GROUP BY d.day
          ORDER BY d.day ASC
        `
      ),
    ]);

    return NextResponse.json({
      todayCollections: Number(todayCollections.rows[0]?.total ?? 0),
      outstandingDue: Number(outstanding.rows[0]?.outstanding_due ?? 0),
      reversalsToday: {
        count: Number(reversals.rows[0]?.reversal_count ?? 0),
        amount: Number(reversals.rows[0]?.reversal_amount ?? 0),
      },
      shifts: {
        openShifts: Number(shifts.rows[0]?.open_shifts ?? 0),
        todayVariance: Number(shifts.rows[0]?.today_variance ?? 0),
      },
      cashierWiseTotals: cashierWise.rows.map((row) => ({
        staffId: row.staff_id == null ? null : Number(row.staff_id),
        cashierName: row.cashier_name ?? "Unknown",
        total: Number(row.total ?? 0),
      })),
      agingTrend: agingTrend.rows.map((row) => ({
        day: row.day,
        outstandingDue: Number(row.outstanding_due ?? 0),
      })),
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("admin cashier kpis error:", error);
    return NextResponse.json({ error: "Failed to fetch cashier KPIs" }, { status: 500 });
  }
}
