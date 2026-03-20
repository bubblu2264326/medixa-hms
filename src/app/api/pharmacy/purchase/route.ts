import { NextRequest, NextResponse } from 'next/server';
import pool from '@/database/db';
import { ApiResponse } from '@/src/lib/types';
import { getCurrentStaffId } from '@/src/lib/utils';

export async function POST(request: NextRequest) {
    const client = await pool.connect();

    try {
        const body = await request.json();
        const { party_id, total_amount, payment_status, items } = body;

        if (!party_id || !items || items.length === 0) {
            return NextResponse.json<ApiResponse>({
                success: false,
                error: 'Missing required fields: party_id and items are required.'
            }, { status: 400 });
        }

        const staffId = getCurrentStaffId();

        // Start database transaction
        await client.query('BEGIN');

        // 1. Insert into medicine_purchase (Header)
        // Omit invoice_no to let DB use generate_invoice_no() default
        const purchaseResult = await client.query(`
      INSERT INTO medicine_purchase (
        party_id,
        invoice_timestamp,
        total_amount,
        payment_status,
        created_by
      ) VALUES ($1, NOW(), $2, $3, $4)
      RETURNING purchase_id, invoice_no
    `, [
            party_id,
            total_amount || 0,
            payment_status || 'Paid',
            staffId
        ]);

        const { purchase_id: purchaseId, invoice_no: generatedInvoiceNo } = purchaseResult.rows[0];

        const resolvedItems: Array<{
            medicine_id: number;
            batch_id: number;
            batch_code: string | null;
            batch_number: string;
        }> = [];

        // 2. Process each item (Detail + Batch)
        for (const item of items) {
            const {
                medicine_id,
                quantity,
                unit_cost,
                sub_quantity,
                sub_unit_cost,
                batch_number,
                expiry_date,
                sale_price,
                sale_sub_unit_price
            } = item;

            if (!batch_number) {
                throw new Error(`BATCH_MISMATCH: Supplier batch / lot number is required for medicine ${medicine_id}`);
            }

            // Handle Batch: Resolve by (medicine_id, batch_number, party_id)
            let batchId: number;
            let batchCode: string | null = null;
            const batchCheck = await client.query(`
        SELECT batch_id, batch_code, purchase_price, purchase_sub_unit_price, sale_price, sale_sub_unit_price, expiry_date 
        FROM medicine_batch 
        WHERE medicine_id = $1 AND batch_number = $2 AND party_id = $3
      `, [medicine_id, batch_number, party_id]);

            if (batchCheck.rows.length > 0) {
                const existingBatch = batchCheck.rows[0];
                batchId = existingBatch.batch_id;
                batchCode = existingBatch.batch_code;

                // Mismatch Validation (Phase 2)
                const tolerance = 0.01;
                const isPriceMismatch = 
                    Math.abs((existingBatch.purchase_price || 0) - (unit_cost || 0)) >= tolerance ||
                    Math.abs((existingBatch.purchase_sub_unit_price || 0) - (sub_unit_cost || 0)) >= tolerance ||
                    Math.abs((existingBatch.sale_price || 0) - (sale_price || 0)) >= tolerance ||
                    Math.abs((existingBatch.sale_sub_unit_price || 0) - (sale_sub_unit_price || 0)) >= tolerance;
                
                const existingExpiry = existingBatch.expiry_date ? new Date(existingBatch.expiry_date).toISOString().split('T')[0] : null;
                const newExpiry = expiry_date ? new Date(expiry_date).toISOString().split('T')[0] : null;
                const isExpiryMismatch = existingExpiry !== newExpiry;

                if (isPriceMismatch || isExpiryMismatch) {
                    const errorMsg = isPriceMismatch ? 'Pricing mismatch' : 'Expiry mismatch';
                    throw new Error(`BATCH_MISMATCH: ${errorMsg} for batch "${batch_number}"`);
                }
            } else {
                // Create new batch
                try {
                    const batchCreate = await client.query(`
            INSERT INTO medicine_batch (
              medicine_id,
              batch_number,
              expiry_date,
              purchase_price,
              purchase_sub_unit_price,
              sale_price,
              sale_sub_unit_price,
              stock_quantity,
              stock_sub_quantity,
              received_date,
              party_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, NOW(), $8)
            RETURNING batch_id, batch_code
          `, [
                        medicine_id,
                        batch_number,
                        expiry_date,
                        unit_cost,
                        sub_unit_cost,
                        sale_price,
                        sale_sub_unit_price,
                        party_id
                    ]);
                    batchId = batchCreate.rows[0].batch_id;
                    batchCode = batchCreate.rows[0].batch_code;
                } catch (err: any) {
                    if (err.code === '23505') { // Unique constraint race
                        const retryCheck = await client.query(`
              SELECT batch_id, batch_code, purchase_price, purchase_sub_unit_price, sale_price, sale_sub_unit_price, expiry_date 
              FROM medicine_batch 
              WHERE medicine_id = $1 AND batch_number = $2 AND party_id = $3
            `, [medicine_id, batch_number, party_id]);
                        
                        if (retryCheck.rows.length > 0) {
                            const existing = retryCheck.rows[0];
                            const tolerance = 0.01;
                            if (
                                Math.abs((existing.purchase_price || 0) - (unit_cost || 0)) >= tolerance ||
                                Math.abs((existing.purchase_sub_unit_price || 0) - (sub_unit_cost || 0)) >= tolerance ||
                                Math.abs((existing.sale_price || 0) - (sale_price || 0)) >= tolerance ||
                                Math.abs((existing.sale_sub_unit_price || 0) - (sale_sub_unit_price || 0)) >= tolerance ||
                                new Date(existing.expiry_date).toISOString().split('T')[0] !== new Date(expiry_date).toISOString().split('T')[0]
                            ) {
                                throw new Error(`BATCH_MISMATCH (Race): Conflict for batch "${batch_number}"`);
                            }
                            batchId = existing.batch_id;
                            batchCode = existing.batch_code;
                        } else throw err;
                    } else throw err;
                }
            }

            // 3. Insert into medicine_purchase_detail
            await client.query(`
        INSERT INTO medicine_purchase_detail (
          purchase_id,
          medicine_id,
          quantity,
          unit_cost,
          sub_quantity,
          sub_unit_cost,
          batch_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
                purchaseId,
                medicine_id,
                quantity,
                unit_cost,
                sub_quantity || 0,
                sub_unit_cost || 0,
                batchId
            ]);

            resolvedItems.push({
                medicine_id,
                batch_id: batchId,
                batch_code: batchCode,
                batch_number
            });
        }

        // 4. Audit Log
        await client.query(`
      INSERT INTO pos_audit_log (staff_id, action_type, description)
      VALUES ($1, $2, $3)
    `, [
            staffId,
            'PURCHASE_CREATED',
            `Medicine purchase invoice #${generatedInvoiceNo} (ID: ${purchaseId}) created.`
        ]);

        await client.query('COMMIT');

        return NextResponse.json<ApiResponse>({
            success: true,
            message: 'Purchase invoice saved successfully',
            data: {
                purchaseId,
                invoice_no: generatedInvoiceNo,
                items: resolvedItems
            }
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Medicine purchase error:', error);
        
        let status = 500;
        let errorMessage = 'Failed to process medicine purchase transaction.';
        if (error.message.startsWith('BATCH_MISMATCH')) {
            status = 400;
            errorMessage = error.message;
        }

        return NextResponse.json<ApiResponse>({
            success: false,
            error: errorMessage
        }, { status });
    } finally {
        client.release();
    }
}
