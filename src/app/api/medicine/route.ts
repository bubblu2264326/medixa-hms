import { NextRequest, NextResponse } from "next/server";
import { query } from '@/database/db'
import { resolveMedicineMaster } from "@/src/lib/server/medicineMasters";
import { getCurrentDateInTimezone, getSystemTimezone } from "@/src/lib/server/systemTimezone";

export async function GET() {

    //fetch patient party from db
    try {
        const timeZone = await getSystemTimezone();
        const localDate = getCurrentDateInTimezone(timeZone);

        const sql = `
            SELECT
                m.*,
                m.medicine_id as id,
                (
                  COALESCE(SUM(
                    (COALESCE(mb.stock_quantity, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1))
                    + COALESCE(mb.stock_sub_quantity, 0)
                  ), 0) / COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)
                )::integer as stock_quantity,
                (
                  COALESCE(SUM(
                    (COALESCE(mb.stock_quantity, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1))
                    + COALESCE(mb.stock_sub_quantity, 0)
                  ), 0) % COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)
                )::integer as stock_sub_quantity
            FROM medicine m
            LEFT JOIN medicine_batch mb ON m.medicine_id = mb.medicine_id
                AND (mb.expiry_date > $1::date OR mb.expiry_date IS NULL)
            GROUP BY m.medicine_id
        `;
        const data = await query(sql, [localDate]);

        return NextResponse.json(data.rows);


    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "something went wrong" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        
        // Destructure and validate required fields
        const {
            generic_name,
            brand_name,
            category,
            category_id,
            dosage_value,
            dosage_unit,
            form,
            form_id,
            barcode,
            sku,
            manufacturer,
            manufacturer_id,
            min_stock_level,
            max_stock_level,
            is_active,
            requires_prescription,
            sub_unit,
            sub_units_per_unit,
            sub_unit_price,
            allow_sub_unit_sale
        } = body;

        if (!generic_name || !brand_name || !category) {
            return NextResponse.json({ error: "generic_name, brand_name, and category are required" }, { status: 400 });
        }

        const [resolvedCategory, resolvedManufacturer, resolvedForm] = await Promise.all([
            resolveMedicineMaster("category", Number(category_id) || null, category),
            resolveMedicineMaster("manufacturer", Number(manufacturer_id) || null, manufacturer),
            resolveMedicineMaster("form", Number(form_id) || null, form),
        ]);

        const sql = `
            INSERT INTO medicine (
                generic_name, brand_name, category, category_id, dosage_value, dosage_unit, form, form_id,
                barcode, sku, manufacturer, manufacturer_id, min_stock_level, max_stock_level, 
                is_active, requires_prescription, sub_unit, sub_units_per_unit, 
                sub_unit_price, allow_sub_unit_sale
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
            ) RETURNING *;
        `;
        
        const values = [
            generic_name, brand_name, resolvedCategory?.name ?? category, resolvedCategory?.id ?? null,
            dosage_value || null, dosage_unit || null, (resolvedForm?.name ?? form) || null, resolvedForm?.id ?? null,
            barcode || null, sku || null, (resolvedManufacturer?.name ?? manufacturer) || null, resolvedManufacturer?.id ?? null,
            min_stock_level || null, max_stock_level || null,
            is_active !== undefined ? is_active : true, 
            requires_prescription !== undefined ? requires_prescription : false,
            sub_unit || null, sub_units_per_unit || null, 
            sub_unit_price || null, allow_sub_unit_sale !== undefined ? allow_sub_unit_sale : false
        ];

        const data = await query(sql, values);

        return NextResponse.json({ success: true, data: data.rows[0] });

    } catch (err) {
        console.error("POST medicine error:", err);
        return NextResponse.json({ error: "Failed to create medicine" }, { status: 500 });
    }
}
