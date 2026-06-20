import { NextRequest, NextResponse } from 'next/server';
import pool from '@/database/db';
import { ApiResponse } from '@/src/lib/types';
import type { PoolClient } from 'pg';
import { AuthError, getAuthenticatedUser } from '@/src/lib/server/auth';
import { resolveActorStaffId } from '@/src/lib/server/actor';

/**
 * GET /api/transactions/return/[id]
 * Fetch a sale return by return_id for editing
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let client: PoolClient | undefined;

  try {
    await getAuthenticatedUser(request);
    client = await pool.connect();
    // 1. Fetch sale_return header
    const returnResult = await client.query(`
      SELECT 
        sr.*,
        ps.payment_type,
        ps.total_amount,
        ps.paid_amount,
        ps.due_amount,
        ps.change_amount,
        ps.discount_percent,
        ps.discount_amount,
        ps.payment_reference,
        ps.status as sale_status
      FROM sale_return sr
      LEFT JOIN pharmacy_sale ps ON ps.sale_id = sr.sale_id
      WHERE sr.return_id = $1
    `, [id]);

    if (returnResult.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Sale return not found'
      }, { status: 404 });
    }

    const returnHeader = returnResult.rows[0];

    // 2. Fetch return details with medicine and batch info
    const detailsResult = await client.query(`
      SELECT 
        srd.*,
        m.generic_name,
        m.brand_name,
        m.dosage_value,
        m.dosage_unit,
        m.sub_units_per_unit,
        COALESCE(mb.sale_price, 0) as medicine_base_price,
        mb.sale_sub_unit_price as medicine_base_sub_price,
        mb.batch_number,
        mb.expiry_date,
        mb.stock_quantity as batch_stock_quantity,
        mb.stock_sub_quantity as batch_stock_sub_quantity,
        mb.sale_price as batch_sale_price,
        mb.sale_sub_unit_price as batch_sale_sub_unit_price
      FROM sale_return_detail srd
      JOIN medicine m ON srd.medicine_id = m.medicine_id
      LEFT JOIN medicine_batch mb ON srd.batch_id = mb.batch_id
      WHERE srd.return_id = $1
    `, [id]);

    // Map to cart-compatible items
    const items = detailsResult.rows.map(row => ({
      id: row.id.toString(),
      medicine: {
        id: row.medicine_id,
        generic_name: row.generic_name,
        brand_name: row.brand_name,
        dosage_value: row.dosage_value,
        dosage_unit: row.dosage_unit,
        sub_units_per_unit: row.sub_units_per_unit,
        price: Number(row.medicine_base_price ?? 0),
        sub_unit_price: Number(row.medicine_base_sub_price ?? 0),
        batch_id: row.batch_id,
        batch_number: row.batch_number,
        expiry_date: row.expiry_date,
        batch_stock_quantity: row.batch_stock_quantity,
        batch_stock_sub_quantity: row.batch_stock_sub_quantity,
        batch_sale_price: Number(row.batch_sale_price ?? 0),
        batch_sale_sub_unit_price: Number(row.batch_sale_sub_unit_price ?? 0)
      },
      quantity: Number(row.returned_quantity ?? 0),
      subQuantity: Number(row.returned_sub_quantity ?? 0),
      price: Number(row.returned_unit_price),
      discountedPrice: Number(row.returned_unit_price),
      discountPercent: 0,
      lineTotal: Number(row.returned_unit_price) * row.returned_quantity + 
                 Number(row.returned_sub_unit_price || 0) * (row.returned_sub_quantity || 0),
      batchId: row.batch_id,
      batchNumber: row.batch_number
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);

    const transaction = {
      id: returnHeader.return_id.toString(),
      returnId: returnHeader.return_id,
      saleId: returnHeader.sale_id,
      reference: returnHeader.payment_reference || `RET-${returnHeader.return_id}`,
      timestamp: returnHeader.return_timestamp,
      reason: returnHeader.reason,
      items,
      payment: {
        type: returnHeader.payment_type || 'Cash',
        payableAmount: totalAmount,
        paidAmount: totalAmount,
        dueAmount: 0,
        changeAmount: 0,
        adjustment: 0,
        adjustmentPercent: 0,
        itemsDiscount: 0,
        totalDiscount: 0
      }
    };

    return NextResponse.json<ApiResponse>({
      success: true,
      data: transaction
    });

  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Fetch sale return error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to fetch sale return details'
    }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

/**
 * PUT /api/transactions/return/[id]
 * Update a sale return by return_id
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let client: PoolClient | undefined;

  try {
    await getAuthenticatedUser(request);
    client = await pool.connect();
    const transaction = await request.json();

    if (!transaction.items || transaction.items.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Return must contain at least one item'
      }, { status: 400 });
    }

    await client.query('BEGIN');
    const staffId = await resolveActorStaffId(request, client);

    // 1. Update the sale_return header
    await client.query(`
      UPDATE sale_return SET
        reason = $1
      WHERE return_id = $2
    `, [
      transaction.reason || 'Customer return',
      id
    ]);

    // 2. Fetch existing return details
    const existingDetailsResult = await client.query(`
      SELECT id, medicine_id, batch_id
      FROM sale_return_detail
      WHERE return_id = $1
    `, [id]);
    const existingDetails = existingDetailsResult.rows;

    // 3. Compare existing vs new (using medicine_id + batch_id as key)
    const incomingItems = transaction.items.map((item: any) => ({
      ...item,
      key: `${item.medicine.id}_${item.batchId || 'null'}`
    }));

    const existingItems = existingDetails.map(row => ({
      ...row,
      key: `${row.medicine_id}_${row.batch_id || 'null'}`
    }));

    // Delete rows no longer present
    const incomingKeys = new Set(incomingItems.map((i: any) => i.key));
    const itemsToDelete = existingItems.filter(e => !incomingKeys.has(e.key));

    for (const item of itemsToDelete) {
      await client.query(`
        DELETE FROM sale_return_detail WHERE id = $1
      `, [item.id]);
    }

    // Update or Insert
    for (const item of transaction.items) {
      const key = `${item.medicine.id}_${item.batchId || 'null'}`;
      const existing = existingItems.find(e => e.key === key);

      const subUnitsPerUnit = (item.medicine as any).sub_units_per_unit || 1;
      const subUnitPrice = item.medicine.batch_sale_sub_unit_price
        || (item.medicine as any).sub_unit_price
        || (item.price / subUnitsPerUnit);

      if (existing) {
        await client.query(`
          UPDATE sale_return_detail SET
            returned_quantity = $1,
            returned_unit_price = $2,
            returned_sub_quantity = $3,
            returned_sub_unit_price = $4
          WHERE id = $5
        `, [
          item.quantity,
          item.price,
          item.subQuantity || 0,
          subUnitPrice,
          existing.id
        ]);
      } else {
        await client.query(`
          INSERT INTO sale_return_detail (
            return_id,
            medicine_id,
            returned_quantity,
            returned_unit_price,
            batch_id,
            returned_sub_quantity,
            returned_sub_unit_price
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          id,
          item.medicine.id,
          item.quantity,
          item.price,
          item.batchId || null,
          item.subQuantity || 0,
          subUnitPrice
        ]);
      }
    }

    // 4. Audit log
    await client.query(`
      INSERT INTO pos_audit_log (
        staff_id,
        action_type,
        sale_id,
        description
      ) VALUES ($1, $2, $3, $4)
    `, [
      staffId,
      'SALE_RETURN_EDITED',
      id,
      `Edited sale return #${id} with ${transaction.items.length} items`
    ]);

    await client.query('COMMIT');

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Sale return updated successfully'
    });

  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: error.status });
    }
    if (client) await client.query('ROLLBACK');
    console.error('Sale return update error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to update sale return'
    }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
