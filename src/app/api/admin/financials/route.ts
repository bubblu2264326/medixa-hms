import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { getSystemTimezone, getUtcRollingDayRangeForTimezone } from "@/src/lib/server/systemTimezone";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(request);
    const { searchParams } = new URL(request.url);
    const period = Number(searchParams.get("period") || "30"); // days
    const scope = searchParams.get("scope") === "non_pharmacy" ? "non_pharmacy" : "combined";
    const timeZone = await getSystemTimezone();
    const periodRange = getUtcRollingDayRangeForTimezone({ timeZone, days: period });
    const trendRange = getUtcRollingDayRangeForTimezone({ timeZone, days: 7 });
    const nonPharmacyFilter = `
      NOT (
        COALESCE(bi.description, '') ILIKE '%Medicine%'
        OR COALESCE(bi.description, '') ILIKE '%Pharmacy%'
      )
    `;

    const revenueByStatusQuery =
      scope === "non_pharmacy"
        ? `
          SELECT
            b.payment_status,
            COALESCE(SUM(bi.amount), 0)::numeric AS total
          FROM bill_item bi
          JOIN bill b ON b.bill_id = bi.bill_id
          WHERE bi.created_at >= $1::timestamptz
            AND bi.created_at < $2::timestamptz
            AND ${nonPharmacyFilter}
          GROUP BY b.payment_status
          `
        : `
          SELECT
            payment_status,
            COALESCE(SUM(total_amount), 0)::numeric AS total
          FROM bill
          WHERE created_at >= $1::timestamptz
            AND created_at < $2::timestamptz
          GROUP BY payment_status
          `;

    const breakdownQuery =
      scope === "non_pharmacy"
        ? `
          SELECT
            CASE
              WHEN bi.description ILIKE '%Consultation%' THEN 'Consultation'
              WHEN bi.description ILIKE '%Lab%' OR bi.description ILIKE '%Test%' THEN 'Lab Tests'
              ELSE 'Other'
            END as category,
            COALESCE(SUM(bi.amount), 0)::numeric AS total
          FROM bill_item bi
          WHERE bi.created_at >= $1::timestamptz
            AND bi.created_at < $2::timestamptz
            AND ${nonPharmacyFilter}
          GROUP BY category
          `
        : `
          SELECT
            CASE
              WHEN description ILIKE '%Consultation%' THEN 'Consultation'
              WHEN description ILIKE '%Medicine%' OR description ILIKE '%Pharmacy%' THEN 'Pharmacy'
              WHEN description ILIKE '%Lab%' OR description ILIKE '%Test%' THEN 'Lab Tests'
              ELSE 'Other'
            END as category,
            COALESCE(SUM(amount), 0)::numeric AS total
          FROM bill_item
          WHERE created_at >= $1::timestamptz
            AND created_at < $2::timestamptz
          GROUP BY category
          `;

    const trendQuery =
      scope === "non_pharmacy"
        ? `
          SELECT
            TO_CHAR((bi.created_at AT TIME ZONE $3), 'Dy') as day,
            COALESCE(SUM(bi.amount), 0)::numeric as total,
            (bi.created_at AT TIME ZONE $3)::date as full_date
          FROM bill_item bi
          JOIN bill b ON b.bill_id = bi.bill_id
          WHERE bi.created_at >= $1::timestamptz
            AND bi.created_at < $2::timestamptz
            AND b.payment_status = 'Paid'
            AND ${nonPharmacyFilter}
          GROUP BY day, full_date
          ORDER BY full_date ASC
          `
        : `
          SELECT
            TO_CHAR((created_at AT TIME ZONE $3), 'Dy') as day,
            COALESCE(SUM(total_amount), 0)::numeric as total,
            (created_at AT TIME ZONE $3)::date as full_date
          FROM bill
          WHERE created_at >= $1::timestamptz
            AND created_at < $2::timestamptz
            AND payment_status = 'Paid'
          GROUP BY day, full_date
          ORDER BY full_date ASC
          `;

    const [revenueByStatus, breakdown, pharmacyPurchases, payrollExpense, opex, capex, trend] =
      await Promise.all([
        query(revenueByStatusQuery, [periodRange.startUtcIso, periodRange.endUtcIso]),
        query(breakdownQuery, [periodRange.startUtcIso, periodRange.endUtcIso]),
        query(
          `
          SELECT
            COALESCE(SUM(total_amount), 0)::numeric AS total
          FROM medicine_purchase
          WHERE created_at >= $1::timestamptz
            AND created_at < $2::timestamptz
          `,
          [periodRange.startUtcIso, periodRange.endUtcIso]
        ),
        query(
          `
          SELECT
            COALESCE(SUM(pli.net_amount), 0)::numeric AS total
          FROM payroll_line_item pli
          JOIN payroll_run pr ON pr.payroll_run_id = pli.payroll_run_id
          WHERE pr.period_month >= date_trunc('month', ($1::timestamptz AT TIME ZONE $2))::date
            AND pr.period_month <= date_trunc('month', (($3::timestamptz - INTERVAL '1 second') AT TIME ZONE $2))::date
            AND pr.status = 'finalized'
          `,
          [periodRange.startUtcIso, timeZone, periodRange.endUtcIso]
        ),
        query(
          `
          SELECT
            COALESCE(SUM(amount), 0)::numeric AS total
          FROM finance_expense_entry
          WHERE expense_date >= ($1::timestamptz AT TIME ZONE $2)::date
            AND expense_date <= (($3::timestamptz - INTERVAL '1 second') AT TIME ZONE $2)::date
          `,
          [periodRange.startUtcIso, timeZone, periodRange.endUtcIso]
        ),
        query(
          `
          SELECT
            COALESCE(SUM(amount), 0)::numeric AS total
          FROM finance_asset_purchase
          WHERE purchase_date >= ($1::timestamptz AT TIME ZONE $2)::date
            AND purchase_date <= (($3::timestamptz - INTERVAL '1 second') AT TIME ZONE $2)::date
          `,
          [periodRange.startUtcIso, timeZone, periodRange.endUtcIso]
        ),
        query(trendQuery, [trendRange.startUtcIso, trendRange.endUtcIso, timeZone]),
      ]);

    const paidRevenue = Number(
      revenueByStatus.rows.find((row) => String(row.payment_status).toLowerCase() === "paid")?.total ?? 0
    );
    const pharmacyPurchaseExpenseRaw = Number(pharmacyPurchases.rows[0]?.total ?? 0);
    const pharmacyPurchaseExpense = scope === "non_pharmacy" ? 0 : pharmacyPurchaseExpenseRaw;
    const payrollCost = Number(payrollExpense.rows[0]?.total ?? 0);
    const operationalExpense = Number(opex.rows[0]?.total ?? 0);
    const capitalExpense = Number(capex.rows[0]?.total ?? 0);
    const totalExpense = pharmacyPurchaseExpense + payrollCost + operationalExpense + capitalExpense;
    const netOperatingProfit = Number((paidRevenue - totalExpense).toFixed(2));

    return NextResponse.json({
      scope,
      revenue: revenueByStatus.rows,
      breakdown: breakdown.rows,
      expenses: pharmacyPurchaseExpense,
      payroll_expense: payrollCost,
      operational_expense: operationalExpense,
      capex: capitalExpense,
      total_expense: totalExpense,
      gross_revenue: paidRevenue,
      net_operating_profit: netOperatingProfit,
      trend: trend.rows,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Financials API Error:", error);
    return NextResponse.json({ error: "Failed to fetch financial data" }, { status: 500 });
  }
}
