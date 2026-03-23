import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError } from "@/src/lib/server/auth";
import { requireCashierOrAdmin } from "@/src/lib/server/cashier";

type OutstandingLine = {
  billPharmacySaleId: number;
  saleId: number;
  reference: string | null;
  saleTimestamp: string | null;
  amount: number;
  settledAmount: number;
  remainingAmount: number;
  settlementStatus: string;
};

export async function GET(req: NextRequest) {
  try {
    await requireCashierOrAdmin(req);

    const { searchParams } = new URL(req.url);
    const visitIdParam = searchParams.get("visitId");
    const billIdParam = searchParams.get("billId");

    if (!visitIdParam && !billIdParam) {
      return NextResponse.json({ error: "visitId or billId is required" }, { status: 400 });
    }

    const billResult = billIdParam
      ? await query(
          `
            SELECT bill_id, visit_id, patient_id, total_amount, payment_status
            FROM bill
            WHERE bill_id = $1
            LIMIT 1
          `,
          [Number(billIdParam)]
        )
      : await query(
          `
            SELECT bill_id, visit_id, patient_id, total_amount, payment_status
            FROM bill
            WHERE visit_id = $1
            ORDER BY bill_id DESC
            LIMIT 1
          `,
          [Number(visitIdParam)]
        );

    if (billResult.rows.length === 0) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const bill = billResult.rows[0];
    const billId = Number(bill.bill_id);

    const [paymentsResult, pendingResult] = await Promise.all([
      query(
        `
          SELECT COALESCE(SUM(amount), 0) AS paid_total
          FROM cashier_payment_txn
          WHERE bill_id = $1
        `,
        [billId]
      ),
      query(
        `
          SELECT
            bps.bill_pharmacy_sale_id,
            bps.sale_id,
            bps.amount,
            bps.settled_amount,
            bps.settlement_status,
            ps.payment_reference,
            ps.sale_timestamp
          FROM bill_pharmacy_sale bps
          JOIN pharmacy_sale ps ON ps.sale_id = bps.sale_id
          WHERE bps.bill_id = $1
          ORDER BY bps.created_at ASC, bps.bill_pharmacy_sale_id ASC
        `,
        [billId]
      ),
    ]);

    const paidTotal = Number(paymentsResult.rows[0]?.paid_total ?? 0);
    const billTotal = Number(bill.total_amount ?? 0);
    const dueTotal = Math.max(billTotal - paidTotal, 0);

    const lines: OutstandingLine[] = pendingResult.rows.map((row: any) => {
      const amount = Number(row.amount ?? 0);
      const settledAmount = Number(row.settled_amount ?? 0);
      return {
        billPharmacySaleId: Number(row.bill_pharmacy_sale_id),
        saleId: Number(row.sale_id),
        reference: row.payment_reference ?? null,
        saleTimestamp: row.sale_timestamp ?? null,
        amount,
        settledAmount,
        remainingAmount: Math.max(amount - settledAmount, 0),
        settlementStatus: String(row.settlement_status ?? "pending"),
      };
    });

    return NextResponse.json({
      bill: {
        billId,
        visitId: Number(bill.visit_id ?? 0),
        patientId: Number(bill.patient_id ?? 0),
        totalAmount: billTotal,
        paidAmount: paidTotal,
        dueAmount: dueTotal,
        paymentStatus: String(bill.payment_status ?? "Unpaid"),
      },
      lines,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("cashier outstanding error:", error);
    return NextResponse.json({ error: "Failed to fetch outstanding cashier dues" }, { status: 500 });
  }
}
