import { NextRequest, NextResponse } from 'next/server';
import pool from '@/database/db';
import { ApiResponse, Transaction } from '@/src/lib/types';
import { generateReference, getCurrentStaffId } from '@/src/lib/utils';
import {
  StockValidationError,
  validateInventoryItemsForSale,
  allocateInventoryForSale,
  BatchAllocation,
} from './stockValidation';

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
    const billableItems = transaction.items?.filter((item) => item.isBillable !== false) ?? [];

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
    const staffId = getCurrentStaffId();

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

    // ─── Determine allocation mode ──────────────────────────────
    // If any inventory-backed item has a batchId, use legacy per-batch validation.
    // Otherwise, use FEFO allocation (backend picks the batches).
    const inventoryBackedItems = billableItems.filter(
      (item) => item.isBillable !== false && item.isInventoryBacked !== false && item.fulfillmentMode !== 'override'
    );
    const hasBatchIds = inventoryBackedItems.some(
      (item) => item.batchId || item.medicine?.batch_id
    );

    let fefoAllocations: Map<number, BatchAllocation[]> | null = null;

    if (hasBatchIds) {
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
        prescription_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING sale_id, sale_timestamp
    `, [
      transaction.visitId || null,
      resolvedBillId,
      staffId,
      transaction.payment.payableAmount,
      'Completed',
      transaction.payment.type,
      reference,
      transaction.payment.paidAmount,
      transaction.payment.dueAmount,
      transaction.payment.changeAmount,
      transaction.payment.adjustmentPercent,
      transaction.payment.adjustment,
      transaction.customerId || null,
      !!transaction.prescriptionId,
      transaction.prescriptionId || null
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
          transaction.customerId || null,
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
        transaction.customerId || null,
        item.availableQuantity || 0,
        'not_fulfilled',
        item.availabilityStatus || 'out_of_stock',
        item.availabilityNote || null,
        staffId,
      ]);
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
      'SALE_COMPLETED',
      saleId,
      `Completed sale ${reference} with ${billableItems.length} billable item(s)`
    ]);

    if (transaction.prescriptionId && transaction.visitId) {
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
