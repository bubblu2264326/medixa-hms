import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page") || "1"), 1);
    const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize") || "50"), 1), 500);
    const offset = (page - 1) * pageSize;
    const eventType = searchParams.get("eventType");
    const billId = searchParams.get("billId");
    const visitId = searchParams.get("visitId");
    const actorStaffId = searchParams.get("actorStaffId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const result = await query(
      `
        SELECT
          cae.cashier_audit_event_id,
          cae.event_type,
          cae.bill_id,
          cae.visit_id,
          cae.cashier_payment_txn_id,
          cae.reason_code,
          cae.reason_note,
          cae.before_json,
          cae.after_json,
          cae.created_at,
          s.staff_id AS actor_staff_id,
          s.name AS actor_name
        FROM cashier_audit_event cae
        LEFT JOIN staff s ON s.staff_id = cae.actor_staff_id
        WHERE ($1::text IS NULL OR cae.event_type = $1::text)
          AND ($2::int IS NULL OR cae.bill_id = $2::int)
          AND ($3::int IS NULL OR cae.visit_id = $3::int)
          AND ($4::int IS NULL OR cae.actor_staff_id = $4::int)
          AND ($5::date IS NULL OR cae.created_at::date >= $5::date)
          AND ($6::date IS NULL OR cae.created_at::date <= $6::date)
        ORDER BY cae.created_at DESC, cae.cashier_audit_event_id DESC
        LIMIT $7 OFFSET $8
      `,
      [
        eventType || null,
        billId ? Number(billId) : null,
        visitId ? Number(visitId) : null,
        actorStaffId ? Number(actorStaffId) : null,
        from || null,
        to || null,
        pageSize,
        offset,
      ]
    );

    return NextResponse.json({
      page,
      pageSize,
      items: result.rows.map((row) => ({
        cashierAuditEventId: Number(row.cashier_audit_event_id),
        eventType: String(row.event_type ?? ""),
        billId: row.bill_id == null ? null : Number(row.bill_id),
        visitId: row.visit_id == null ? null : Number(row.visit_id),
        cashierPaymentTxnId:
          row.cashier_payment_txn_id == null ? null : Number(row.cashier_payment_txn_id),
        reasonCode: row.reason_code ?? null,
        reasonNote: row.reason_note ?? null,
        before: row.before_json ?? null,
        after: row.after_json ?? null,
        createdAt: row.created_at ?? null,
        actorStaffId: row.actor_staff_id == null ? null : Number(row.actor_staff_id),
        actorName: row.actor_name ?? null,
      })),
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("admin cashier audit error:", error);
    return NextResponse.json({ error: "Failed to fetch cashier audit stream" }, { status: 500 });
  }
}
