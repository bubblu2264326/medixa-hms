import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError } from "@/src/lib/server/auth";
import { requireCashierOrAdmin } from "@/src/lib/server/cashier";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    await requireCashierOrAdmin(req);
    const { billId } = await params;
    const numericBillId = Number(billId);
    if (!Number.isFinite(numericBillId) || numericBillId <= 0) {
      return NextResponse.json({ error: "Invalid billId" }, { status: 400 });
    }

    const [billResult, sourceLinesResult, paymentHistoryResult] = await Promise.all([
      query(
        `
          SELECT
            b.bill_id,
            b.visit_id,
            b.patient_id,
            b.total_amount,
            b.payment_status,
            p.patient_name,
            p.contact_number
          FROM bill b
          JOIN patient p ON p.patient_id = b.patient_id
          WHERE b.bill_id = $1
          LIMIT 1
        `,
        [numericBillId]
      ),
      query(
        `
          SELECT
            bcs.bill_charge_source_id,
            bcs.source_type,
            bcs.source_id,
            bcs.amount,
            bcs.meta_json,
            bi.item_id AS bill_item_id,
            bi.description AS bill_item_description
          FROM bill_charge_source bcs
          LEFT JOIN bill_item bi ON bi.item_id = bcs.bill_item_id
          WHERE bcs.bill_id = $1
          ORDER BY bcs.created_at ASC, bcs.bill_charge_source_id ASC
        `,
        [numericBillId]
      ),
      query(
        `
          SELECT
            cpt.cashier_payment_txn_id,
            cpt.amount,
            cpt.txn_type,
            cpt.payment_type,
            cpt.payment_reference,
            cpt.receipt_no,
            cpt.reversed_from_txn_id,
            cpt.reversal_reason_code,
            cpt.reversal_reason_note,
            cpt.notes,
            cpt.created_at,
            s.name AS received_by_name
          FROM cashier_payment_txn cpt
          LEFT JOIN staff s ON s.staff_id = cpt.received_by
          WHERE cpt.bill_id = $1
          ORDER BY cpt.created_at DESC, cpt.cashier_payment_txn_id DESC
        `,
        [numericBillId]
      ),
    ]);

    if (billResult.rows.length === 0) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const bill = billResult.rows[0];
    const total = Number(bill.total_amount ?? 0);
    const paid = paymentHistoryResult.rows.reduce((acc, row) => acc + Number(row.amount ?? 0), 0);
    const due = Math.max(total - paid, 0);

    return NextResponse.json({
      bill: {
        billId: Number(bill.bill_id),
        visitId: Number(bill.visit_id ?? 0),
        patientId: Number(bill.patient_id ?? 0),
        patientName: String(bill.patient_name ?? ""),
        contactNumber: bill.contact_number ?? null,
        totalAmount: total,
        paidAmount: paid,
        dueAmount: due,
        paymentStatus: String(bill.payment_status ?? "Unpaid"),
      },
      sourceLines: sourceLinesResult.rows.map((row) => ({
        billChargeSourceId: Number(row.bill_charge_source_id),
        sourceType: String(row.source_type ?? "other"),
        sourceId: row.source_id == null ? null : Number(row.source_id),
        amount: Number(row.amount ?? 0),
        billItemId: row.bill_item_id == null ? null : Number(row.bill_item_id),
        description: row.bill_item_description ?? null,
        meta: row.meta_json ?? null,
      })),
      paymentHistory: paymentHistoryResult.rows.map((row) => ({
        cashierPaymentTxnId: Number(row.cashier_payment_txn_id),
        amount: Number(row.amount ?? 0),
        txnType: String(row.txn_type ?? "payment"),
        paymentType: String(row.payment_type ?? "CASH"),
        paymentReference: row.payment_reference ?? null,
        receiptNo: row.receipt_no ?? null,
        reversedFromTxnId: row.reversed_from_txn_id == null ? null : Number(row.reversed_from_txn_id),
        reversalReasonCode: row.reversal_reason_code ?? null,
        reversalReasonNote: row.reversal_reason_note ?? null,
        notes: row.notes ?? null,
        createdAt: row.created_at ?? null,
        receivedByName: row.received_by_name ?? null,
      })),
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("cashier bill route error:", error);
    return NextResponse.json({ error: "Failed to load bill detail" }, { status: 500 });
  }
}

