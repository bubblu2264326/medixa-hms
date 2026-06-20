import { NextRequest, NextResponse } from 'next/server';
import pool from '@/database/db';
import { ApiResponse, Transaction } from '@/src/lib/types';
import { generateReference } from '@/src/lib/utils';
import type { PoolClient } from 'pg';
import { AuthError, getAuthenticatedUser } from '@/src/lib/server/auth';
import { resolveActorStaffId } from '@/src/lib/server/actor';

export async function POST(request: NextRequest) {
  let client: PoolClient | undefined;

  try {
    await getAuthenticatedUser(request);
    client = await pool.connect();
    const transaction: Transaction & { ref_sale_id?: number } = await request.json();

    // Validate request
    if (!transaction.items || transaction.items.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Return must contain at least one item'
      }, { status: 400 });
    }

    // Start database transaction
    await client.query('BEGIN');

    const reference = transaction.reference || generateReference();
    const staffId = await resolveActorStaffId(request, client);

    // We ALWAYS use the sale_return system to ensure stock is incremented correctly
    // by the database triggers (fn_tg_sale_return_detail_to_txn).

    let saleId = transaction.ref_sale_id || null;

    // If no ref_sale_id, create a dummy pharmacy_sale header first
    if (!saleId) {
      const saleResult = await client.query(`
        INSERT INTO pharmacy_sale (
          handled_by,
          total_amount,
          status,
          payment_type,
          payment_reference,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING sale_id
      `, [
        staffId,
        0, // Header stays 0 or negative, items will be in return table
        'Returned',
        transaction.payment.type,
        reference,
        'Standalone Return Transaction'
      ]);
      saleId = saleResult.rows[0].sale_id;
    } else {
      // Check if this is a full return or partial return
      const statusCheckResult = await client.query(`
        SELECT 
          (SELECT COALESCE(SUM(quantity), 0) FROM pharmacy_sale_detail WHERE sale_id = $1) as original_qty,
          (SELECT COALESCE(SUM(srd.returned_quantity), 0) 
           FROM sale_return_detail srd 
           JOIN sale_return sr ON sr.return_id = srd.return_id 
           WHERE sr.sale_id = $1) as past_returned_qty,
          $2::numeric as current_return_qty
      `, [saleId, transaction.items.reduce((sum, item) => sum + item.quantity, 0)]);

      const { original_qty, past_returned_qty, current_return_qty } = statusCheckResult.rows[0] || { original_qty: 0, past_returned_qty: 0, current_return_qty: 0 };
      const total_returned = Number(past_returned_qty) + Number(current_return_qty);

      // If fully returned, update the original sale status
      if (total_returned >= Number(original_qty) && Number(original_qty) > 0) {
        await client.query(`
          UPDATE pharmacy_sale 
          SET status = 'Returned' 
          WHERE sale_id = $1
        `, [saleId]);
      }
    }

    // Create sale_return record linked to the sale header
    const returnResult = await client.query(`
      INSERT INTO sale_return (
        sale_id,
        reason,
        created_by
      ) VALUES ($1, $2, $3)
      RETURNING return_id, return_timestamp
    `, [
      saleId,
      'Customer return',
      staffId
    ]);

    const returnId = returnResult.rows[0].return_id;
    const returnTimestamp = returnResult.rows[0].return_timestamp;

    // Insert return details - this triggers the stock increase in the database!
    for (const item of transaction.items) {
      const subUnitsPerUnit = (item.medicine as any).sub_units_per_unit || 1;
      const subUnitPrice = item.medicine.batch_sale_sub_unit_price
        || (item.medicine as any).sub_unit_price
        || (item.price / subUnitsPerUnit);

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
        returnId,
        item.medicine.id,
        item.quantity,
        item.price,
        item.batchId || null,
        item.subQuantity || 0,
        subUnitPrice
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
      'SALE_RETURNED',
      saleId,
      `Return processed for ${transaction.ref_sale_id ? 'sale #' + saleId : 'standalone return'} with ${transaction.items.length} items.`
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
        console.warn('Failed to mark held return transaction as retrieved', {
          holdId: transaction.holdId,
          staffId,
          error: holdUpdateError,
        });
      }
    }

    // Commit transaction
    await client.query('COMMIT');

    return NextResponse.json<ApiResponse<Transaction & { id: string; timestamp: Date }>>({
      success: true,
      data: {
        ...transaction,
        id: saleId?.toString() || "",
        timestamp: returnTimestamp,
        reference
      },
      message: 'Return processed and stock updated successfully'
    });

  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: error.status });
    }
    // Rollback on error
    if (client) await client.query('ROLLBACK');
    console.error('Return process error:', error);

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to process return'
    }, { status: 500 });

  } finally {
    if (client) client.release();
  }
}
