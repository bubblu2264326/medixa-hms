import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError } from "@/src/lib/server/auth";
import { requireCashierOrAdmin } from "@/src/lib/server/cashier";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cashierPaymentTxnId: string }> }
) {
  try {
    await requireCashierOrAdmin(req);
    const { cashierPaymentTxnId } = await params;
    const numericId = Number(cashierPaymentTxnId);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return NextResponse.json({ error: "Invalid cashier payment transaction id" }, { status: 400 });
    }

    const headerResult = await query(
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
          cpt.notes,
          cpt.created_at,
          p.patient_name,
          p.contact_number,
          s.name AS cashier_name
        FROM cashier_payment_txn cpt
        JOIN bill b ON b.bill_id = cpt.bill_id
        JOIN patient p ON p.patient_id = b.patient_id
        LEFT JOIN staff s ON s.staff_id = cpt.received_by
        WHERE cpt.cashier_payment_txn_id = $1
        LIMIT 1
      `,
      [numericId]
    );

    if (headerResult.rows.length === 0) {
      return NextResponse.json({ error: "Cashier receipt not found" }, { status: 404 });
    }

    const row = headerResult.rows[0];
    return NextResponse.json({
      receipt: {
        cashierPaymentTxnId: Number(row.cashier_payment_txn_id),
        billId: Number(row.bill_id ?? 0),
        visitId: Number(row.visit_id ?? 0),
        amount: Number(row.amount ?? 0),
        txnType: String(row.txn_type ?? "payment"),
        paymentType: String(row.payment_type ?? "CASH"),
        paymentReference: row.payment_reference ?? null,
        receiptNo: row.receipt_no ?? null,
        notes: row.notes ?? null,
        createdAt: row.created_at ?? null,
        patientName: row.patient_name ?? "",
        patientContact: row.contact_number ?? null,
        cashierName: row.cashier_name ?? null,
      },
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("cashier receipt route error:", error);
    return NextResponse.json({ error: "Failed to load cashier receipt" }, { status: 500 });
  }
}

