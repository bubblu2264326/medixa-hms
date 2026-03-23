import { query } from "@/database/db";

export type AdminInventorySummary = {
  totalItems: number;
  healthyItems: number;
  lowStockCount: number;
};

type RelationAvailability = {
  hasMedicineStock: boolean;
  hasMedicineBatch: boolean;
  hasLowStockView: boolean;
  hasMedicineTable: boolean;
};

async function getAvailability(): Promise<RelationAvailability> {
  const result = await query(
    `
      SELECT
        to_regclass('public.medicine_stock') IS NOT NULL AS "hasMedicineStock",
        to_regclass('public.medicine_batch') IS NOT NULL AS "hasMedicineBatch",
        to_regclass('public.v_low_stock_medicines') IS NOT NULL AS "hasLowStockView",
        to_regclass('public.medicine') IS NOT NULL AS "hasMedicineTable"
    `
  );

  return (
    result.rows[0] ?? {
      hasMedicineStock: false,
      hasMedicineBatch: false,
      hasLowStockView: false,
      hasMedicineTable: false,
    }
  );
}

export async function getAdminInventorySummary(): Promise<AdminInventorySummary> {
  const availability = await getAvailability();

  if (availability.hasMedicineStock) {
    const res = await query(`
      SELECT
        COUNT(*)::int AS total_items,
        COUNT(*) FILTER (WHERE current_stock <= low_stock_threshold)::int AS low_stock_count
      FROM medicine_stock
      WHERE is_active = true
    `);

    const row = res.rows[0] ?? { total_items: 0, low_stock_count: 0 };
    const totalItems = Number(row.total_items ?? 0);
    const lowStockCount = Number(row.low_stock_count ?? 0);
    const healthyItems = Math.max(0, totalItems - lowStockCount);

    return { totalItems, healthyItems, lowStockCount };
  }

  if (availability.hasLowStockView && availability.hasMedicineTable) {
    const [totalsRes, lowRes] = await Promise.all([
      query(`
        SELECT COUNT(*)::int AS total_items
        FROM medicine
        WHERE COALESCE(is_active, true) = true
      `),
      query(`SELECT COUNT(*)::int AS low_stock_count FROM v_low_stock_medicines`),
    ]);

    const totalItems = Number(totalsRes.rows[0]?.total_items ?? 0);
    const lowStockCount = Number(lowRes.rows[0]?.low_stock_count ?? 0);
    const healthyItems = Math.max(0, totalItems - lowStockCount);

    return { totalItems, healthyItems, lowStockCount };
  }

  if (availability.hasMedicineBatch && availability.hasMedicineTable) {
    const [totalsRes, lowRes] = await Promise.all([
      query(`
        SELECT COUNT(DISTINCT m.medicine_id)::int AS total_items
        FROM medicine m
        JOIN medicine_batch mb ON mb.medicine_id = m.medicine_id
        WHERE COALESCE(m.is_active, true) = true
      `),
      query(`
        WITH stock_per_medicine AS (
          SELECT
            m.medicine_id,
            m.min_stock_level,
            SUM(
              (COALESCE(mb.stock_quantity, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)) +
              COALESCE(mb.stock_sub_quantity, 0)
            ) AS total_sub_units
          FROM medicine m
          JOIN medicine_batch mb ON mb.medicine_id = m.medicine_id
          WHERE COALESCE(m.is_active, true) = true
          GROUP BY m.medicine_id, m.min_stock_level
        )
        SELECT COUNT(*)::int AS low_stock_count
        FROM stock_per_medicine
        WHERE total_sub_units <= COALESCE(min_stock_level, 0)
      `),
    ]);

    const totalItems = Number(totalsRes.rows[0]?.total_items ?? 0);
    const lowStockCount = Number(lowRes.rows[0]?.low_stock_count ?? 0);
    const healthyItems = Math.max(0, totalItems - lowStockCount);

    return { totalItems, healthyItems, lowStockCount };
  }

  return { totalItems: 0, healthyItems: 0, lowStockCount: 0 };
}
