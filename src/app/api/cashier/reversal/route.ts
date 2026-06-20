import { NextRequest, NextResponse } from "next/server";
import pool from "@/database/db";
import { AuthError } from "@/src/lib/server/auth";
import { deriveBillPaymentStatus, requireCashierAdminOnlyForReversal } from "@/src/lib/server/cashier";
import { logAuditEvent } from "@/src/lib/server/audit";
import { getReceiptDateStamp, getSystemTimezone } from "@/src/lib/server/systemTimezone";

type ReversalPayload = {
  cashierPaymentTxnId?: number;
  reasonCode?: string;
  reasonNote?: string;
  // H2: explicit admin acknowledgement that the reversal may reopen a
  // completed/discharged visit. Without it, such a reversal is refused.
  allowTerminalReopen?: boolean;
};

async function resolveStaffId(userCode: string, client: any) {
  const result = await client.query(
    "select staff_id from staff where user_code = $1 limit 1",
    [userCode]
  );
  return result.rows[0]?.staff_id ? Number(result.rows[0].staff_id) : null;
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const user = await requireCashierAdminOnlyForReversal(req);
    const systemTimezone = await getSystemTimezone();
    const body = (await req.json()) as ReversalPayload;
    const txnId = Number(body.cashierPaymentTxnId ?? 0);
    const reasonCode = (body.reasonCode ?? "").trim();
    const reasonNote = (body.reasonNote ?? "").trim();
    const allowTerminalReopen = body.allowTerminalReopen === true;

    if (!txnId || txnId <= 0 || !reasonCode) {
      return NextResponse.json(
        { error: "cashierPaymentTxnId and reasonCode are required" },
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
      [txnId]
    );
    if (originalTxnResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Cashier transaction not found" }, { status: 404 });
    }

    const original = originalTxnResult.rows[0];
    if (String(original.txn_type) !== "payment") {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Only payment transactions can be reversed" }, { status: 409 });
    }

    const existingReversal = await client.query(
      `
        SELECT cashier_payment_txn_id
        FROM cashier_payment_txn
        WHERE reversed_from_txn_id = $1
          AND txn_type = 'reversal'
        LIMIT 1
      `,
      [txnId]
    );
    if (existingReversal.rows.length > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Transaction already reversed" }, { status: 409 });
    }

    const billId = Number(original.bill_id);
    const visitId = original.visit_id == null ? null : Number(original.visit_id);
    const originalAmount = Number(original.amount ?? 0);

    await client.query(
      `
        SELECT bill_id
        FROM bill
        WHERE bill_id = $1
        FOR UPDATE
      `,
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
          $1,
          $2,
          $3,
          'reversal',
          $4,
          $5,
          $6,
          'CASH',
          $7,
          $8,
          $9
        )
        RETURNING cashier_payment_txn_id
      `,
      [
        billId,
        visitId,
        -Math.abs(originalAmount),
        txnId,
        reasonCode,
        reasonNote || null,
        `REV-${txnId}`,
        `Reversal of cashier txn #${txnId}`,
        staffId,
      ]
    );
    const reversalTxnId = Number(reversalTxnResult.rows[0].cashier_payment_txn_id);
    const reversalDate = getReceiptDateStamp(new Date(), systemTimezone);
    const reversalReceiptNo = `CRV-${reversalDate}-${reversalTxnId}`;
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
      [txnId]
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
            settled_at = CASE
              WHEN GREATEST(COALESCE(settled_amount, 0) - $2, 0) <= 0 THEN NULL
              ELSE settled_at
            END,
            settled_by = CASE
              WHEN GREATEST(COALESCE(settled_amount, 0) - $2, 0) <= 0 THEN NULL
              ELSE settled_by
            END,
            updated_at = CURRENT_TIMESTAMP
          WHERE bill_id = $1
            AND sale_id = $3
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

    const billTotalResult = await client.query(
      `SELECT total_amount FROM bill WHERE bill_id = $1 LIMIT 1`,
      [billId]
    );
    const billTotal = Number(billTotalResult.rows[0]?.total_amount ?? 0);

    const paidResult = await client.query(
      `
        SELECT COALESCE(SUM(amount), 0) AS paid_total
        FROM cashier_payment_txn
        WHERE bill_id = $1
      `,
      [billId]
    );
    const paidAmount = Number(paidResult.rows[0]?.paid_total ?? 0);
    const dueAmount = Math.max(billTotal - paidAmount, 0);
    const paymentStatus = deriveBillPaymentStatus(billTotal, paidAmount);

    await client.query(`UPDATE bill SET payment_status = $2 WHERE bill_id = $1`, [billId, paymentStatus]);

    // H2: a reversal that leaves the bill no longer fully paid must walk back the
    // visit status that settle auto-advanced. For a visit at 'payment_done' we
    // revert to the pre-payment status automatically. For a TERMINAL visit
    // (completed/discharged), reversing the payment reopens a closed encounter —
    // that requires an explicit admin override (allowTerminalReopen); without it
    // the entire reversal is refused so it cannot happen by accident.
    let terminalReopen = false;
    let reopenedFrom: string | null = null;
    if (visitId && dueAmount > 0) {
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
              error: `Reversal would reopen a '${currentStatus}' visit. Resubmit with allowTerminalReopen=true to confirm reopening the encounter.`,
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
          event_type,
          bill_id,
          visit_id,
          cashier_payment_txn_id,
          actor_staff_id,
          before_json,
          after_json,
          reason_code,
          reason_note
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9)
      `,
      [
        "reversal_success",
        billId,
        visitId,
        reversalTxnId,
        staffId,
        JSON.stringify({ reversedTxnId: txnId, reversedAmount: originalAmount }),
        JSON.stringify({ paidAmount, dueAmount, paymentStatus, reversalReceiptNo }),
        reasonCode,
        reasonNote || null,
      ]
    );

    await logAuditEvent(
      {
        actorStaffId: staffId,
        action: "Cashier payment reversed",
        entityType: "cashier_payment_txn",
        entityId: reversalTxnId,
        details: {
          reversedTxnId: txnId,
          billId,
          visitId,
          reversalReceiptNo,
          reasonCode,
          reasonNote: reasonNote || null,
          paidAmount,
          dueAmount,
          paymentStatus,
          terminalReopen,
          reopenedFrom,
        },
      },
      client
    );

    await client.query("COMMIT");
    return NextResponse.json({
      success: true,
      data: {
        reversalTxnId,
        reversalReceiptNo,
        reversedTxnId: txnId,
        billId,
        visitId,
        paidAmount,
        dueAmount,
        paymentStatus,
        terminalReopen,
        reopenedFrom,
      },
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("cashier reversal error:", error);
    return NextResponse.json({ error: "Failed to reverse cashier payment" }, { status: 500 });
  } finally {
    client.release();
  }
}
