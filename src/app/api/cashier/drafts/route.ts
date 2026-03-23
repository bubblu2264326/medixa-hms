import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError } from "@/src/lib/server/auth";
import { requireCashierOrAdmin } from "@/src/lib/server/cashier";
import { logAuditEvent } from "@/src/lib/server/audit";

async function resolveStaffId(userCode: string) {
  const result = await query("select staff_id from staff where user_code = $1 limit 1", [userCode]);
  return result.rows[0]?.staff_id ? Number(result.rows[0].staff_id) : null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireCashierOrAdmin(req);
    const staffId = await resolveStaffId(user.user_code);
    const { searchParams } = new URL(req.url);

    const billId = searchParams.get("billId");
    const status = searchParams.get("status") || "open";
    const mineOnly = (searchParams.get("mineOnly") || "true").toLowerCase() !== "false";
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || "100"), 1), 300);

    const drafts = await query(
      `
        SELECT
          d.cashier_settlement_draft_id,
          d.bill_id,
          d.visit_id,
          d.amount,
          d.payment_type,
          d.payment_reference,
          d.notes,
          d.draft_status,
          d.created_at,
          d.updated_at,
          d.created_by,
          d.applied_cashier_payment_txn_id,
          p.patient_name,
          p.contact_number,
          b.payment_status
        FROM cashier_settlement_draft d
        JOIN bill b ON b.bill_id = d.bill_id
        JOIN patient p ON p.patient_id = b.patient_id
        WHERE ($1::int IS NULL OR d.bill_id = $1::int)
          AND ($2::text IS NULL OR d.draft_status = $2::text)
          AND ($3::bool = false OR d.created_by = $4::int)
        ORDER BY d.updated_at DESC, d.cashier_settlement_draft_id DESC
        LIMIT $5
      `,
      [
        billId ? Number(billId) : null,
        status === "all" ? null : status,
        mineOnly,
        staffId,
        limit,
      ]
    );

    return NextResponse.json({
      items: drafts.rows.map((row) => ({
        cashierSettlementDraftId: Number(row.cashier_settlement_draft_id),
        billId: Number(row.bill_id),
        visitId: row.visit_id == null ? null : Number(row.visit_id),
        amount: Number(row.amount ?? 0),
        paymentType: String(row.payment_type ?? "CASH"),
        paymentReference: row.payment_reference ?? null,
        notes: row.notes ?? null,
        draftStatus: String(row.draft_status ?? "open"),
        createdAt: row.created_at ?? null,
        updatedAt: row.updated_at ?? null,
        createdBy: row.created_by == null ? null : Number(row.created_by),
        appliedCashierPaymentTxnId:
          row.applied_cashier_payment_txn_id == null
            ? null
            : Number(row.applied_cashier_payment_txn_id),
        patientName: row.patient_name ?? null,
        phone: row.contact_number ?? null,
        billPaymentStatus: row.payment_status ?? "Unpaid",
      })),
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("cashier drafts GET error:", error);
    return NextResponse.json({ error: "Failed to load drafts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireCashierOrAdmin(req);
    const staffId = await resolveStaffId(user.user_code);
    if (!staffId) {
      return NextResponse.json({ error: "Unable to resolve cashier staff id" }, { status: 403 });
    }

    const body = await req.json();
    const billId = Number(body.billId ?? 0);
    const visitId = body.visitId == null ? null : Number(body.visitId);
    const amount = Number(body.amount ?? 0);
    const paymentType = String(body.paymentType ?? "CASH").toUpperCase();
    const paymentReference = body.paymentReference ? String(body.paymentReference) : null;
    const notes = body.notes ? String(body.notes) : null;

    if (!billId || billId <= 0 || !amount || amount <= 0) {
      return NextResponse.json({ error: "billId and amount are required" }, { status: 400 });
    }

    const billExists = await query(`SELECT bill_id FROM bill WHERE bill_id = $1 LIMIT 1`, [billId]);
    if (billExists.rows.length === 0) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const created = await query(
      `
        INSERT INTO cashier_settlement_draft (
          bill_id,
          visit_id,
          amount,
          payment_type,
          payment_reference,
          notes,
          draft_status,
          created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,'open',$7)
        RETURNING *
      `,
      [billId, visitId, amount, paymentType, paymentReference, notes, staffId]
    );

    await query(
      `
        INSERT INTO cashier_audit_event (
          event_type,
          bill_id,
          visit_id,
          actor_staff_id,
          after_json
        ) VALUES ($1,$2,$3,$4,$5::jsonb)
      `,
      [
        "draft_created",
        billId,
        visitId,
        staffId,
        JSON.stringify({
          draftId: created.rows[0].cashier_settlement_draft_id,
          amount,
          paymentType,
        }),
      ]
    );

    await logAuditEvent({
      actorStaffId: staffId,
      action: "Cashier draft created",
      entityType: "cashier_settlement_draft",
      entityId: created.rows[0]?.cashier_settlement_draft_id ?? null,
      details: {
        billId,
        visitId,
        amount,
        paymentType,
      },
    });

    return NextResponse.json({
      success: true,
      draft: {
        cashierSettlementDraftId: Number(created.rows[0].cashier_settlement_draft_id),
        billId: Number(created.rows[0].bill_id),
      },
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("cashier drafts POST error:", error);
    return NextResponse.json({ error: "Failed to create draft" }, { status: 500 });
  }
}
