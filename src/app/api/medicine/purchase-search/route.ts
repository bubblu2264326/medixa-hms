import { NextRequest, NextResponse } from "next/server";
import { query } from '@/database/db'

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        /**
         * Specialized endpoint for Pharmacy Purchases search.
         * 1. Returns display_mrp from the LATEST active batch (received_date DESC, batch_id DESC).
         * 2. Returns aggregated stock for all active batches.
         * 3. Medicines with no active batches are included with stock 0 and display_mrp null.
         * 4. NO fallback from sale_price to purchase_price for MRP display.
         */
        const sql = `
            WITH latest_active_batch AS (
                SELECT DISTINCT ON (medicine_id) 
                    medicine_id, 
                    sale_price 
                FROM medicine_batch 
                WHERE (expiry_date > CURRENT_DATE OR expiry_date IS NULL)
                ORDER BY medicine_id, received_date DESC, batch_id DESC
            ),
            active_stock_pool AS (
                SELECT 
                    mb.medicine_id,
                    SUM(COALESCE(mb.stock_quantity, 0)) as total_stock_quantity,
                    SUM(COALESCE(mb.stock_sub_quantity, 0)) as total_stock_sub_quantity
                FROM medicine_batch mb
                WHERE (mb.expiry_date > CURRENT_DATE OR mb.expiry_date IS NULL)
                GROUP BY mb.medicine_id
            )
            SELECT
                m.medicine_id as id,
                m.brand_name,
                m.generic_name,
                m.form,
                m.dosage_value,
                m.dosage_unit,
                m.manufacturer,
                m.sub_units_per_unit,
                lb.sale_price as display_mrp,
                COALESCE(sa.total_stock_quantity, 0)::integer as stock_quantity,
                COALESCE(sa.total_stock_sub_quantity, 0)::integer as stock_sub_quantity
            FROM medicine m
            LEFT JOIN latest_active_batch lb ON m.medicine_id = lb.medicine_id
            LEFT JOIN active_stock_pool sa ON m.medicine_id = sa.medicine_id
            WHERE m.is_active = true
            ORDER BY m.brand_name ASC
        `;

        const data = await query(sql);

        // Sanitize numeric strings to numbers if necessary, or let JSON handle it
        return NextResponse.json(data.rows);

    } catch (err) {
        console.error("Critical: Purchase Search Endpoint Failure", err);
        return NextResponse.json({ error: "Failed to load purchase search results" }, { status: 500 });
    }
}
