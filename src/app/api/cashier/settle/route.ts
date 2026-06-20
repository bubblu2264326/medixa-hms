import { NextRequest, NextResponse } from "next/server";
import pool from "@/database/db";
import { AuthError } from "@/src/lib/server/auth";
import { deriveBillPaymentStatus, requireCashierOrAdmin } from "@/src/lib/server/cashier";
import { logAuditEvent } from "@/src/lib/server/audit";
import { getReceiptDateStamp, getSystemTimezone } from "@/src/lib/server/systemTimezone";
import { enqueueFbrInvoice } from "@/src/lib/server/fbrInvoice";

type SettlePayload = {
  billId?: number;
  visitId?: number;
  amount: number;
  paymentType: "CASH" | "CARD" | "INSURANCE" | "MOBILE" | "SPLIT";
  paymentReference?: string;
  notes?: string;
};

async function resolveStaffId(userCode: string, client: any) {
  const result = await client.query(
    "select staff_id from staff where user_code = $1 limit 1",
    [userCode]
  );
  return result.rows[0]?.staff_id ? Number(result.rows[0].staff_id) : null;
}

function getIdempotencyKey(req: NextRequest) {
  const maybeHeaders = (req as any)?.headers;
  if (maybeHeaders && typeof maybeHeaders.get === "function") {
    return maybeHeaders.get("idempotency-key")?.trim() ?? "";
  }
  return "";
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const user = await requireCashierOrAdmin(req);
    const systemTimezone = await getSystemTimezone();
    const idempotencyKey = getIdempotencyKey(req);
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: "Idempotency-Key header is required" },
        { status: 400 }
      );
    }

    const payload = (await req.json()) as SettlePayload;
    const amount = Number(payload.amount ?? 0);
    if ((!payload.billId && !payload.visitId) || !amount || amount <= 0 || !payload.paymentType) {
      return NextResponse.json(
        { error: "billId/visitId, amount, and paymentType are required" },
        { status: 400 }
      );
    }

    await client.query("BEGIN");
    const staffId = (await resolveStaffId(user.user_code, client)) ?? null;
    if (!staffId) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Unable to resolve cashier staff id" }, { status: 403 });
    }

    const billResult = payload.billId
      ? await client.query(
          `
            SELECT bill_id, visit_id, total_amount, payment_status
            FROM bill
            WHERE bill_id = $1
            FOR UPDATE
          `,
          [Number(payload.billId)]
        )
      : await client.query(
          `
            SELECT bill_id, visit_id, total_amount, payment_status
            FROM bill
            WHERE visit_id = $1
            ORDER BY bill_id DESC
            LIMIT 1
            FOR UPDATE
          `,
          [Number(payload.visitId)]
        );

    if (billResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const bill = billResult.rows[0];
    const billId = Number(bill.bill_id);
    const visitId = bill.visit_id ? Number(bill.visit_id) : null;

    const existingIdempotency = await client.query(
      `
        SELECT response_json, status_code
        FROM cashier_idempotency
        WHERE idempotency_key = $1
          AND endpoint = $2
          AND bill_id = $3
        LIMIT 1
      `,
      [idempotencyKey, "/api/cashier/settle", billId]
    );
    if (
      existingIdempotency.rows.length > 0 &&
      existingIdempotency.rows[0]?.response_json &&
      typeof existingIdempotency.rows[0].response_json === "object"
    ) {
      await client.query("COMMIT");
      const row = existingIdempotency.rows[0];
      return NextResponse.json(row.response_json, { status: Number(row.status_code ?? 200) });
    }

    const billTotal = Number(bill.total_amount ?? 0);
    const paidBeforeResult = await client.query(
      `
        SELECT COALESCE(SUM(amount), 0) AS paid_total
        FROM cashier_payment_txn
        WHERE bill_id = $1
      `,
      [billId]
    );
    const paidBefore = Number(paidBeforeResult.rows[0]?.paid_total ?? 0);
    const outstandingBefore = Math.max(billTotal - paidBefore, 0);
    if (outstandingBefore <= 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Bill has no outstanding due" }, { status: 409 });
    }
    if (amount > outstandingBefore) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: `Overpayment blocked. Remaining due is ${outstandingBefore}` },
        { status: 422 }
      );
    }

    const paymentTxnResult = await client.query(
      `
        INSERT INTO cashier_payment_txn (
          bill_id,
          visit_id,
          amount,
          txn_type,
          payment_type,
          payment_reference,
          notes,
          received_by
        ) VALUES ($1, $2, $3, 'payment', $4, $5, $6, $7)
        RETURNING cashier_payment_txn_id, created_at
      `,
      [
        billId,
        visitId,
        amount,
        payload.paymentType,
        payload.paymentReference ?? null,
        payload.notes ?? null,
        staffId,
      ]
    );
    const paymentTxnId = Number(paymentTxnResult.rows[0].cashier_payment_txn_id);
    const receiptDate = getReceiptDateStamp(new Date(), systemTimezone);
    const receiptNo = `CPT-${receiptDate}-${paymentTxnId}`;
    await client.query(
      `
        UPDATE cashier_payment_txn
        SET receipt_no = $2
        WHERE cashier_payment_txn_id = $1
      `,
      [paymentTxnId, receiptNo]
    );

    const pendingSalesResult = await client.query(
      `
        SELECT
          bps.bill_pharmacy_sale_id,
          bps.sale_id,
          bps.amount,
          bps.settled_amount,
          ps.due_amount
        FROM bill_pharmacy_sale bps
        JOIN pharmacy_sale ps ON ps.sale_id = bps.sale_id
        WHERE bps.bill_id = $1
        ORDER BY bps.created_at ASC, bps.bill_pharmacy_sale_id ASC
      `,
      [billId]
    );

    let remaining = amount;
    for (const row of pendingSalesResult.rows) {
      if (remaining <= 0) break;

      const saleId = Number(row.sale_id);
      const mappingAmount = Number(row.amount ?? 0);
      const settledAmount = Number(row.settled_amount ?? 0);
      const mappingOpen = Math.max(mappingAmount - settledAmount, 0);
      if (mappingOpen <= 0) continue;

      const saleDue = Math.max(Number(row.due_amount ?? 0), 0);
      const allocatable = Math.min(remaining, mappingOpen, saleDue || mappingOpen);
      if (allocatable <= 0) continue;

      await client.query(
        `
          INSERT INTO cashier_payment_allocation (
            cashier_payment_txn_id,
            sale_id,
            bill_id,
            allocated_amount
          ) VALUES ($1, $2, $3, $4)
        `,
        [paymentTxnId, saleId, billId, allocatable]
      );

      const newSettled = settledAmount + allocatable;
      const isMappingSettled = newSettled >= mappingAmount;
      await client.query(
        `
          UPDATE bill_pharmacy_sale
          SET
            settled_amount = $2,
            settlement_status = $3,
            settled_by = CASE WHEN $3 = 'settled' THEN $4 ELSE settled_by END,
            settled_at = CASE WHEN $3 = 'settled' THEN CURRENT_TIMESTAMP ELSE settled_at END,
            updated_at = CURRENT_TIMESTAMP
          WHERE bill_pharmacy_sale_id = $1
        `,
        [Number(row.bill_pharmacy_sale_id), newSettled, isMappingSettled ? "settled" : "pending", staffId]
      );

      await client.query(
        `
          UPDATE pharmacy_sale
          SET
            paid_amount = COALESCE(paid_amount, 0) + $2,
            due_amount = GREATEST(COALESCE(due_amount, 0) - $2, 0),
            settlement_channel = 'cashier',
            settlement_status = CASE WHEN GREATEST(COALESCE(due_amount, 0) - $2, 0) = 0 THEN 'settled' ELSE 'pending' END,
            settled_at = CASE WHEN GREATEST(COALESCE(due_amount, 0) - $2, 0) = 0 THEN CURRENT_TIMESTAMP ELSE settled_at END,
            settled_by = CASE WHEN GREATEST(COALESCE(due_amount, 0) - $2, 0) = 0 THEN $3 ELSE settled_by END
          WHERE sale_id = $1
        `,
        [saleId, allocatable, staffId]
      );

      remaining -= allocatable;
    }

    const paidAfterResult = await client.query(
      `
        SELECT COALESCE(SUM(amount), 0) AS paid_total
        FROM cashier_payment_txn
        WHERE bill_id = $1
      `,
      [billId]
    );
    const paidAfter = Number(paidAfterResult.rows[0]?.paid_total ?? 0);
    const dueAfter = Math.max(billTotal - paidAfter, 0);
    const paymentStatus = deriveBillPaymentStatus(billTotal, paidAfter);

    await client.query(
      `
        UPDATE bill
        SET payment_status = $2
        WHERE bill_id = $1
      `,
      [billId, paymentStatus]
    );

    if (dueAfter <= 0 && visitId) {
      try {
        await client.query(`CALL update_and_log_visit_status($1, $2, $3, $4)`, [
          visitId,
          "payment_done",
          null,
          staffId,
        ]);
      } catch (error) {
        console.warn("Unable to auto-transition visit to payment_done", { visitId, error });
      }
    }

    // FBR e-invoicing: once the bill is fully paid, queue it for PRAL submission
    // (best-effort, idempotent — a pluggable worker delivers it; never fails settle).
    if (dueAfter <= 0) {
      try {
        await enqueueFbrInvoice(client, billId);
      } catch (error) {
        console.warn("FBR enqueue failed", { billId, error });
      }
    }

    const responseBody = {
      success: true,
      data: {
        cashierPaymentTxnId: paymentTxnId,
        receiptNo,
        billId,
        visitId,
        paymentStatus,
        totalAmount: billTotal,
        paidAmount: paidAfter,
        dueAmount: dueAfter,
      },
    };

    await client.query(
      `
        INSERT INTO cashier_idempotency (
          idempotency_key,
          endpoint,
          bill_id,
          request_hash,
          response_json,
          status_code,
          created_by
        ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
      `,
      [
        idempotencyKey,
        "/api/cashier/settle",
        billId,
        JSON.stringify(payload),
        JSON.stringify(responseBody),
        200,
        staffId,
      ]
    );

    await client.query(
      `
        INSERT INTO cashier_audit_event (
          event_type,
          bill_id,
          visit_id,
          cashier_payment_txn_id,
          actor_staff_id,
          before_json,
          after_json
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
      `,
      [
        "settle_success",
        billId,
        visitId,
        paymentTxnId,
        staffId,
        JSON.stringify({ paidBefore, dueBefore: outstandingBefore }),
        JSON.stringify({ paidAfter, dueAfter, paymentStatus, receiptNo }),
      ]
    );

    await logAuditEvent(
      {
        actorStaffId: staffId,
        action: "Cashier payment settled",
        entityType: "cashier_payment_txn",
        entityId: paymentTxnId,
        details: {
          billId,
          visitId,
          receiptNo,
          amount,
          paymentType: payload.paymentType,
          paidAfter,
          dueAfter,
          paymentStatus,
        },
      },
      client
    );

    await client.query("COMMIT");
    return NextResponse.json(responseBody);
  } catch (error: any) {
    await client.query("ROLLBACK");
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("cashier settle error:", error);
    return NextResponse.json({ error: "Failed to settle cashier payment" }, { status: 500 });
  } finally {
    client.release();
  }
}
