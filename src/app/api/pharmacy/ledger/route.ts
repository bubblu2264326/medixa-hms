import { NextRequest, NextResponse } from 'next/server';
import pool from '@/database/db';
import { getCurrentStaffId } from '@/src/lib/utils';
import { getAuthenticatedUser } from '@/src/lib/server/auth';

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);
        if (user.role === 'Pharmacist') {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }
    } catch {
        return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const partyId = searchParams.get('party_id');

    // If no party_id — return global ledger across all parties
    if (!partyId) {
        try {
            const purchases = await pool.query(
                `SELECT mp.purchase_id as id, 'Purchase' as type, pt.name as party_name,
                        mp.party_id, mp.invoice_no as reference,
                        mp.invoice_timestamp as date, mp.total_amount as debit, 0 as credit
                 FROM medicine_purchase mp
                 JOIN party pt ON pt.party_id = mp.party_id
                 ORDER BY mp.invoice_timestamp DESC`
            );
            const returns = await pool.query(
                `SELECT r.return_id as id, 'Return' as type, pt.name as party_name,
                        mp.party_id, mp.invoice_no as reference,
                        r.return_timestamp as date, 0 as debit,
                        (SELECT COALESCE(SUM(rd.returned_unit_price * rd.quantity + rd.returned_sub_unit_price * rd.sub_quantity), 0)
                         FROM purchase_return_detail rd WHERE rd.return_id = r.return_id) as credit
                 FROM purchase_return r
                 JOIN medicine_purchase mp ON r.purchase_id = mp.purchase_id
                 JOIN party pt ON pt.party_id = mp.party_id
                 ORDER BY r.return_timestamp DESC`
            );
            const payments = await pool.query(
                `SELECT pp.payment_id as id, 'Payment' as type, pt.name as party_name,
                        pp.party_id, pp.reference_note as reference,
                        pp.payment_date as date, 0 as debit, pp.amount as credit
                 FROM party_payment pp
                 JOIN party pt ON pt.party_id = pp.party_id
                 ORDER BY pp.payment_date DESC`
            );

            const ledger = [...purchases.rows, ...returns.rows, ...payments.rows]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            return NextResponse.json({ success: true, data: ledger });
        } catch (error) {
            console.error('Global ledger fetch error:', error);
            return NextResponse.json({ success: false, error: 'Failed to fetch ledger' }, { status: 500 });
        }
    }

    try {
        // Fetch Purchases, Returns, and Payments for this party
        const purchases = await pool.query(
            `SELECT purchase_id as id, 'Purchase' as type, invoice_no as reference, 
                    invoice_timestamp as date, total_amount as debit, 0 as credit
             FROM medicine_purchase 
             WHERE party_id = $1`,
            [partyId]
        );

        const returns = await pool.query(
            `SELECT r.return_id as id, 'Return' as type, p.invoice_no as reference, 
                    r.return_timestamp as date, 0 as debit, 
                    (SELECT SUM(returned_unit_price * quantity + returned_sub_unit_price * sub_quantity) 
                     FROM purchase_return_detail rd WHERE rd.return_id = r.return_id) as credit
             FROM purchase_return r
             JOIN medicine_purchase p ON r.purchase_id = p.purchase_id
             WHERE p.party_id = $1`,
            [partyId]
        );

        const payments = await pool.query(
            `SELECT payment_id as id, 'Payment' as type, reference_note as reference, 
                    payment_date as date, 0 as debit, amount as credit
             FROM party_payment 
             WHERE party_id = $1`,
            [partyId]
        );

        // Combine and sort by date
        const ledger = [...purchases.rows, ...returns.rows, ...payments.rows]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return NextResponse.json({ success: true, data: ledger });
    } catch (error) {
        console.error('Ledger fetch error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch ledger' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);
        if (user.role === 'Pharmacist') {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }
    } catch {
        return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { party_id, amount, payment_method, reference_note } = body;

        if (!party_id || !amount) {
            return NextResponse.json({ success: false, error: 'party_id and amount are required' }, { status: 400 });
        }

        const staffId = getCurrentStaffId();

        const result = await pool.query(
            `INSERT INTO party_payment (party_id, amount, payment_method, reference_note, created_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [party_id, amount, payment_method, reference_note, staffId]
        );

        return NextResponse.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Payment creation error:', error);
        return NextResponse.json({ success: false, error: 'Failed to record payment' }, { status: 500 });
    }
}
