import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { getAdminInventorySummary } from "@/src/lib/server/adminInventory";

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    const [inventorySummary, lowStock, expiringSoon, categories] = await Promise.all([
      getAdminInventorySummary(),
      query(`
        SELECT
          m.brand_name AS name,
          m.generic_name,
          SUM(
            (COALESCE(mb.stock_quantity, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)) +
            COALESCE(mb.stock_sub_quantity, 0)
          )::bigint AS stock_sub_units,
          COALESCE(m.min_stock_level, 0) AS low_stock_threshold
        FROM medicine m
        JOIN medicine_batch mb ON mb.medicine_id = m.medicine_id
        WHERE COALESCE(m.is_active, true) = true
        GROUP BY m.medicine_id, m.brand_name, m.generic_name, m.min_stock_level
        HAVING SUM(
          (COALESCE(mb.stock_quantity, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)) +
          COALESCE(mb.stock_sub_quantity, 0)
        ) <= COALESCE(m.min_stock_level, 0)
        ORDER BY stock_sub_units ASC
        LIMIT 10
      `),
      query(`
        SELECT
          m.brand_name AS name,
          mb.batch_number,
          mb.expiry_date,
          (
            (COALESCE(mb.stock_quantity, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)) +
            COALESCE(mb.stock_sub_quantity, 0)
          )::bigint AS stock_sub_units
        FROM medicine_batch mb
        JOIN medicine m ON m.medicine_id = mb.medicine_id
        WHERE mb.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
          AND mb.expiry_date >= CURRENT_DATE
          AND (
            COALESCE(mb.stock_quantity, 0) > 0 OR
            COALESCE(mb.stock_sub_quantity, 0) > 0
          )
        ORDER BY mb.expiry_date ASC
        LIMIT 10
      `),
      query(`
        SELECT
          c.name AS category,
          COUNT(DISTINCT m.medicine_id)::int AS item_count,
          COALESCE(
            SUM(
              (
                (COALESCE(mb.stock_quantity, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)) +
                COALESCE(mb.stock_sub_quantity, 0)
              ) * COALESCE(mb.purchase_sub_unit_price, 0)
            ),
            0
          )::numeric AS value
        FROM medicine_category c
        JOIN medicine m ON c.category_id = m.category_id
        LEFT JOIN medicine_batch mb ON m.medicine_id = mb.medicine_id
        WHERE COALESCE(m.is_active, true) = true
        GROUP BY c.name
        ORDER BY value DESC
      `),
    ]);

    const totalValue = categories.rows.reduce((acc: number, cat: any) => acc + Number(cat.value), 0);
    const soonExpiringCount = expiringSoon.rows.length; // Or we could do a separate count query if needed, but the UI shows "Batches"

    return NextResponse.json({
      summary: {
        total_items: inventorySummary.totalItems,
        low_stock_count: inventorySummary.lowStockCount,
        healthy_items: inventorySummary.healthyItems,
        total_value: totalValue,
        soon_expiring_count: soonExpiringCount
      },
      lowStock: lowStock.rows,
      expiringSoon: expiringSoon.rows,
      categories: categories.rows
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Inventory API Error:", error);
    return NextResponse.json({ error: "Failed to fetch inventory data" }, { status: 500 });
  }
}
