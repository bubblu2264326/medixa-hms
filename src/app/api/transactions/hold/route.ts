import { NextRequest, NextResponse } from 'next/server';
import pool from '@/database/db';
import { ApiResponse, Transaction } from '@/src/lib/types';
import { getCurrentStaffId } from '@/src/lib/utils';

const NOTE_TAG_REGEX = /\[([A-Z_]+):([^\]]*)\]/g;

async function hasColumn(client: any, columnName: string) {
  const res = await client.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'pos_held_transaction'
        AND column_name = $1
      LIMIT 1
    `,
    [columnName]
  );
  return (res?.rowCount || 0) > 0;
}

function parseNoteTags(notes: string | null | undefined): Record<string, string> {
  if (!notes) return {};

  const tags: Record<string, string> = {};
  for (const match of notes.matchAll(NOTE_TAG_REGEX)) {
    const key = String(match[1] || '').toUpperCase();
    const rawValue = String(match[2] || '');
    try {
      tags[key] = decodeURIComponent(rawValue);
    } catch {
      tags[key] = rawValue;
    }
  }
  return tags;
}

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function buildHoldNotes(transaction: Transaction, holdMode: 'SALE' | 'RETURN') {
  const tags: Array<[string, string | number]> = [['MODE', holdMode]];

  const pushNumericTag = (key: string, value: unknown) => {
    const numeric = toNullableNumber(value);
    if (numeric !== null) tags.push([key, numeric]);
  };

  pushNumericTag('PATIENT_ID', transaction.patientId);
  pushNumericTag('VISIT_ID', transaction.visitId);
  pushNumericTag('PRESCRIPTION_ID', transaction.prescriptionId);
  pushNumericTag('BILL_ID', transaction.billId);
  pushNumericTag('CUSTOMER_ID', transaction.customerId);

  if (transaction.customer?.name?.trim()) {
    tags.push(['CUSTOMER_NAME', transaction.customer.name.trim()]);
  }

  if (transaction.customer?.phone?.trim()) {
    tags.push(['CUSTOMER_PHONE', transaction.customer.phone.trim()]);
  }

  const serializedTags = tags
    .map(([key, value]) => `[${key}:${encodeURIComponent(String(value))}]`)
    .join(' ');

  return `${serializedTags} Held by ${transaction.cashier}`;
}

function parseHoldModeFromNotes(notes: string | null | undefined): 'SALE' | 'RETURN' {
  if (!notes) return 'SALE';
  const tags = parseNoteTags(notes);
  if (tags.MODE?.toUpperCase() === 'RETURN') return 'RETURN';
  const match = notes.match(/\[MODE:(SALE|RETURN)\]/i);
  if (match?.[1]?.toUpperCase() === 'RETURN') return 'RETURN';
  return 'SALE';
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const transaction: Transaction = await request.json();

    if (!transaction.items || transaction.items.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Transaction must contain at least one item'
      }, { status: 400 });
    }

    await client.query('BEGIN');

    const staffId = getCurrentStaffId();
    const holdMode: 'SALE' | 'RETURN' = transaction.mode === 'RETURN' ? 'RETURN' : 'SALE';
    const notes = buildHoldNotes(transaction, holdMode);

    const supportsModeColumn = await hasColumn(client, 'mode');

    // Insert held transaction
    const holdResult = supportsModeColumn
      ? await client.query(
          `
            INSERT INTO pos_held_transaction (
              staff_id,
              customer_name,
              customer_phone,
              total_amount,
              status,
              notes,
              mode
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING hold_id
          `,
          [
            staffId,
            transaction.customer?.name || null,
            transaction.customer?.phone || null,
            transaction.payment.payableAmount,
            'held',
            notes,
            holdMode,
          ]
        )
      : await client.query(
          `
            INSERT INTO pos_held_transaction (
              staff_id,
              customer_name,
              customer_phone,
              total_amount,
              status,
              notes
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING hold_id
          `,
          [
            staffId,
            transaction.customer?.name || null,
            transaction.customer?.phone || null,
            transaction.payment.payableAmount,
            'held',
            notes,
          ]
        );

    const holdId = holdResult.rows[0].hold_id;

    // Insert held transaction details
    for (const item of transaction.items) {
      await client.query(`
        INSERT INTO pos_held_transaction_detail (
          hold_id,
          medicine_id,
          qty,
          sub_qty,
          unit_price,
          discount_percent,
          line_total
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        holdId,
        item.medicine.id,
        item.quantity,
        item.subQuantity,
        item.price,
        item.discountPercent,
        item.lineTotal
      ]);
    }

    await client.query('COMMIT');

    return NextResponse.json<ApiResponse<{ holdId: string }>>({
      success: true,
      data: { holdId: holdId.toString() },
      message: 'Transaction held successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Hold transaction error:', error);

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to hold transaction'
    }, { status: 500 });

  } finally {
    client.release();
  }
}

export async function GET() {
  try {
    const staffId = getCurrentStaffId();
    const client = await pool.connect();
    const supportsModeColumn = await hasColumn(client, 'mode');
    const result = await client.query(`
      SELECT 
        ht.*,
        json_agg(
          json_build_object(
            'medicine_id', htd.medicine_id,
            'qty', htd.qty,
            'sub_qty', htd.sub_qty,
            'unit_price', htd.unit_price,
            'discount_percent', htd.discount_percent,
            'line_total', htd.line_total,
            'medicine', m.*
          )
        ) as items
      FROM pos_held_transaction ht
      LEFT JOIN pos_held_transaction_detail htd ON ht.hold_id = htd.hold_id
      LEFT JOIN medicine m ON htd.medicine_id = m.medicine_id
      WHERE ht.staff_id = $1 AND ht.status = 'held'
      GROUP BY ht.hold_id
      ORDER BY ht.hold_timestamp DESC
    `, [staffId]);

    const mappedTransactions: Transaction[] = result.rows.map(row => {
      const tags = parseNoteTags(row.notes);
      const modeFromRow =
        supportsModeColumn && row.mode && String(row.mode).toUpperCase() === 'RETURN'
          ? 'RETURN'
          : parseHoldModeFromNotes(row.notes);
      const patientId = toNullableNumber(tags.PATIENT_ID);
      const visitId = toNullableNumber(tags.VISIT_ID);
      const prescriptionId = toNullableNumber(tags.PRESCRIPTION_ID);
      const billId = toNullableNumber(tags.BILL_ID);
      const customerIdFromTag = toNullableNumber(tags.CUSTOMER_ID);
      const customerId = customerIdFromTag ?? patientId;
      const customerName = tags.CUSTOMER_NAME || row.customer_name || null;
      const customerPhone = tags.CUSTOMER_PHONE || row.customer_phone || null;
      // Map items safely, avoiding null issues if there are no items
      const items = row.items ? row.items.filter((i: any) => i !== null).map((item: any) => ({
        id: item.medicine_id?.toString() || Math.random().toString(),
        medicine: item.medicine,
        quantity: item.qty || 0,
        subQuantity: item.sub_qty || 0,
        price: item.unit_price || 0,
        discountedPrice: item.unit_price * (1 - (item.discount_percent || 0) / 100),
        discountPercent: item.discount_percent || 0,
        lineTotal: item.line_total || 0,
      })) : [];

      return {
        id: row.hold_id?.toString() || '',
        reference: row.reference_no || `HOLD-${row.hold_id}`,
        items,
        payment: {
          type: 'CASH' as any,
          payableAmount: parseFloat(row.total_amount || '0'),
          paidAmount: 0,
          dueAmount: parseFloat(row.total_amount || '0'),
          changeAmount: 0,
          adjustment: 0,
          adjustmentPercent: 0,
          itemsDiscount: 0,
          totalDiscount: 0
        },
        timestamp: new Date(row.hold_timestamp),
        cashier: row.staff_id?.toString() || 'Unknown',
        customer: customerName || customerPhone || customerId
          ? {
              id: customerId ? `customer-${customerId}` : 'walk-in',
              name: customerName || (customerId ? `Patient #${customerId}` : 'Walk-in Customer'),
              phone: customerPhone || undefined
            }
          : undefined,
        customerId: customerId ?? undefined,
        status: 'held',
        mode: modeFromRow,
        patientId: patientId ?? null,
        visitId: visitId ?? undefined,
        prescriptionId: prescriptionId ?? undefined,
        billId: billId ?? undefined,
      };
    });

    return NextResponse.json<ApiResponse<Transaction[]>>({
      success: true,
      data: mappedTransactions
    });

  } catch (error) {
    console.error('Get held transactions error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to fetch held transactions'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const client = await pool.connect();

  try {
    const holdIdParam = request.nextUrl.searchParams.get('holdId');
    const holdId = Number(holdIdParam);
    if (!Number.isFinite(holdId) || holdId <= 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'A valid holdId is required'
      }, { status: 400 });
    }

    const staffId = getCurrentStaffId();
    await client.query('BEGIN');

    const deleteResult = await client.query(
      `
        UPDATE pos_held_transaction
        SET status = 'cancelled',
            retrieved_timestamp = CURRENT_TIMESTAMP
        WHERE hold_id = $1
          AND staff_id = $2
          AND status = 'held'
        RETURNING hold_id
      `,
      [holdId, staffId]
    );

    if (!deleteResult.rowCount) {
      await client.query('ROLLBACK');
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Held transaction not found'
      }, { status: 404 });
    }

    await client.query('COMMIT');
    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Held transaction deleted successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete held transaction error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to delete held transaction'
    }, { status: 500 });
  } finally {
    client.release();
  }
}
