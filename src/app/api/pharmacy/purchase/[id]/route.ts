import { NextRequest, NextResponse } from 'next/server';
import pool from '@/database/db';
import { ApiResponse } from '@/src/lib/types';
import type { PoolClient } from 'pg';
import { AuthError, getAuthenticatedUser } from '@/src/lib/server/auth';
import { resolveActorStaffId } from '@/src/lib/server/actor';

/**
 * GET /api/pharmacy/purchase/[id]
 * Fetch a purchase invoice header + detail rows for editing.
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
    // 1. Fetch purchase header
    const headerResult = await client.query(`
      SELECT
        mp.purchase_id,
        mp.party_id,
        mp.invoice_no,
        mp.invoice_timestamp,
        mp.total_amount,
        mp.payment_status,
        pt.name AS party_name
      FROM medicine_purchase mp
      LEFT JOIN party pt ON pt.party_id = mp.party_id
      WHERE mp.purchase_id = $1
    `, [id]);

    if (headerResult.rows.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Purchase not found'
      }, { status: 404 });
    }

    const header = headerResult.rows[0];

    // 2. Fetch purchase detail rows with medicine and batch info
    const detailsResult = await client.query(`
      SELECT
        mpd.id,
        mpd.medicine_id,
        mpd.quantity,
        mpd.unit_cost,
        mpd.sub_quantity,
        mpd.sub_unit_cost,
        mpd.batch_id,
        m.brand_name,
        m.generic_name,
        m.dosage_unit,
        m.sub_unit,
        mb.batch_number,
        mb.batch_code,
        mb.expiry_date,
        mb.sale_price,
        mb.sale_sub_unit_price
      FROM medicine_purchase_detail mpd
      JOIN medicine m ON m.medicine_id = mpd.medicine_id
      LEFT JOIN medicine_batch mb ON mb.batch_id = mpd.batch_id
      WHERE mpd.purchase_id = $1
    `, [id]);

    const items = (detailsResult.rows || []).map(row => ({
      detail_id: row.id,
      medicine_id: row.medicine_id,
      medicine_name: row.brand_name || row.generic_name,
      quantity: row.quantity,
      sub_quantity: row.sub_quantity,
      unit_cost: Number(row.unit_cost),
      sub_unit_cost: Number(row.sub_unit_cost),
      batch_id: row.batch_id,
      batch_number: row.batch_number,
      batch_code: row.batch_code,
      expiry_date: row.expiry_date ? new Date(row.expiry_date).toISOString().split('T')[0] : '',
      sale_price: Number(row.sale_price),
      sale_sub_unit_price: Number(row.sale_sub_unit_price),
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        purchase_id: header.purchase_id,
        party_id: header.party_id,
        party_name: header.party_name,
        invoice_no: header.invoice_no,
        total_amount: Number(header.total_amount),
        payment_status: header.payment_status,
        items,
      }
    });

  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Fetch purchase error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to fetch purchase details'
    }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

/**
 * PUT /api/pharmacy/purchase/[id]
 * Update an existing purchase invoice (header + items).
 *
 * Stock adjustments rely on DB triggers on medicine_purchase_detail:
 *   - DELETE triggers reduce stock
 *   - INSERT triggers increase stock
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
    const body = await request.json();
    const { party_id, invoice_no, total_amount, payment_status, items } = body;

    if (!party_id || !invoice_no || !items || items.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Missing required fields: party_id, invoice_no, and items are required.'
      }, { status: 400 });
    }

    const staffId = await resolveActorStaffId(request, client);
    await client.query('BEGIN');

    // 1. Update purchase header
    await client.query(`
      UPDATE medicine_purchase SET
        party_id = $1,
        invoice_no = $2,
        total_amount = $3,
        payment_status = $4
      WHERE purchase_id = $5
    `, [party_id, invoice_no, total_amount || 0, payment_status || 'Paid', id]);

    // 2. Fetch existing detail rows
    const existingResult = await client.query(`
      SELECT id, medicine_id, batch_id
      FROM medicine_purchase_detail
      WHERE purchase_id = $1
    `, [id]);
    const existingDetails = existingResult.rows;

    // Use a mapping to reconcile incoming vs existing
    const conn = client;
    const existingItems = await Promise.all(existingDetails.map(async (row: any) => {
      const batchRes = await conn.query(
        `SELECT batch_number FROM medicine_batch WHERE batch_id = $1`, [row.batch_id]
      );
      const batchNumber = batchRes.rows[0]?.batch_number || '';
      return {
        ...row,
        key: `${row.medicine_id}_${batchNumber}`
      };
    }));

    // 3. Delete removed items
    const incomingKeys = new Set(items.map((i: any) => `${i.medicine_id}_${i.batch_number}`));
    const itemsToDelete = existingItems.filter(e => !incomingKeys.has(e.key));

    for (const item of itemsToDelete) {
      await client.query(`DELETE FROM medicine_purchase_detail WHERE id = $1`, [item.id]);
    }

    // 4. Update existing or insert new items
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

      // Batch Resolution: medicine_id + batch_number + party_id
      let batchId: number;
      const batchCheck = await client.query(`
        SELECT batch_id, batch_code, purchase_price, purchase_sub_unit_price, sale_price, sale_sub_unit_price, expiry_date 
        FROM medicine_batch 
        WHERE medicine_id = $1 AND batch_number = $2 AND party_id = $3
      `, [medicine_id, batch_number, party_id]);

      if (batchCheck.rows.length > 0) {
        const existingBatch = batchCheck.rows[0];
        batchId = existingBatch.batch_id;

        // Validation
        const tolerance = 0.01;
        const isPriceMismatch = 
            Math.abs((existingBatch.purchase_price || 0) - (unit_cost || 0)) >= tolerance ||
            Math.abs((existingBatch.purchase_sub_unit_price || 0) - (sub_unit_cost || 0)) >= tolerance ||
            Math.abs((existingBatch.sale_price || 0) - (sale_price || 0)) >= tolerance ||
            Math.abs((existingBatch.sale_sub_unit_price || 0) - (sale_sub_unit_price || 0)) >= tolerance;
        
        const existingExpiry = existingBatch.expiry_date ? new Date(existingBatch.expiry_date).toISOString().split('T')[0] : null;
        const newExpiry = expiry_date ? new Date(expiry_date).toISOString().split('T')[0] : null;
        
        if (isPriceMismatch || (existingExpiry !== newExpiry)) {
            throw new Error(`BATCH_MISMATCH: Price or Expiry mismatch for batch "${batch_number}"`);
        }
        // Metadata Update removed in Phase 2 for reuse consistency
      } else {
        try {
            const batchCreate = await client.query(`
              INSERT INTO medicine_batch (
                medicine_id, batch_number, expiry_date,
                purchase_price, purchase_sub_unit_price,
                sale_price, sale_sub_unit_price,
              stock_quantity, stock_sub_quantity,
              received_date, party_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, NOW(), $8)
              RETURNING batch_id, batch_code
            `, [medicine_id, batch_number, expiry_date, unit_cost, sub_unit_cost, sale_price, sale_sub_unit_price, party_id]);
            batchId = batchCreate.rows[0].batch_id;
        } catch (err: any) {
            if (err.code === '23505') {
                const retry = await client.query(`
                  SELECT batch_id, purchase_price, purchase_sub_unit_price, sale_price, sale_sub_unit_price, expiry_date
                  FROM medicine_batch 
                  WHERE medicine_id = $1 AND batch_number = $2 AND party_id = $3
                `, [medicine_id, batch_number, party_id]);
                if (retry.rows.length > 0) {
                  const existing = retry.rows[0];
                  const tolerance = 0.01;
                  const existingExpiry = existing.expiry_date ? new Date(existing.expiry_date).toISOString().split('T')[0] : null;
                  const newExpiry = expiry_date ? new Date(expiry_date).toISOString().split('T')[0] : null;
                  if (
                    Math.abs((existing.purchase_price || 0) - (unit_cost || 0)) >= tolerance ||
                    Math.abs((existing.purchase_sub_unit_price || 0) - (sub_unit_cost || 0)) >= tolerance ||
                    Math.abs((existing.sale_price || 0) - (sale_price || 0)) >= tolerance ||
                    Math.abs((existing.sale_sub_unit_price || 0) - (sale_sub_unit_price || 0)) >= tolerance ||
                    existingExpiry !== newExpiry
                  ) {
                    throw new Error(`BATCH_MISMATCH (Race): Conflict for batch "${batch_number}"`);
                  }
                  batchId = existing.batch_id;
                } else throw err;
            } else throw err;
        }
      }

      const key = `${medicine_id}_${batch_number}`;
      const existingItem = existingItems.find(e => e.key === key);

      if (existingItem) {
        await client.query(`
          UPDATE medicine_purchase_detail SET
            quantity = $1, unit_cost = $2, sub_quantity = $3, sub_unit_cost = $4, batch_id = $5
          WHERE id = $6
        `, [quantity, unit_cost, sub_quantity || 0, sub_unit_cost || 0, batchId, existingItem.id]);
      } else {
        await client.query(`
          INSERT INTO medicine_purchase_detail (
            purchase_id, medicine_id, quantity, unit_cost, sub_quantity, sub_unit_cost, batch_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [id, medicine_id, quantity, unit_cost, sub_quantity || 0, sub_unit_cost || 0, batchId]);
      }
    }

    // 5. Audit log
    await client.query(`
      INSERT INTO pos_audit_log (staff_id, action_type, description)
      VALUES ($1, $2, $3)
    `, [
      staffId,
      'PURCHASE_EDITED',
      `Medicine purchase invoice #${invoice_no} (ID: ${id}) edited.`
    ]);

    await client.query('COMMIT');

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Purchase invoice updated successfully'
    });

  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json<ApiResponse>({ success: false, error: error.message }, { status: error.status });
    }
    if (client) await client.query('ROLLBACK');
    console.error('Purchase update error:', error);

    let status = 500;
    let errorMessage = 'Failed to update purchase invoice.';
    if (typeof error?.message === 'string' && error.message.startsWith('BATCH_MISMATCH')) {
        status = 400;
        errorMessage = error.message;
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      error: errorMessage
    }, { status });
  } finally {
    if (client) client.release();
  }
}
