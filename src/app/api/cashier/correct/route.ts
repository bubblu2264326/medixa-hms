import { NextRequest, NextResponse } from "next/server";
import pool from "@/database/db";
import { AuthError } from "@/src/lib/server/auth";
import { deriveBillPaymentStatus, getIdempotencyKey, requireCashierAdminOnlyForReversal } from "@/src/lib/server/cashier";
import { getReceiptDateStamp, getSystemTimezone } from "@/src/lib/server/systemTimezone";

type CorrectPayload = {
  cashierPaymentTxnId?: number;
  reasonCode?: string;
  reasonNote?: string;
  replacementAmount?: number;
  replacementPaymentType?: "CASH" | "CARD" | "INSURANCE" | "MOBILE" | "SPLIT";
  replacementReference?: string;
  replacementNotes?: string;
  // H2: explicit admin acknowledgement that the correction may reopen a
  // completed/discharged visit (when the replacement no longer fully pays the
  // bill). Without it, such a correction is refused.
  allowTerminalReopen?: boolean;
};

async function resolveStaffId(userCode: string, client: any) {
  const result = await client.query("select staff_id from staff where user_code = $1 limit 1", [userCode]);
  return result.rows[0]?.staff_id ? Number(result.rows[0].staff_id) : null;
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const user = await requireCashierAdminOnlyForReversal(req);
    const systemTimezone = await getSystemTimezone();
    const idempotencyKey = getIdempotencyKey(req);
    const body = (await req.json()) as CorrectPayload;

    const targetTxnId = Number(body.cashierPaymentTxnId ?? 0);
    const reasonCode = String(body.reasonCode ?? "").trim();
    const reasonNote = String(body.reasonNote ?? "").trim();
    const replacementAmount = Number(body.replacementAmount ?? 0);
    const replacementPaymentType = String(body.replacementPaymentType ?? "CASH").toUpperCase();
    const replacementReference = body.replacementReference ? String(body.replacementReference) : null;
    const replacementNotes = body.replacementNotes ? String(body.replacementNotes) : null;
    const allowTerminalReopen = body.allowTerminalReopen === true;

    if (!targetTxnId || !reasonCode || !replacementAmount || replacementAmount <= 0) {
      return NextResponse.json(
        { error: "cashierPaymentTxnId, reasonCode, and replacementAmount are required" },
        { status: 400 }
      );
    }

    await client.query("BEGIN");
    const staffId = await resolveStaffId(user.user_code, client);
    if (!staffId) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Unable to resolve admin staff id" }, { status: 403 });
    }

    const originalTxnResult = await client.query(
      `
        SELECT *
        FROM cashier_payment_txn
        WHERE cashier_payment_txn_id = $1
        FOR UPDATE
      `,
      [targetTxnId]
    );
    if (originalTxnResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Cashier transaction not found" }, { status: 404 });
    }
    const original = originalTxnResult.rows[0];
    if (String(original.txn_type) !== "payment") {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Only payment transactions can be corrected" }, { status: 409 });
    }

    // Optional idempotent replay: a retry with the same Idempotency-Key returns
    // the original success response instead of the confusing "already reversed"
    // 409. Checked before the existingReversal guard for exactly that reason.
    // (Concurrency is serialized by the FOR UPDATE lock on the original txn.)
    if (idempotencyKey) {
      const existingIdem = await client.query(
        `
          SELECT response_json, status_code
          FROM cashier_idempotency
          WHERE idempotency_key = $1 AND endpoint = $2 AND bill_id = $3
          LIMIT 1
        `,
        [idempotencyKey, "/api/cashier/correct", Number(original.bill_id)]
      );
      const cached = existingIdem.rows[0];
      if (cached && cached.response_json && typeof cached.response_json === "object") {
        await client.query("COMMIT");
        return NextResponse.json(cached.response_json, { status: Number(cached.status_code ?? 200) });
      }
    }

    const existingReversal = await client.query(
      `
        SELECT cashier_payment_txn_id
        FROM cashier_payment_txn
        WHERE reversed_from_txn_id = $1
          AND txn_type = 'reversal'
        LIMIT 1
      `,
      [targetTxnId]
    );
    if (existingReversal.rows.length > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Transaction already reversed/corrected" }, { status: 409 });
    }

    const billId = Number(original.bill_id);
    const visitId = original.visit_id == null ? null : Number(original.visit_id);
    const originalAmount = Number(original.amount ?? 0);

    await client.query(
      `SELECT bill_id, total_amount FROM bill WHERE bill_id = $1 FOR UPDATE`,
      [billId]
    );

    const reversalTxnResult = await client.query(
      `
        INSERT INTO cashier_payment_txn (
          bill_id,
          visit_id,
          amount,
          txn_type,
          reversed_from_txn_id,
          reversal_reason_code,
          reversal_reason_note,
          payment_type,
          payment_reference,
          notes,
          received_by
        ) VALUES (
          $1,$2,$3,'reversal',$4,$5,$6,'CASH',$7,$8,$9
        )
        RETURNING cashier_payment_txn_id
      `,
      [
        billId,
        visitId,
        -Math.abs(originalAmount),
        targetTxnId,
        reasonCode,
        reasonNote || null,
        `REV-${targetTxnId}`,
        `Correction reversal for txn #${targetTxnId}`,
        staffId,
      ]
    );
    const reversalTxnId = Number(reversalTxnResult.rows[0].cashier_payment_txn_id);
    const receiptDate = getReceiptDateStamp(new Date(), systemTimezone);
    const reversalReceiptNo = `CRV-${receiptDate}-${reversalTxnId}`;
    await client.query(
      `UPDATE cashier_payment_txn SET receipt_no = $2 WHERE cashier_payment_txn_id = $1`,
      [reversalTxnId, reversalReceiptNo]
    );

    const allocationResult = await client.query(
      `
        SELECT sale_id, allocated_amount
        FROM cashier_payment_allocation
        WHERE cashier_payment_txn_id = $1
      `,
      [targetTxnId]
    );

    for (const alloc of allocationResult.rows) {
      const saleId = Number(alloc.sale_id);
      const allocatedAmount = Number(alloc.allocated_amount ?? 0);
      if (allocatedAmount <= 0) continue;

      await client.query(
        `
          UPDATE bill_pharmacy_sale
          SET
            settled_amount = GREATEST(COALESCE(settled_amount, 0) - $2, 0),
            settlement_status = CASE
              WHEN GREATEST(COALESCE(settled_amount, 0) - $2, 0) <= 0 THEN 'pending'
              ELSE settlement_status
            END,
            settled_at = CASE WHEN GREATEST(COALESCE(settled_amount, 0) - $2, 0) <= 0 THEN NULL ELSE settled_at END,
            settled_by = CASE WHEN GREATEST(COALESCE(settled_amount, 0) - $2, 0) <= 0 THEN NULL ELSE settled_by END,
            updated_at = CURRENT_TIMESTAMP
          WHERE bill_id = $1 AND sale_id = $3
        `,
        [billId, allocatedAmount, saleId]
      );

      await client.query(
        `
          UPDATE pharmacy_sale
          SET
            paid_amount = GREATEST(COALESCE(paid_amount, 0) - $2, 0),
            due_amount = GREATEST(COALESCE(due_amount, 0) + $2, 0),
            settlement_status = CASE
              WHEN GREATEST(COALESCE(due_amount, 0) + $2, 0) <= 0 THEN 'settled'
              ELSE 'pending'
            END,
            settled_at = CASE
              WHEN GREATEST(COALESCE(due_amount, 0) + $2, 0) <= 0 THEN CURRENT_TIMESTAMP
              ELSE NULL
            END,
            settled_by = CASE
              WHEN GREATEST(COALESCE(due_amount, 0) + $2, 0) <= 0 THEN $3
              ELSE NULL
            END
          WHERE sale_id = $1
        `,
        [saleId, allocatedAmount, staffId]
      );
    }

    const dueAfterReversalResult = await client.query(
      `
        SELECT
          b.total_amount,
          COALESCE(SUM(cpt.amount), 0) AS paid_total
        FROM bill b
        LEFT JOIN cashier_payment_txn cpt ON cpt.bill_id = b.bill_id
        WHERE b.bill_id = $1
        GROUP BY b.total_amount
      `,
      [billId]
    );
    const totalAmount = Number(dueAfterReversalResult.rows[0]?.total_amount ?? 0);
    const paidAfterReversal = Number(dueAfterReversalResult.rows[0]?.paid_total ?? 0);
    const dueAfterReversal = Math.max(totalAmount - paidAfterReversal, 0);
    if (replacementAmount > dueAfterReversal) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: `Replacement amount exceeds due after reversal (${dueAfterReversal}).` },
        { status: 422 }
      );
    }

    const newPaymentTxnResult = await client.query(
      `
        INSERT INTO cashier_payment_txn (
          bill_id, visit_id, amount, txn_type, payment_type, payment_reference, notes, received_by
        ) VALUES ($1,$2,$3,'payment',$4,$5,$6,$7)
        RETURNING cashier_payment_txn_id
      `,
      [billId, visitId, replacementAmount, replacementPaymentType, replacementReference, replacementNotes, staffId]
    );
    const newPaymentTxnId = Number(newPaymentTxnResult.rows[0].cashier_payment_txn_id);
    const newReceiptNo = `CPT-${receiptDate}-${newPaymentTxnId}`;
    await client.query(
      `UPDATE cashier_payment_txn SET receipt_no = $2 WHERE cashier_payment_txn_id = $1`,
      [newPaymentTxnId, newReceiptNo]
    );

    let remaining = replacementAmount;
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
          ) VALUES ($1,$2,$3,$4)
        `,
        [newPaymentTxnId, saleId, billId, allocatable]
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

    const billStateResult = await client.query(
      `
        SELECT b.total_amount, COALESCE(SUM(cpt.amount), 0) AS paid_total
        FROM bill b
        LEFT JOIN cashier_payment_txn cpt ON cpt.bill_id = b.bill_id
        WHERE b.bill_id = $1
        GROUP BY b.total_amount
      `,
      [billId]
    );
    const total = Number(billStateResult.rows[0]?.total_amount ?? 0);
    const paid = Number(billStateResult.rows[0]?.paid_total ?? 0);
    const due = Math.max(total - paid, 0);
    const paymentStatus = deriveBillPaymentStatus(total, paid);
    await client.query(`UPDATE bill SET payment_status = $2 WHERE bill_id = $1`, [billId, paymentStatus]);

    // H2 terminal-reopen guard (mirrors cashier/reversal). When the replacement
    // no longer fully pays the bill, the visit status that settle auto-advanced
    // must be walked back. Reverting a TERMINAL visit (completed/discharged)
    // reopens a closed encounter and requires an explicit admin override; without
    // it the whole correction is refused so it can't happen by accident.
    let terminalReopen = false;
    let reopenedFrom: string | null = null;
    if (visitId && due > 0) {
      const currentVisit = await client.query(
        `SELECT status FROM visit WHERE visit_id = $1 LIMIT 1`,
        [visitId]
      );
      const currentStatus = currentVisit.rows[0]?.status as string | undefined;
      const TERMINAL = ["completed", "discharged"];
      const settleAdvanced = ["payment_done", ...TERMINAL];
      if (currentStatus && settleAdvanced.includes(currentStatus)) {
        const isTerminal = TERMINAL.includes(currentStatus);
        if (isTerminal && !allowTerminalReopen) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            {
              error: `Correction would reopen a '${currentStatus}' visit. Resubmit with allowTerminalReopen=true to confirm reopening the encounter.`,
              code: "TERMINAL_REOPEN_REQUIRED",
            },
            { status: 409 }
          );
        }
        const priorStatus = await client.query(
          `SELECT status FROM visit_status_history
           WHERE visit_id = $1 AND status NOT IN ('payment_done','completed','discharged')
           ORDER BY updated_at DESC, visit_status_id DESC
           LIMIT 1`,
          [visitId]
        );
        const revertTo = priorStatus.rows[0]?.status;
        if (revertTo) {
          await client.query(`CALL update_and_log_visit_status($1, $2, $3, $4)`, [
            visitId,
            revertTo,
            null,
            staffId,
          ]);
          if (isTerminal) {
            terminalReopen = true;
            reopenedFrom = currentStatus;
          }
        }
      }
    }

    await client.query(
      `
        INSERT INTO cashier_audit_event (
          event_type, bill_id, visit_id, cashier_payment_txn_id, actor_staff_id, reason_code, reason_note, before_json, after_json
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb)
      `,
      [
        "correction_success",
        billId,
        visitId,
        newPaymentTxnId,
        staffId,
        reasonCode,
        reasonNote || null,
        JSON.stringify({ originalTxnId: targetTxnId, reversalTxnId, originalAmount }),
        JSON.stringify({ replacementTxnId: newPaymentTxnId, replacementAmount, paymentStatus, due, terminalReopen, reopenedFrom }),
      ]
    );

    const responseBody = {
      success: true,
      data: {
        originalTxnId: targetTxnId,
        reversalTxnId,
        replacementTxnId: newPaymentTxnId,
        replacementReceiptNo: newReceiptNo,
        billId,
        visitId,
        paymentStatus,
        dueAmount: due,
        terminalReopen,
        reopenedFrom,
      },
    };

    if (idempotencyKey) {
      await client.query(
        `
          INSERT INTO cashier_idempotency (
            idempotency_key, endpoint, bill_id, request_hash, response_json, status_code, created_by
          ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
        `,
        [idempotencyKey, "/api/cashier/correct", billId, JSON.stringify(body), JSON.stringify(responseBody), 200, staffId]
      );
    }

    await client.query("COMMIT");
    return NextResponse.json(responseBody);
  } catch (error: any) {
    await client.query("ROLLBACK");
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("cashier correct error:", error);
    return NextResponse.json({ error: "Failed to correct cashier payment" }, { status: 500 });
  } finally {
    client.release();
  }
}
