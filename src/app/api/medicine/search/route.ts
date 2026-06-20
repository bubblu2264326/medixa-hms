import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/database/db';
import { ApiResponse, Medicine } from '@/src/lib/types';
import { AuthError, getAuthenticatedUser } from '@/src/lib/server/auth';
import { getCurrentDateInTimezone, getSystemTimezone } from '@/src/lib/server/systemTimezone';

const SEARCH_SOURCE = `
  WITH active_batch_totals AS (
    SELECT
      mb.medicine_id,
      SUM(
        (COALESCE(mb.stock_quantity, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)) +
        COALESCE(mb.stock_sub_quantity, 0)
      ) AS total_sub_units
    FROM medicine_batch mb
    JOIN medicine m ON m.medicine_id = mb.medicine_id
    WHERE mb.expiry_date > $1::date OR mb.expiry_date IS NULL
    GROUP BY mb.medicine_id
  ),
  fefo_batch AS (
    SELECT DISTINCT ON (mb.medicine_id)
      mb.medicine_id,
      mb.batch_code,
      mb.batch_number,
      mb.expiry_date,
      mb.sale_price,
      mb.sale_sub_unit_price
    FROM medicine_batch mb
    WHERE mb.expiry_date > $1::date OR mb.expiry_date IS NULL
    ORDER BY mb.medicine_id, mb.expiry_date ASC NULLS LAST, mb.batch_id ASC
  )
  SELECT
    m.medicine_id AS id,
    m.medicine_id,
    m.generic_name,
    m.brand_name,
    m.category,
    m.dosage_value::double precision AS dosage_value,
    m.dosage_unit,
    m.form,
    fb.sale_price::double precision AS price,
    (COALESCE(abt.total_sub_units, 0) / COALESCE(NULLIF(m.sub_units_per_unit, 0), 1))::integer AS stock_quantity,
    (COALESCE(abt.total_sub_units, 0) % COALESCE(NULLIF(m.sub_units_per_unit, 0), 1))::integer AS stock_sub_quantity,
    (COALESCE(abt.total_sub_units, 0) / COALESCE(NULLIF(m.sub_units_per_unit, 0), 1))::integer AS total_stock_quantity,
    (COALESCE(abt.total_sub_units, 0) % COALESCE(NULLIF(m.sub_units_per_unit, 0), 1))::integer AS total_stock_sub_quantity,
    m.barcode,
    m.sku,
    m.manufacturer,
    m.requires_prescription,
    m.search_vector,
    m.sub_unit,
    COALESCE(m.sub_units_per_unit, 1) AS sub_units_per_unit,
    m.sub_unit_price::double precision AS sub_unit_price,
    m.allow_sub_unit_sale,
    COALESCE(m.min_stock_level, 0) AS min_stock_level,
    NULL::integer AS batch_id,
    fb.batch_code,
    fb.batch_number,
    fb.expiry_date,
    NULL::integer AS batch_stock_quantity,
    NULL::integer AS batch_stock_sub_quantity,
    fb.sale_price::double precision AS batch_sale_price,
    fb.sale_sub_unit_price::double precision AS batch_sale_sub_unit_price,
    fb.sale_price::double precision AS global_price,
    (COALESCE(abt.total_sub_units, 0) <= 0) AS is_out_of_stock,
    (
      COALESCE(abt.total_sub_units, 0) > 0
      AND COALESCE(abt.total_sub_units, 0) <= (COALESCE(m.min_stock_level, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1))
    ) AS is_low_stock
  FROM medicine m
  LEFT JOIN active_batch_totals abt ON abt.medicine_id = m.medicine_id
  LEFT JOIN fefo_batch fb ON fb.medicine_id = m.medicine_id
  WHERE m.is_active = true
`;

export async function GET(request: NextRequest) {
  try {
    await getAuthenticatedUser(request);
    const timeZone = await getSystemTimezone();
    const localDate = getCurrentDateInTimezone(timeZone);
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get('query');
    const searchType = searchParams.get('type') || 'name';

    if (!searchQuery) {
      return NextResponse.json<ApiResponse<{ medicines: Medicine[]; total: number }>>({
        success: true,
        data: {
          medicines: [],
          total: 0
        }
      });
    }

    let sql: string;
    let params: any[];

    switch (searchType) {
      case 'barcode':
        sql = `
          SELECT * FROM (
            ${SEARCH_SOURCE}
          ) AS medicine_search
          WHERE barcode = $2
          LIMIT 10
        `;
        params = [localDate, searchQuery];
        break;

      case 'sku':
        sql = `
          SELECT * FROM (
            ${SEARCH_SOURCE}
          ) AS medicine_search
          WHERE sku = $2
          LIMIT 10
        `;
        params = [localDate, searchQuery];
        break;

      case 'name':
      default:
        sql = `
          SELECT * FROM (
            ${SEARCH_SOURCE}
          ) AS medicine_search
          WHERE
            search_vector @@ plainto_tsquery('english', $2)
            OR generic_name ILIKE $3
            OR brand_name ILIKE $3
          ORDER BY 
            CASE 
              WHEN generic_name ILIKE $3 THEN 1
              WHEN brand_name ILIKE $3 THEN 2
              ELSE 3
            END
          LIMIT 20
        `;
        params = [localDate, searchQuery, `%${searchQuery}%`];
        break;
    }

    const result = await query(sql, params);

    const medicines = result.rows.map((row) => ({
      ...row,
      min_stock_level: Number(row.min_stock_level ?? 0),
      stock_quantity: Number(row.stock_quantity ?? 0),
      stock_sub_quantity: Number(row.stock_sub_quantity ?? 0),
      sub_unit_price: Number(row.sub_unit_price ?? 0),
      total_stock_quantity: Number(row.total_stock_quantity ?? 0),
      total_stock_sub_quantity: Number(row.total_stock_sub_quantity ?? 0),
      batch_stock_quantity: row.batch_stock_quantity == null ? undefined : Number(row.batch_stock_quantity),
      batch_stock_sub_quantity: row.batch_stock_sub_quantity == null ? undefined : Number(row.batch_stock_sub_quantity),
      batch_sale_price: row.batch_sale_price == null ? undefined : Number(row.batch_sale_price),
      batch_sale_sub_unit_price: row.batch_sale_sub_unit_price == null ? undefined : Number(row.batch_sale_sub_unit_price),
      is_low_stock: Boolean(row.is_low_stock),
      is_out_of_stock: Boolean(row.is_out_of_stock),
    }));

    return NextResponse.json<ApiResponse<{ medicines: Medicine[]; total: number }>>({
      success: true,
      data: {
        medicines,
        total: result.rowCount || 0
      }
    });

  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Medicine search error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to search medicines'
    }, { status: 500 });
  }
}
