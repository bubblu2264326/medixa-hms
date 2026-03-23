import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError } from "@/src/lib/server/auth";
import { requireCashierOrAdmin } from "@/src/lib/server/cashier";

export async function GET(req: NextRequest) {
  try {
    await requireCashierOrAdmin(req);
    const { searchParams } = new URL(req.url);

    const billId = searchParams.get("billId");
    const cashierId = searchParams.get("cashierId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const patient = searchParams.get("patient");
    const reference = searchParams.get("reference");
    const txnType = searchParams.get("txnType");
    const page = Math.max(Number(searchParams.get("page") || "1"), 1);
    const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize") || "50"), 1), 200);
    const offset = (page - 1) * pageSize;

    const result = await query(
      `
        SELECT
          cpt.cashier_payment_txn_id,
          cpt.bill_id,
          cpt.visit_id,
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
          s.staff_id AS cashier_id,
          s.name AS cashier_name,
          p.patient_name,
          p.contact_number
        FROM cashier_payment_txn cpt
        JOIN bill b ON b.bill_id = cpt.bill_id
        JOIN patient p ON p.patient_id = b.patient_id
        LEFT JOIN staff s ON s.staff_id = cpt.received_by
        WHERE ($1::int IS NULL OR cpt.bill_id = $1::int)
          AND ($2::int IS NULL OR cpt.received_by = $2::int)
          AND ($3::date IS NULL OR cpt.created_at::date >= $3::date)
          AND ($4::date IS NULL OR cpt.created_at::date <= $4::date)
          AND ($5::text IS NULL OR p.patient_name ILIKE ('%' || $5::text || '%'))
          AND ($6::text IS NULL OR cpt.payment_reference ILIKE ('%' || $6::text || '%'))
          AND ($7::text IS NULL OR cpt.txn_type = $7::text)
        ORDER BY cpt.created_at DESC, cpt.cashier_payment_txn_id DESC
        LIMIT $8 OFFSET $9
      `,
      [
        billId ? Number(billId) : null,
        cashierId ? Number(cashierId) : null,
        from || null,
        to || null,
        patient || null,
        reference || null,
        txnType || null,
        pageSize,
        offset,
      ]
    );

    return NextResponse.json({
      page,
      pageSize,
      items: result.rows.map((row) => ({
        cashierPaymentTxnId: Number(row.cashier_payment_txn_id),
        billId: Number(row.bill_id ?? 0),
        visitId: Number(row.visit_id ?? 0),
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
        cashierId: row.cashier_id == null ? null : Number(row.cashier_id),
        cashierName: row.cashier_name ?? null,
        patientName: row.patient_name ?? null,
        phone: row.contact_number ?? null,
      })),
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("cashier history route error:", error);
    return NextResponse.json({ error: "Failed to load cashier history" }, { status: 500 });
  }
}
