import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(request);
    const { searchParams } = new URL(request.url);
    const period = Number(searchParams.get("period") || "30"); // days

    // 1. Total Revenue (Summarized by Status)
    const revenueByStatus = await query(`
      SELECT 
        payment_status,
        SUM(total_amount) as total
      FROM bill
      WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
      GROUP BY payment_status
    `, [period]);

    // 2. Revenue Breakdown by Item Description (Top categories)
    // We try to find common keywords in description
    const breakdown = await query(`
      SELECT 
        CASE 
          WHEN description ILIKE '%Consultation%' THEN 'Consultation'
          WHEN description ILIKE '%Medicine%' OR description ILIKE '%Pharmacy%' THEN 'Pharmacy'
          WHEN description ILIKE '%Lab%' OR description ILIKE '%Test%' THEN 'Lab Tests'
          ELSE 'Other'
        END as category,
        SUM(amount) as total
      FROM bill_item
      WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
      GROUP BY category
    `, [period]);

    // 3. Expenses (Pharmacy Purchases)
    const expenses = await query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total
      FROM medicine_purchase
      WHERE purchase_date >= NOW() - ($1::int * INTERVAL '1 day')
    `, [period]);

    // 4. Daily Trend for the last 7 days
    const trend = await query(`
      SELECT 
        TO_CHAR(created_at, 'Dy') as day,
        SUM(total_amount) as total,
        created_at::date as full_date
      FROM bill
      WHERE created_at >= NOW() - INTERVAL '7 days'
        AND payment_status = 'Paid'
      GROUP BY day, full_date
      ORDER BY full_date ASC
    `);

    return NextResponse.json({
      revenue: revenueByStatus.rows,
      breakdown: breakdown.rows,
      expenses: expenses.rows[0]?.total || 0,
      trend: trend.rows
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Financials API Error:", error);
    return NextResponse.json({ error: "Failed to fetch financial data" }, { status: 500 });
  }
}
