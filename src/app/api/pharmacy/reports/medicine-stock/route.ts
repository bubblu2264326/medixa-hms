import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";

type MedicineStockBatchRow = {
  batch_id: number;
  batch_number: string | null;
  expiry_date: string | null;
  stock_quantity: number;
  stock_sub_quantity: number;
};

type MedicineStockRow = {
  medicine_id: number;
  brand_name: string;
  generic_name: string;
  is_active: boolean;
  sub_unit: string | null;
  sub_units_per_unit: number;
  total_stock_units: number;
  total_stock_sub_units: number;
  batches: MedicineStockBatchRow[];
};

const parseBoolean = (value: string | null, fallback: boolean) => {
  if (value === null) {
    return fallback;
  }

  return value.toLowerCase() === "true";
};

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    const q = (searchParams.get("q") || "").trim();
    const includeZeroStock = parseBoolean(searchParams.get("includeZeroStock"), false);
    const includeExpired = parseBoolean(searchParams.get("includeExpired"), false);
    const includeInactive = parseBoolean(searchParams.get("includeInactive"), false);

    const sql = `
      WITH filtered_medicines AS (
        SELECT
          m.medicine_id,
          m.brand_name,
          m.generic_name,
          COALESCE(m.is_active, true) AS is_active,
          m.sub_unit,
          COALESCE(NULLIF(m.sub_units_per_unit, 0), 1) AS sub_units_per_unit
        FROM medicine m
        WHERE ($4::boolean OR COALESCE(m.is_active, true) = true)
          AND (
            $1::text = ''
            OR m.brand_name ILIKE '%' || $1 || '%'
            OR m.generic_name ILIKE '%' || $1 || '%'
          )
      ),
      batch_rows AS (
        SELECT
          mb.medicine_id,
          mb.batch_id,
          mb.batch_number,
          mb.expiry_date,
          COALESCE(mb.stock_quantity, 0) AS stock_quantity,
          COALESCE(mb.stock_sub_quantity, 0) AS stock_sub_quantity,
          (
            COALESCE(mb.stock_quantity, 0) * fm.sub_units_per_unit
            + COALESCE(mb.stock_sub_quantity, 0)
          )::bigint AS stock_in_sub_units
        FROM medicine_batch mb
        JOIN filtered_medicines fm ON fm.medicine_id = mb.medicine_id
        WHERE (
          $3::boolean
          OR mb.expiry_date IS NULL
          OR mb.expiry_date >= CURRENT_DATE
        )
      )
      SELECT
        fm.medicine_id,
        fm.brand_name,
        fm.generic_name,
        fm.is_active,
        fm.sub_unit,
        fm.sub_units_per_unit,
        (COALESCE(SUM(br.stock_in_sub_units), 0) / fm.sub_units_per_unit)::integer AS total_stock_units,
        (COALESCE(SUM(br.stock_in_sub_units), 0) % fm.sub_units_per_unit)::integer AS total_stock_sub_units,
        COALESCE(
          json_agg(
            json_build_object(
              'batch_id', br.batch_id,
              'batch_number', br.batch_number,
              'expiry_date', br.expiry_date,
              'stock_quantity', br.stock_quantity,
              'stock_sub_quantity', br.stock_sub_quantity
            )
            ORDER BY br.expiry_date NULLS LAST, br.batch_number
          ) FILTER (WHERE br.batch_id IS NOT NULL),
          '[]'::json
        ) AS batches
      FROM filtered_medicines fm
      LEFT JOIN batch_rows br ON br.medicine_id = fm.medicine_id
      GROUP BY
        fm.medicine_id,
        fm.brand_name,
        fm.generic_name,
        fm.is_active,
        fm.sub_unit,
        fm.sub_units_per_unit
      HAVING ($2::boolean OR COALESCE(SUM(br.stock_in_sub_units), 0) > 0)
      ORDER BY fm.brand_name ASC, fm.generic_name ASC;
    `;

    const result = await query(sql, [q, includeZeroStock, includeExpired, includeInactive]);

    return NextResponse.json({
      success: true,
      filters: {
        q,
        includeZeroStock,
        includeExpired,
        includeInactive,
      },
      data: result.rows as MedicineStockRow[],
    });
  } catch (error) {
    console.error("Error fetching medicine stock batch summary:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
