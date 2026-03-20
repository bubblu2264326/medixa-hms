import { NextRequest, NextResponse } from 'next/server';
import pool from '@/database/db';
import { ApiResponse } from '@/src/lib/types';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const medicineId = searchParams.get('medicine_id');
        const type = searchParams.get('type');

        if (type === 'form-metadata') {
            const result = await pool.query(`
        WITH invoice_seed AS (
          SELECT GREATEST(
            COALESCE((SELECT last_value::bigint FROM public.invoice_seq), 0),
            COALESCE((
              SELECT MAX(CAST(regexp_replace(invoice_no, '\\D', '', 'g') AS bigint))
              FROM public.medicine_purchase
              WHERE invoice_no IS NOT NULL
                AND regexp_replace(invoice_no, '\\D', '', 'g') <> ''
            ), 0)
          ) + 1 AS next_number
        ),
        batch_seed AS (
          SELECT GREATEST(
            COALESCE((SELECT last_value::bigint FROM public.batch_seq), 0),
            COALESCE((
              SELECT MAX(CAST(regexp_replace(batch_code, '\\D', '', 'g') AS bigint))
              FROM public.medicine_batch
              WHERE batch_code IS NOT NULL
                AND regexp_replace(batch_code, '\\D', '', 'g') <> ''
            ), 0)
          ) + 1 AS next_number
        ),
        supplier_seed AS (
          SELECT COALESCE((
            SELECT MAX(CAST(regexp_replace(batch_number, '\\D', '', 'g') AS bigint))
            FROM public.medicine_batch
            WHERE batch_number ~ '^LOT-[0-9]+$'
          ), 0) + 1 AS next_number
        )
        SELECT
          'INV-' || LPAD(invoice_seed.next_number::text, 5, '0') AS next_invoice_no_preview,
          'BATCH-' || LPAD(batch_seed.next_number::text, 5, '0') AS next_batch_code_preview,
          'LOT-' || LPAD(supplier_seed.next_number::text, 5, '0') AS next_supplier_batch_number_suggestion
        FROM invoice_seed, batch_seed, supplier_seed
      `);

            return NextResponse.json<ApiResponse>({
                success: true,
                data: result.rows[0] || null
            });
        }

        if (type === 'price-history' && medicineId) {
            const result = await pool.query(`
        SELECT 
            MAX(purchase_price) as max_purchase_price,
            (SELECT purchase_price FROM medicine_batch WHERE medicine_id = $1 ORDER BY received_date DESC LIMIT 1) as latest_purchase_price,
            (SELECT purchase_sub_unit_price FROM medicine_batch WHERE medicine_id = $1 ORDER BY received_date DESC LIMIT 1) as latest_purchase_sub_unit_price,
            MAX(sale_price) as max_sale_price,
            (SELECT sale_price FROM medicine_batch WHERE medicine_id = $1 ORDER BY received_date DESC LIMIT 1) as latest_sale_price,
            (SELECT sale_sub_unit_price FROM medicine_batch WHERE medicine_id = $1 ORDER BY received_date DESC LIMIT 1) as latest_sale_sub_unit_price,
            (SELECT batch_number FROM medicine_batch WHERE medicine_id = $1 ORDER BY received_date DESC LIMIT 1) as latest_batch_number,
            (SELECT batch_code FROM medicine_batch WHERE medicine_id = $1 ORDER BY received_date DESC LIMIT 1) as latest_batch_code,
            MIN(expiry_date) as nearest_expiry,
            MAX(expiry_date) as furthest_expiry,
            SUM(COALESCE(stock_quantity, 0)) as total_stock
        FROM medicine_batch
        WHERE medicine_id = $1
      `, [medicineId]);

            return NextResponse.json<ApiResponse>({
                success: true,
                data: result.rows[0] || null
            });
        }

        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Invalid request type or missing parameters'
        }, { status: 400 });

    } catch (error) {
        console.error('Purchase utils error:', error);
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Failed to fetch purchase utilities'
        }, { status: 500 });
    }
}
