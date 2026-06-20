import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/database/db';
import { ApiResponse, Medicine } from '@/src/lib/types';
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { resolveMedicineMaster } from "@/src/lib/server/medicineMasters";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getAuthenticatedUser(request);
    const medicineId = params.id;

    const sql = `
      SELECT * FROM v_medicine_pos 
      WHERE medicine_id = $1
    `;

    const result = await query(sql, [medicineId]);

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Medicine not found'
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<Medicine>>({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Get medicine error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to fetch medicine'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getAuthenticatedUser(request);
    const medicineId = params.id;
    const body = await request.json();

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
        UPDATE medicine SET
            generic_name = COALESCE($1, generic_name),
            brand_name = COALESCE($2, brand_name),
            category = COALESCE($3, category),
            category_id = $4,
            dosage_value = $5,
            dosage_unit = $6,
            form = $7,
            form_id = $8,
            barcode = $9,
            sku = $10,
            manufacturer = $11,
            manufacturer_id = $12,
            min_stock_level = $13,
            max_stock_level = $14,
            is_active = COALESCE($15, is_active),
            requires_prescription = COALESCE($16, requires_prescription),
            sub_unit = $17,
            sub_units_per_unit = $18,
            sub_unit_price = $19,
            allow_sub_unit_sale = COALESCE($20, allow_sub_unit_sale)
        WHERE medicine_id = $21
        RETURNING *;
    `;
    
    const values = [
        generic_name, brand_name, resolvedCategory?.name ?? category, resolvedCategory?.id ?? null,
        dosage_value || null, dosage_unit || null, (resolvedForm?.name ?? form) || null, resolvedForm?.id ?? null,
        barcode || null, sku || null, (resolvedManufacturer?.name ?? manufacturer) || null, resolvedManufacturer?.id ?? null,
        min_stock_level || null, max_stock_level || null,
        is_active !== undefined ? is_active : null, 
        requires_prescription !== undefined ? requires_prescription : null,
        sub_unit || null, sub_units_per_unit || null, 
        sub_unit_price || null, allow_sub_unit_sale !== undefined ? allow_sub_unit_sale : null,
        medicineId
    ];

    const result = await query(sql, values);

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Medicine not found'
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse<Medicine>>({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Update medicine error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to update medicine'
    }, { status: 500 });
  }
}
