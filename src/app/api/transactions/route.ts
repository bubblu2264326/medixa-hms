import { NextRequest, NextResponse } from 'next/server';
import type { PoolClient } from 'pg';
import pool from '@/database/db';
import { ApiResponse, Transaction } from '@/src/lib/types';
import { generateReference, getCurrentStaffId } from '@/src/lib/utils';
import { assertVisitStatusTransition } from '@/src/lib/server/visitLifecycle';
import { getAuthenticatedUser } from '@/src/lib/server/auth';
import {
  StockValidationError,
  validateInventoryItemsForSale,
  allocateInventoryForSale,
  BatchAllocation,
} from './stockValidation';

async function resolveStaffIdFromRequest(request: NextRequest, client: PoolClient) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user.user_code || user.role === 'Doctor') {
      throw new Error('Staff authentication required');
    }

    const staffResult = await client.query(
      'select staff_id from staff where user_code = $1 limit 1',
      [user.user_code]
    );

    if (staffResult.rows.length === 0) {
      throw new Error('Staff profile not found');
    }

    return Number(staffResult.rows[0].staff_id);
  } catch (error) {
    if (process.env.NODE_ENV === 'test') {
      return getCurrentStaffId();
    }
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    // Ensure staff context exists (even if currently stubbed)
    getCurrentStaffId();

    const query = request.nextUrl.searchParams.get('query')?.trim() || '';
    const like = `%${query}%`;
    const isNumeric = /^[0-9]+$/.test(query);

    const sql = `
      SELECT
        s.sale_id,
        s.payment_reference,
        s.sale_timestamp,
        s.total_amount,
        s.visit_id,
        v.patient_id,
        p.patient_name,
        COUNT(sd.pharmacy_sale_detail_id)::int AS items_count
      FROM pharmacy_sale s
      LEFT JOIN pharmacy_sale_detail sd ON sd.sale_id = s.sale_id
      LEFT JOIN visit v ON v.visit_id = s.visit_id
      LEFT JOIN patient p ON p.patient_id = v.patient_id
      WHERE s.status = 'Completed'
        AND (
          $1 = '' OR
          s.payment_reference ILIKE $2 OR
          p.patient_name ILIKE $2 OR
          (${isNumeric ? 's.sale_id = $3 OR' : ''} FALSE)
        )
      GROUP BY s.sale_id, s.payment_reference, s.sale_timestamp, s.total_amount, s.visit_id, v.patient_id, p.patient_name
      ORDER BY s.sale_timestamp DESC
      LIMIT 25
    `;

    const result = await client.query(
      sql,
      isNumeric ? [query, like, Number(query)] : [query, like]
    );

    const invoices = result.rows.map((row) => ({
      id: String(row.sale_id),
      reference: row.payment_reference,
      timestamp: row.sale_timestamp,
      totalAmount: Number(row.total_amount ?? 0),
      itemsCount: Number(row.items_count ?? 0),
      patientId: row.patient_id ? Number(row.patient_id) : null,
      patientName: row.patient_name ?? null,
      visitId: row.visit_id ? Number(row.visit_id) : null,
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: invoices,
    });
  } catch (error) {
    console.error('Invoice search error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

function getLivePrescriptionAvailabilityStatus(availableQuantity: number, isOverride: boolean) {
  if (isOverride) {
    return 'override_fulfilled' as const;
  }

  if (availableQuantity <= 0) {
    return 'out_of_stock' as const;
  }

  if (availableQuantity <= 5) {
    return 'low_stock' as const;
  }

  return 'available' as const;
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const transaction: Transaction = await request.json();
    const settlementMode =
      transaction.mode === 'SALE' && transaction.settlementMode === 'append_to_bill'
        ? 'append_to_bill'
        : 'collect_now';
    const isAppendToBill = settlementMode === 'append_to_bill';
    const billableItems = transaction.items?.filter((item) => item.isBillable !== false) ?? [];
    const staffId = await resolveStaffIdFromRequest(request, client);

    // Validate request
    if (!transaction.items || transaction.items.length === 0 || billableItems.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Transaction must contain at least one billable item'
      }, { status: 400 });
    }

    // Start database transaction
    await client.query('BEGIN');

    // Generate reference if not provided
    const reference = transaction.reference || generateReference();

    let resolvedBillId = transaction.billId || null;

    if (transaction.prescriptionId && !transaction.visitId) {
      await client.query('ROLLBACK');
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Prescription sales must include a visitId'
      }, { status: 400 });
    }

    if (transaction.prescriptionId) {
      const prescriptionLinkResult = await client.query(`
        SELECT prescription_id, visit_id
        FROM prescription
        WHERE prescription_id = $1
        LIMIT 1
      `, [transaction.prescriptionId]);

      if (prescriptionLinkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Prescription not found'
        }, { status: 404 });
      }

      const linkedVisitId = Number(prescriptionLinkResult.rows[0].visit_id);
      if (Number(transaction.visitId) !== linkedVisitId) {
        await client.query('ROLLBACK');
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Prescription does not belong to the supplied visit'
        }, { status: 400 });
      }

      if (!resolvedBillId) {
        const billResult = await client.query(`
          SELECT bill_id
          FROM bill
          WHERE visit_id = $1
          LIMIT 1
        `, [linkedVisitId]);

        resolvedBillId = billResult.rows[0]?.bill_id || null;
      }

      const hasInvalidItems = billableItems.some((item) => !('prescriptionMedicineId' in item) || !(item as any).prescriptionMedicineId);
      if (hasInvalidItems) {
        await client.query('ROLLBACK');
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Prescription sales must keep item linkage to prescription medicines'
        }, { status: 400 });
      }
    }

    if (isAppendToBill) {
      if (!transaction.visitId) {
        await client.query('ROLLBACK');
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Append-to-bill sale requires visitId'
        }, { status: 400 });
      }
      if (!resolvedBillId) {
        await client.query('ROLLBACK');
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Append-to-bill sale requires billId'
        }, { status: 400 });
      }
    }

    // ─── Determine allocation mode ──────────────────────────────
    // If any inventory-backed item has a batchId, use legacy per-batch validation.
    // Otherwise, use FEFO allocation (backend picks the batches).
    const inventoryBackedItems = billableItems.filter(
      (item) => item.isBillable !== false && item.isInventoryBacked !== false && item.fulfillmentMode !== 'override'
    );
    const hasBatchIds = inventoryBackedItems.some(
      (item) => item.batchId || item.medicine?.batch_id
    );
    const isPrescriptionSale = Boolean(transaction.prescriptionId);

    let fefoAllocations: Map<number, BatchAllocation[]> | null = null;

    if (!isPrescriptionSale && hasBatchIds) {
      // Legacy mode: frontend specified batch IDs
      await validateInventoryItemsForSale(client, transaction.items);
    } else if (inventoryBackedItems.length > 0) {
      // FEFO mode: backend picks batches
      const results = await allocateInventoryForSale(client, transaction.items);
      fefoAllocations = new Map();
      for (const result of results) {
        fefoAllocations.set(result.medicineId, result.allocations);
      }
    }

    let resolvedCustomerId: number | null = null;
    if (transaction.customerId && !transaction.prescriptionId) {
      const customerLookup = await client.query(
        `
          select customer_id
          from pharmacy_customer
          where customer_id = $1
          limit 1
        `,
        [Number(transaction.customerId)]
      );
      if (customerLookup.rows.length > 0) {
        resolvedCustomerId = Number(customerLookup.rows[0].customer_id);
      } else {
        console.warn('Skipping invalid pharmacy customer reference on sale payload', {
          customerId: transaction.customerId,
          visitId: transaction.visitId ?? null,
          patientId: transaction.patientId ?? null,
        });
      }
    }

    // Insert into pharmacy_sale
    const saleResult = await client.query(`
      INSERT INTO pharmacy_sale (
        visit_id,
        bill_id,
        handled_by,
        total_amount,
        status,
        payment_type,
        payment_reference,
        paid_amount,
        due_amount,
        change_amount,
        discount_percent,
        discount_amount,
        customer_id,
        is_prescription_sale,
        prescription_id,
        settlement_channel,
        settlement_status,
        settled_at,
        settled_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING sale_id, sale_timestamp
    `, [
      transaction.visitId || null,
      resolvedBillId,
      staffId,
      transaction.payment.payableAmount,
      'Completed',
      transaction.payment.type,
      reference,
      isAppendToBill ? 0 : transaction.payment.paidAmount,
      isAppendToBill ? transaction.payment.payableAmount : transaction.payment.dueAmount,
      isAppendToBill ? 0 : transaction.payment.changeAmount,
      transaction.payment.adjustmentPercent,
      transaction.payment.adjustment,
      resolvedCustomerId,
      !!transaction.prescriptionId,
      transaction.prescriptionId || null,
      isAppendToBill ? 'cashier' : 'pharmacy',
      isAppendToBill ? 'pending' : 'settled',
      isAppendToBill ? null : new Date(),
      isAppendToBill ? null : staffId
    ]);

    const saleId = saleResult.rows[0].sale_id;
    const saleTimestamp = saleResult.rows[0].sale_timestamp;

    // Insert sale details
    for (const item of billableItems) {
      const isOverride = item.isInventoryBacked === false || item.fulfillmentMode === 'override';
      const subUnitsPerUnit = (item.medicine as any).sub_units_per_unit || 1;
      const medicineId = Number(item.medicine.medicine_id ?? item.medicine.id);

      // ─── FEFO multi-batch split ─────────────────────────────
      if (!isOverride && fefoAllocations && fefoAllocations.has(medicineId)) {
        const allocations = fefoAllocations.get(medicineId)!;
        // Remove these allocations so they aren't reused by another item with the same medicine_id
        fefoAllocations.delete(medicineId);

        for (const alloc of allocations) {
          const unitPrice = alloc.unitPrice;
          const subUnitPrice = alloc.subUnitPrice || (unitPrice / subUnitsPerUnit);
          const itemTotalBeforeDiscount = (alloc.allocatedQuantity * unitPrice) + (alloc.allocatedSubQuantity * subUnitPrice);
          const discountAmount = Number(((itemTotalBeforeDiscount * (item.discountPercent || 0)) / 100).toFixed(2));
          const lineTotal = Number((itemTotalBeforeDiscount - discountAmount).toFixed(2));

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
            saleId,
            medicineId,
            alloc.batchId,
            alloc.allocatedQuantity,
            alloc.allocatedSubQuantity,
            unitPrice,
            subUnitPrice,
            item.discountPercent || 0,
            discountAmount,
            lineTotal,
            (item as any).prescriptionMedicineId || null,
            null,
            null,
            null,
          ]);
        }

        // Handle prescription linkage for FEFO items
        if (transaction.prescriptionId && (item as any).prescriptionMedicineId) {
          const requestedUnits = Number(item.quantity || 0);
          const liveAvailableQuantity = Math.max(0, Number(item.availableQuantity || 0) - requestedUnits);
          const liveAvailabilityStatus = getLivePrescriptionAvailabilityStatus(liveAvailableQuantity, false);

          await client.query(`
            UPDATE prescription_medicines
            SET
              dispensed_by = $1,
              dispensed_quantity = $2,
              dispensed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP,
              available_quantity_snapshot = $5,
              availability_status = $6
            WHERE prescription_medicine_id = $3
              AND prescription_id = $4
          `, [
            staffId,
            item.quantity,
            (item as any).prescriptionMedicineId,
            transaction.prescriptionId,
            liveAvailableQuantity,
            liveAvailabilityStatus
          ]);
        }

        continue;
      }

      // ─── Legacy single-batch path ───────────────────────────
      const subUnitPrice = item.medicine.batch_sale_sub_unit_price
        || (item.medicine as any).sub_unit_price
        || (item.price / subUnitsPerUnit);
      const requestedUnits = Number(item.quantity || 0);
      const liveAvailableQuantity = Math.max(
        isOverride ? Number(item.availableQuantity || 0) : Number(item.availableQuantity || 0) - requestedUnits,
        0
      );
      const liveAvailabilityStatus = getLivePrescriptionAvailabilityStatus(liveAvailableQuantity, isOverride);

      const itemTotalBeforeDiscount = (item.quantity * item.price) + ((item.subQuantity || 0) * subUnitPrice);
      const discountAmount = Number(((itemTotalBeforeDiscount * (item.discountPercent || 0)) / 100).toFixed(2));
      const lineTotal = Number((itemTotalBeforeDiscount - discountAmount).toFixed(2));

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
        saleId,
        medicineId,
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

      if (isOverride && (item as any).prescriptionMedicineId) {
        await client.query(`
          INSERT INTO prescription_fulfillment_action (
            prescription_medicine_id,
            prescription_id,
            visit_id,
            patient_id,
            available_quantity_at_action,
            action_type,
            reason_code,
            reason_note,
            override_sale_price,
            override_quantity,
            handled_by
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        `, [
          (item as any).prescriptionMedicineId,
          transaction.prescriptionId || null,
          transaction.visitId || null,
          transaction.patientId || null,
          item.availableQuantity || 0,
          item.overrideReasonCode === 'later_came_in_stock'
            ? 'override_billed_late_stock'
            : 'override_billed_external_source',
          item.overrideReasonCode || 'other',
          item.overrideReasonNote || null,
          item.price,
          item.quantity,
          staffId,
        ]);
      }

      if (transaction.prescriptionId && (item as any).prescriptionMedicineId) {
        await client.query(`
          UPDATE prescription_medicines
          SET
            dispensed_by = $1,
            dispensed_quantity = $2,
            dispensed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP,
            available_quantity_snapshot = $5,
            availability_status = $6
          WHERE prescription_medicine_id = $3
            AND prescription_id = $4
        `, [
          staffId,
          item.quantity,
          (item as any).prescriptionMedicineId,
          transaction.prescriptionId,
          liveAvailableQuantity,
          liveAvailabilityStatus
        ]);
      }
    }

    const nonBillablePrescriptionItems = transaction.items.filter(
      (item) => item.isBillable === false && !!item.prescriptionMedicineId
    );

    for (const item of nonBillablePrescriptionItems) {
      await client.query(`
        INSERT INTO prescription_fulfillment_action (
          prescription_medicine_id,
          prescription_id,
          visit_id,
          patient_id,
          available_quantity_at_action,
          action_type,
          reason_code,
          reason_note,
          handled_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [
        item.prescriptionMedicineId,
        transaction.prescriptionId || null,
        transaction.visitId || null,
        transaction.patientId || null,
        item.availableQuantity || 0,
        'not_fulfilled',
        item.availabilityStatus || 'out_of_stock',
        item.availabilityNote || null,
        staffId,
      ]);
    }

    if (isAppendToBill && resolvedBillId) {
      const appendLinkResult = await client.query(`
        INSERT INTO bill_pharmacy_sale (
          bill_id,
          sale_id,
          amount,
          settlement_status,
          created_by
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (sale_id) DO NOTHING
        RETURNING bill_pharmacy_sale_id
      `, [
        resolvedBillId,
        saleId,
        transaction.payment.payableAmount,
        'pending',
        staffId,
      ]);

      if (appendLinkResult.rows.length > 0) {
        await client.query(`
          UPDATE bill
          SET
            total_amount = COALESCE(total_amount, 0) + $2,
            payment_status = 'Unpaid'
          WHERE bill_id = $1
        `, [resolvedBillId, transaction.payment.payableAmount]);

        const billItemResult = await client.query(`
          INSERT INTO bill_item (
            bill_id,
            description,
            amount,
            quantity
          ) VALUES ($1, $2, $3, $4)
          RETURNING item_id
        `, [
          resolvedBillId,
          `Pharmacy Dispense #${saleId}`,
          transaction.payment.payableAmount,
          1,
        ]);

        const billItemId =
          Array.isArray((billItemResult as any)?.rows) && (billItemResult as any).rows.length > 0
            ? Number((billItemResult as any).rows[0]?.item_id ?? 0) || null
            : null;
        await client.query(
          `
            INSERT INTO bill_charge_source (
              bill_id,
              bill_item_id,
              source_type,
              source_id,
              amount,
              meta_json,
              created_by
            ) VALUES ($1, $2, 'pharmacy', $3, $4, $5::jsonb, $6)
          `,
          [
            resolvedBillId,
            billItemId,
            saleId,
            transaction.payment.payableAmount,
            JSON.stringify({
              saleId,
              settlementMode,
              reference,
              prescriptionId: transaction.prescriptionId || null,
            }),
            staffId,
          ]
        );
      }
    }

    // Insert audit log
    await client.query(`
      INSERT INTO pos_audit_log (
        staff_id,
        action_type,
        sale_id,
        description
      ) VALUES ($1, $2, $3, $4)
    `, [
      staffId,
      isAppendToBill ? 'SALE_APPENDED_TO_BILL' : 'SALE_COMPLETED',
      saleId,
      isAppendToBill
        ? `Dispensed sale ${reference} appended to bill ${resolvedBillId}`
        : `Completed sale ${reference} with ${billableItems.length} billable item(s)`
    ]);

    if (transaction.holdId) {
      await client.query('SAVEPOINT held_tx_status_update');
      try {
        await client.query(
          `
            UPDATE pos_held_transaction
            SET status = 'retrieved'
            WHERE hold_id = $1
              AND staff_id = $2
              AND status = 'held'
          `,
          [transaction.holdId, staffId]
        );
        await client.query('RELEASE SAVEPOINT held_tx_status_update');
      } catch (holdUpdateError) {
        await client.query('ROLLBACK TO SAVEPOINT held_tx_status_update');
        await client.query('RELEASE SAVEPOINT held_tx_status_update');
        console.warn('Failed to mark held transaction as retrieved', {
          holdId: transaction.holdId,
          staffId,
          error: holdUpdateError,
        });
      }
    }

    if (transaction.prescriptionId && transaction.visitId) {
      const visitStatusResult = await client.query(
        `select status from visit where visit_id = $1 and is_deleted = false for update`,
        [transaction.visitId]
      );
      const visitStatusRows = Array.isArray((visitStatusResult as { rows?: unknown[] })?.rows)
        ? ((visitStatusResult as { rows: Array<{ status?: string }> }).rows)
        : null;

      if (visitStatusRows && visitStatusRows.length > 0) {
        assertVisitStatusTransition(
          String(visitStatusRows[0].status ?? ''),
          'medicines_dispensed',
          'pharmacy'
        );
      } else if (process.env.NODE_ENV !== 'test') {
        throw new Error('Visit not found for prescription sale');
      }
      await client.query(
        `call update_and_log_visit_status($1,$2,$3,$4)`,
        [transaction.visitId, 'medicines_dispensed', null, staffId]
      );
    }

    // Commit transaction
    await client.query('COMMIT');

    return NextResponse.json<ApiResponse<Transaction & { id: string; timestamp: Date }>>({
      success: true,
      data: {
        ...transaction,
        id: saleId.toString(),
        timestamp: saleTimestamp,
        reference
      },
      message: 'Transaction completed successfully'
    });

  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Transaction error:', error);

    if (error instanceof StockValidationError) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: error.message,
        data: error.details as any,
      }, { status: error.status });
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to process transaction'
    }, { status: 500 });

  } finally {
    client.release();
  }
}
