import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import {
  getCurrentDateInTimezone,
  getSystemTimezone,
  getUtcDayRangeForTimezone,
  getUtcRollingDayRangeForTimezone,
} from "@/src/lib/server/systemTimezone";

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    const timeZone = await getSystemTimezone();
    const todayRange = getUtcDayRangeForTimezone({ timeZone });
    const last30Range = getUtcRollingDayRangeForTimezone({ timeZone, days: 30 });
    const todayLocalDate = getCurrentDateInTimezone(timeZone);

    const [todayCollections, outstanding, cashierWise, reversals, shifts, agingTrend, last30Summary] = await Promise.all([
      query(
        `
          SELECT COALESCE(SUM(ps.total_amount), 0) AS total
          FROM pharmacy_sale ps
          WHERE ps.sale_timestamp >= $1::timestamptz
            AND ps.sale_timestamp < $2::timestamptz
            AND ps.settlement_channel = 'pharmacy'
            AND ps.settlement_status = 'settled'
            AND ps.status IN ('Completed', 'Returned')
        `,
        [todayRange.startUtcIso, todayRange.endUtcIso]
      ),
      query(
        `
          SELECT COALESCE(SUM(GREATEST(COALESCE(ps.due_amount, 0), 0)), 0) AS outstanding_due
          FROM pharmacy_sale ps
          WHERE ps.settlement_channel = 'pharmacy'
            AND ps.settlement_status = 'settled'
            AND ps.status IN ('Completed', 'Returned')
        `
      ),
      query(
        `
          SELECT
            s.staff_id,
            s.name AS cashier_name,
            COALESCE(SUM(ps.total_amount), 0) AS total
          FROM pharmacy_sale ps
          LEFT JOIN staff s ON s.staff_id = ps.handled_by
          WHERE ps.sale_timestamp >= $1::timestamptz
            AND ps.sale_timestamp < $2::timestamptz
            AND ps.settlement_channel = 'pharmacy'
            AND ps.settlement_status = 'settled'
            AND ps.status IN ('Completed', 'Returned')
          GROUP BY s.staff_id, s.name
          ORDER BY total DESC
        `,
        [todayRange.startUtcIso, todayRange.endUtcIso]
      ),
      query(
        `
          SELECT
            COUNT(*)::int AS reversal_count,
            COALESCE(SUM(total_amount), 0) AS reversal_amount
          FROM pharmacy_sale
          WHERE sale_timestamp >= $1::timestamptz
            AND sale_timestamp < $2::timestamptz
            AND settlement_channel = 'pharmacy'
            AND settlement_status = 'settled'
            AND status = 'Returned'
        `,
        [todayRange.startUtcIso, todayRange.endUtcIso]
      ),
      query(
        `
          SELECT
            0::int AS open_shifts,
            0::numeric AS today_variance
          FROM cashier_shift
        `
      ),
      query(
        `
          WITH days AS (
            SELECT generate_series($1::date - INTERVAL '6 days', $1::date, INTERVAL '1 day')::date AS day
          )
          SELECT
            d.day,
            COALESCE(
              SUM(
                GREATEST(
                  COALESCE(ps.due_amount, 0),
                  0
                )
              ),
              0
            ) AS outstanding_due
          FROM days d
          LEFT JOIN pharmacy_sale ps
            ON (ps.sale_timestamp AT TIME ZONE $2)::date <= d.day
           AND ps.settlement_channel = 'pharmacy'
           AND ps.settlement_status = 'settled'
           AND ps.status IN ('Completed', 'Returned')
          GROUP BY d.day
          ORDER BY d.day ASC
        `,
        [todayLocalDate, timeZone]
      ),
      query(
        `
          SELECT
            COUNT(*)::int AS txn_count,
            COALESCE(SUM(total_amount), 0) AS collections,
            COALESCE(SUM(GREATEST(COALESCE(due_amount, 0), 0)), 0) AS outstanding
          FROM pharmacy_sale
          WHERE sale_timestamp >= $1::timestamptz
            AND sale_timestamp < $2::timestamptz
            AND settlement_channel = 'pharmacy'
            AND settlement_status = 'settled'
            AND status IN ('Completed', 'Returned')
        `,
        [last30Range.startUtcIso, last30Range.endUtcIso]
      ),
    ]);

    return NextResponse.json({
      todayCollections: Number(todayCollections.rows[0]?.total ?? 0),
      outstandingDue: Number(outstanding.rows[0]?.outstanding_due ?? 0),
      last30Collections: Number(last30Summary.rows[0]?.collections ?? 0),
      last30Outstanding: Number(last30Summary.rows[0]?.outstanding ?? 0),
      last30TxnCount: Number(last30Summary.rows[0]?.txn_count ?? 0),
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
