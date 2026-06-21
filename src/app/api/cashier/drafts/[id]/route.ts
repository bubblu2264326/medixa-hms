import { NextRequest, NextResponse } from "next/server";
import pool from "@/database/db";
import { AuthError } from "@/src/lib/server/auth";
import { deriveBillPaymentStatus, getIdempotencyKey, requireCashierOrAdmin } from "@/src/lib/server/cashier";
import { getReceiptDateStamp, getSystemTimezone } from "@/src/lib/server/systemTimezone";

async function resolveStaffId(userCode: string, client: any) {
  const result = await client.query("select staff_id from staff where user_code = $1 limit 1", [userCode]);
  return result.rows[0]?.staff_id ? Number(result.rows[0].staff_id) : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const user = await requireCashierOrAdmin(req);
    const systemTimezone = await getSystemTimezone();
    const idempotencyKey = getIdempotencyKey(req);
    const staffId = await resolveStaffId(user.user_code, client);
    if (!staffId) {
      return NextResponse.json({ error: "Unable to resolve cashier staff id" }, { status: 403 });
    }

    const { id } = await params;
    const draftId = Number(id);
    if (!draftId || draftId <= 0) {
      return NextResponse.json({ error: "Invalid draft id" }, { status: 400 });
    }

    const body = await req.json();
    const action = String(body.action ?? "").toLowerCase();
    if (!["apply", "cancel"].includes(action)) {
      return NextResponse.json({ error: "action must be apply or cancel" }, { status: 400 });
    }

    await client.query("BEGIN");
    const draftResult = await client.query(
      `
        SELECT *
        FROM cashier_settlement_draft
        WHERE cashier_settlement_draft_id = $1
        FOR UPDATE
      `,
      [draftId]
    );
    if (draftResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }
    const draft = draftResult.rows[0];

    // Optional idempotent replay for apply: a retry with the same key returns the
    // original success instead of the "Draft is not open" 409 — checked before
    // the status guard. (The draft FOR UPDATE lock serializes concurrent applies;
    // the draft_status flip is the underlying single-execution guarantee.)
    if (action === "apply" && idempotencyKey) {
      const existingIdem = await client.query(
        `
          SELECT response_json, status_code
          FROM cashier_idempotency
          WHERE idempotency_key = $1 AND endpoint = $2 AND bill_id = $3
          LIMIT 1
        `,
        [idempotencyKey, "/api/cashier/drafts/apply", Number(draft.bill_id)]
      );
      const cached = existingIdem.rows[0];
      if (cached && cached.response_json && typeof cached.response_json === "object") {
        await client.query("COMMIT");
        return NextResponse.json(cached.response_json, { status: Number(cached.status_code ?? 200) });
      }
    }

    if (String(draft.draft_status) !== "open") {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Draft is not open" }, { status: 409 });
    }

    if (action === "cancel") {
      await client.query(
        `
          UPDATE cashier_settlement_draft
          SET draft_status = 'cancelled', updated_at = CURRENT_TIMESTAMP
          WHERE cashier_settlement_draft_id = $1
        `,
        [draftId]
      );
      await client.query(
        `
          INSERT INTO cashier_audit_event (
            event_type, bill_id, visit_id, actor_staff_id, after_json
          ) VALUES ($1, $2, $3, $4, $5::jsonb)
        `,
        [
          "draft_cancelled",
          draft.bill_id,
          draft.visit_id,
          staffId,
          JSON.stringify({ draftId }),
        ]
      );
      await client.query("COMMIT");
      return NextResponse.json({ success: true, action: "cancelled", draftId });
    }

    const billId = Number(draft.bill_id);
    const visitId = draft.visit_id == null ? null : Number(draft.visit_id);
    const amount = Number(draft.amount ?? 0);
    const paymentType = String(draft.payment_type ?? "CASH");
    const paymentReference = draft.payment_reference ?? null;
    const notes = draft.notes ?? null;

    const billResult = await client.query(
      `
        SELECT bill_id, visit_id, total_amount, payment_status
        FROM bill
        WHERE bill_id = $1
        FOR UPDATE
      `,
      [billId]
    );
    if (billResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Bill not found for draft" }, { status: 404 });
    }

    const bill = billResult.rows[0];
    const billTotal = Number(bill.total_amount ?? 0);
    const paidBeforeResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS paid_total FROM cashier_payment_txn WHERE bill_id = $1`,
      [billId]
    );
    const paidBefore = Number(paidBeforeResult.rows[0]?.paid_total ?? 0);
    const outstandingBefore = Math.max(billTotal - paidBefore, 0);
    if (outstandingBefore <= 0 || amount > outstandingBefore) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: `Draft amount invalid for current due. Current due is ${outstandingBefore}` },
        { status: 422 }
      );
    }

    const paymentTxnResult = await client.query(
      `
        INSERT INTO cashier_payment_txn (
          bill_id, visit_id, amount, txn_type, payment_type, payment_reference, notes, received_by
        ) VALUES ($1, $2, $3, 'payment', $4, $5, $6, $7)
        RETURNING cashier_payment_txn_id
      `,
      [billId, visitId, amount, paymentType, paymentReference, notes, staffId]
    );
    const paymentTxnId = Number(paymentTxnResult.rows[0].cashier_payment_txn_id);
    const receiptDate = getReceiptDateStamp(new Date(), systemTimezone);
    const receiptNo = `CPT-${receiptDate}-${paymentTxnId}`;
    await client.query(
      `UPDATE cashier_payment_txn SET receipt_no = $2 WHERE cashier_payment_txn_id = $1`,
      [paymentTxnId, receiptNo]
    );

    const pendingSalesResult = await client.query(
      `
        SELECT bps.bill_pharmacy_sale_id, bps.sale_id, bps.amount, bps.settled_amount, ps.due_amount
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
            cashier_payment_txn_id, sale_id, bill_id, allocated_amount
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
      `SELECT COALESCE(SUM(amount), 0) AS paid_total FROM cashier_payment_txn WHERE bill_id = $1`,
      [billId]
    );
    const paidAfter = Number(paidAfterResult.rows[0]?.paid_total ?? 0);
    const dueAfter = Math.max(billTotal - paidAfter, 0);
    const paymentStatus = deriveBillPaymentStatus(billTotal, paidAfter);
    await client.query(`UPDATE bill SET payment_status = $2 WHERE bill_id = $1`, [billId, paymentStatus]);

    await client.query(
      `
        UPDATE cashier_settlement_draft
        SET
          draft_status = 'applied',
          applied_cashier_payment_txn_id = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE cashier_settlement_draft_id = $1
      `,
      [draftId, paymentTxnId]
    );

    await client.query(
      `
        INSERT INTO cashier_audit_event (
          event_type, bill_id, visit_id, cashier_payment_txn_id, actor_staff_id, after_json
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      `,
      [
        "draft_applied",
        billId,
        visitId,
        paymentTxnId,
        staffId,
        JSON.stringify({ draftId, paymentTxnId, receiptNo, dueAfter, paymentStatus }),
      ]
    );

    const responseBody = {
      success: true,
      action: "applied",
      data: { draftId, paymentTxnId, receiptNo, billId, dueAmount: dueAfter, paymentStatus },
    };

    if (idempotencyKey) {
      await client.query(
        `
          INSERT INTO cashier_idempotency (
            idempotency_key, endpoint, bill_id, request_hash, response_json, status_code, created_by
          ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
        `,
        [idempotencyKey, "/api/cashier/drafts/apply", billId, JSON.stringify({ draftId, action }), JSON.stringify(responseBody), 200, staffId]
      );
    }

    await client.query("COMMIT");
    return NextResponse.json(responseBody);
  } catch (error: any) {
    await client.query("ROLLBACK");
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("cashier draft PATCH error:", error);
    return NextResponse.json({ error: "Failed to update draft" }, { status: 500 });
  } finally {
    client.release();
  }
}
