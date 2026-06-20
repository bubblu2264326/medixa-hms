import { NextRequest, NextResponse } from 'next/server';
import pool from '@/database/db';
import { ApiResponse, Transaction } from '@/src/lib/types';
import type { PoolClient } from 'pg';
import { AuthError, getAuthenticatedUser } from '@/src/lib/server/auth';
import { resolveActorStaffId } from '@/src/lib/server/actor';
import { StockValidationError, validateInventoryItemsForSale } from '../stockValidation';

function getIncomingSaleDetailKey(item: Transaction["items"][number]) {
  if (item.id) {
    return `row:${item.id}`;
  }

  return `new:${item.medicine.medicine_id ?? item.medicine.id}:${item.batchId ?? 'null'}:${item.prescriptionMedicineId ?? 'null'}:${item.overrideReasonCode ?? ''}:${item.overrideReasonNote ?? ''}`;
}

function getExistingSaleDetailKey(row: {
  pharmacy_sale_detail_id: number;
  medicine_id: number;
  batch_id: number | null;
  prescription_medicine_id?: number | null;
  reason_code?: string | null;
  reason_note?: string | null;
}) {
  return `row:${row.pharmacy_sale_detail_id}`;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let client: PoolClient | undefined;

  try {
    await getAuthenticatedUser(request);
    client = await pool.connect();
    const transaction: Transaction = await request.json();

    if (!transaction.items || transaction.items.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Transaction must contain at least one item'
      }, { status: 400 });
    }

    await client.query('BEGIN');
    const staffId = await resolveActorStaffId(request, client);

    // Removed the check that blocked override edits

    // 1. Fetch existing details
    const existingDetailsResult = await client.query(`
      SELECT pharmacy_sale_detail_id, medicine_id, batch_id, quantity, sub_quantity
      FROM pharmacy_sale_detail
      WHERE sale_id = $1
    `, [id]);
    const existingDetails = existingDetailsResult.rows;

    await validateInventoryItemsForSale(client, transaction.items, existingDetails);

    // 2. Update the main sale record
    await client.query(`
      UPDATE pharmacy_sale SET
        visit_id = $1,
        bill_id = $2,
        handled_by = $3,
        total_amount = $4,
        payment_type = $5,
        paid_amount = $6,
        due_amount = $7,
        change_amount = $8,
        discount_percent = $9,
        discount_amount = $10,
        customer_id = $11,
        is_prescription_sale = $12,
        prescription_id = $13
      WHERE sale_id = $14
    `, [
      transaction.visitId || null,
      transaction.billId || null,
      staffId,
      transaction.payment.payableAmount,
      transaction.payment.type,
      transaction.payment.paidAmount,
      transaction.payment.dueAmount,
      transaction.payment.changeAmount,
      transaction.payment.adjustmentPercent,
      transaction.payment.adjustment,
      transaction.customerId || null,
      !!transaction.prescriptionId,
      transaction.prescriptionId || null,
      id
    ]);

    // 3. Compare existing vs new
    const incomingItemsList = transaction.items.map(item => ({
      ...item,
      key: getIncomingSaleDetailKey(item)
    }));

    const existingItemsList = existingDetails.map(row => ({
      ...row,
      key: getExistingSaleDetailKey(row)
    }));

    // Items to Delete: in existing but not in incoming
    const incomingKeys = new Set(incomingItemsList.map(i => i.key));
    const itemsToDelete = existingItemsList.filter(e => !incomingKeys.has(e.key));

    for (const item of itemsToDelete) {
      await client.query(`
        DELETE FROM pharmacy_sale_detail WHERE pharmacy_sale_detail_id = $1
      `, [item.pharmacy_sale_detail_id]);
    }

    // Items to Update or Insert
    for (const item of transaction.items) {
      const key = getIncomingSaleDetailKey(item);
      const existing = existingItemsList.find(e => e.key === key);

      const isOverride = item.isInventoryBacked === false || item.fulfillmentMode === 'override';
      
      const subUnitsPerUnit = (item.medicine as any).sub_units_per_unit || 1;
      const subUnitPrice = item.medicine.batch_sale_sub_unit_price 
        || (item.medicine as any).sub_unit_price 
        || (item.price / subUnitsPerUnit);
      
      const itemTotalBeforeDiscount = (item.quantity * item.price) + ((item.subQuantity || 0) * subUnitPrice);
      const discountAmount = Number(((itemTotalBeforeDiscount * (item.discountPercent || 0)) / 100).toFixed(2));
      const lineTotal = Number((itemTotalBeforeDiscount - discountAmount).toFixed(2));

      if (existing) {
        // Update
        await client.query(`
          UPDATE pharmacy_sale_detail SET
            quantity = $1,
            sub_quantity = $2,
            unit_sale_price = $3,
            sub_unit_sale_price = $4,
            discount_percent = $5,
            discount_amount = $6,
            line_total = $7,
            reason_code = $9,
            reason_note = $10,
            handled_by = COALESCE(handled_by, $11)
          WHERE pharmacy_sale_detail_id = $8
        `, [
          item.quantity,
          item.subQuantity || 0,
          item.price,
          subUnitPrice,
          item.discountPercent || 0,
          discountAmount,
          lineTotal,
          existing.pharmacy_sale_detail_id,
          isOverride ? (item.overrideReasonCode || 'other') : null,
          isOverride ? (item.overrideReasonNote || null) : null,
          isOverride ? staffId : null,
        ]);
      } else {
        // Insert
        await client.query(`
          INSERT INTO pharmacy_sale_detail (
            sale_id,
            medicine_id,
            batch_id,
            quantity,
            sub_quantity,
            unit_sale_price,
            sub_unit_sale_price,
            discount_percent,
            discount_amount,
            line_total,
            prescription_medicine_id,
            reason_code,
            reason_note,
            handled_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
          id,
          item.medicine.id,
          isOverride ? null : (item.batchId || null),
          item.quantity,
          item.subQuantity || 0,
          item.price,
          subUnitPrice,
          item.discountPercent || 0,
          discountAmount,
          lineTotal,
          (item as any).prescriptionMedicineId || null,
          isOverride ? (item.overrideReasonCode || 'other') : null,
          isOverride ? (item.overrideReasonNote || null) : null,
          isOverride ? staffId : null,
        ]);
      }
    }

    // 4. Audit Log
    await client.query(`
      INSERT INTO pos_audit_log (
        staff_id,
        action_type,
        sale_id,
        description
      ) VALUES ($1, $2, $3, $4)
    `, [
      staffId,
      'SALE_EDITED',
      id,
      `Edited sale ${transaction.reference || id} with ${transaction.items.length} items`
    ]);

    await client.query('COMMIT');

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Transaction updated successfully'
    });

  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: error.status });
    }
    if (client) await client.query('ROLLBACK');
    console.error('Transaction update error:', error);

    if (error instanceof StockValidationError) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error.message,
        data: error.details as any,
      }, { status: error.status });
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to update transaction'
    }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let client: PoolClient | undefined;

  try {
    await getAuthenticatedUser(request);
    client = await pool.connect();
    // 1. Fetch sale header
    const saleResult = await client.query(`
      SELECT 
        s.*,
        st.name as staff_name
      FROM pharmacy_sale s
      LEFT JOIN staff st ON s.handled_by = st.staff_id
      WHERE s.sale_id = $1
    `, [id]);

    if (saleResult.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Transaction not found'
      }, { status: 404 });
    }

    const sale = saleResult.rows[0];

    // 2. Fetch sale details with medicine and batch info
    const detailsResult = await client.query(`
      SELECT 
        sd.*,
        m.generic_name,
        m.brand_name,
        m.dosage_value,
        m.dosage_unit,
        m.form,
        m.sub_units_per_unit,
        COALESCE(mb.sale_price, 0) as medicine_base_price,
        mb.sale_sub_unit_price as medicine_base_sub_price,
        mb.batch_number,
        mb.expiry_date,
        mb.stock_quantity as batch_stock_quantity,
        mb.stock_sub_quantity as batch_stock_sub_quantity,
        mb.sale_price as batch_sale_price,
        mb.sale_sub_unit_price as batch_sale_sub_unit_price
      FROM pharmacy_sale_detail sd
      JOIN medicine m ON sd.medicine_id = m.medicine_id
      LEFT JOIN medicine_batch mb ON sd.batch_id = mb.batch_id
      WHERE sd.sale_id = $1
    `, [id]);

    const items = detailsResult.rows.map(row => {
      const isOverride =
        row.batch_id === null &&
        (
          row.prescription_medicine_id !== null ||
          row.reason_code !== null ||
          row.reason_note !== null ||
          row.handled_by !== null
        );
      return {
        id: row.pharmacy_sale_detail_id.toString(),
        medicine: {
          id: row.medicine_id,
          medicine_id: row.medicine_id,
          generic_name: row.generic_name,
          brand_name: row.brand_name,
          dosage_value: row.dosage_value,
          dosage_unit: row.dosage_unit,
          sub_units_per_unit: row.sub_units_per_unit,
          form: row.form,
          price: isOverride ? Number(row.unit_sale_price ?? 0) : Number(row.medicine_base_price ?? 0),
          sub_unit_price: isOverride ? 0 : Number(row.medicine_base_sub_price ?? 0),
          batch_id: row.batch_id,
          batch_number: row.batch_number,
          expiry_date: row.expiry_date,
          batch_stock_quantity: row.batch_stock_quantity,
          batch_stock_sub_quantity: row.batch_stock_sub_quantity,
          batch_sale_price: Number(row.batch_sale_price ?? 0),
          batch_sale_sub_unit_price: Number(row.batch_sale_sub_unit_price ?? 0)
        },
        quantity: Number(row.quantity ?? 0),
        subQuantity: Number(row.sub_quantity ?? 0),
        price: Number(row.unit_sale_price ?? 0),
        discountedPrice: Number(row.unit_sale_price ?? 0) - (Number(row.unit_sale_price ?? 0) * Number(row.discount_percent ?? 0) / 100),
        discountPercent: Number(row.discount_percent ?? 0),
        lineTotal: Number(row.line_total ?? 0),
        batchId: row.batch_id,
        batchNumber: row.batch_number,
        fulfillmentMode: isOverride ? 'override' : 'stock',
        isBillable: true,
        isInventoryBacked: !isOverride,
        ...(isOverride ? {
          prescriptionMedicineId: Number(row.prescription_medicine_id),
          overrideReasonCode: row.reason_code,
          overrideReasonNote: row.reason_note,
          availabilityStatus: 'override_selected',
        } : {
          ...(row.prescription_medicine_id ? { prescriptionMedicineId: Number(row.prescription_medicine_id) } : {})
        })
      };
    });

    const transaction = {
      id: sale.sale_id.toString(),
      reference: sale.payment_reference,
      timestamp: sale.sale_timestamp,
      customerId: sale.customer_id,
      visitId: sale.visit_id,
      billId: sale.bill_id,
      prescriptionId: sale.prescription_id,
      status: sale.status,
      items,
      payment: {
        type: sale.payment_type,
        payableAmount: Number(sale.total_amount),
        paidAmount: Number(sale.paid_amount),
        dueAmount: Number(sale.due_amount),
        changeAmount: Number(sale.change_amount),
        adjustment: Number(sale.discount_amount),
        adjustmentPercent: Number(sale.discount_percent),
        itemsDiscount: items.reduce((sum, item) => sum + (item.price * item.quantity * item.discountPercent / 100), 0),
        totalDiscount: Number(sale.discount_amount)
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
    console.error('Fetch transaction error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to fetch transaction details'
    }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
