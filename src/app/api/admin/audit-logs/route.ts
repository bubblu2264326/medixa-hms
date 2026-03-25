import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";

function titleizeEvent(raw: string | null | undefined) {
  const input = String(raw ?? "").trim();
  if (!input) return "Cashier activity";
  return input
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// GET: Fetch system audit logs with staff details
export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    const logs = await query(`
      SELECT 
        l.*, 
        COALESCE(
          s.name,
          l.details->>'userName',
          l.details->>'name',
          l.details->>'userCode'
        ) AS staff_name,
        COALESCE(s.role, l.details->>'role') AS staff_role,
        COALESCE(s.user_code, l.details->>'userCode') AS user_code
      FROM audit_logs l
      LEFT JOIN staff s ON l.staff_id = s.staff_id
      ORDER BY l.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    if (logs.rows.length > 0) {
      return NextResponse.json(logs.rows);
    }

    const cashierFallback = await query(
      `
        SELECT
          cae.cashier_audit_event_id,
          cae.event_type,
          cae.bill_id,
          cae.visit_id,
          cae.cashier_payment_txn_id,
          cae.before_json,
          cae.after_json,
          cae.reason_code,
          cae.reason_note,
          cae.created_at,
          s.name AS staff_name,
          s.role AS staff_role,
          s.user_code
        FROM cashier_audit_event cae
        LEFT JOIN staff s ON s.staff_id = cae.actor_staff_id
        ORDER BY cae.created_at DESC
        LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    const normalized = cashierFallback.rows.map((row: any) => ({
      log_id: `cashier-${row.cashier_audit_event_id}`,
      action: titleizeEvent(row.event_type),
      entity_type: "cashier",
      entity_id:
        row.bill_id != null
          ? String(row.bill_id)
          : row.cashier_payment_txn_id != null
            ? String(row.cashier_payment_txn_id)
            : null,
      details: {
        billId: row.bill_id == null ? null : Number(row.bill_id),
        visitId: row.visit_id == null ? null : Number(row.visit_id),
        cashierPaymentTxnId:
          row.cashier_payment_txn_id == null ? null : Number(row.cashier_payment_txn_id),
        before: row.before_json ?? null,
        after: row.after_json ?? null,
        reasonCode: row.reason_code ?? null,
        reasonNote: row.reason_note ?? null,
        fallbackSource: "cashier_audit_event",
      },
      created_at: row.created_at,
      staff_name: row.staff_name,
      staff_role: row.staff_role,
      user_code: row.user_code,
    }));

    return NextResponse.json(normalized);
  } catch (error: any) {
    console.error("Audit Logs GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}

// POST: Utility to log a new action (usually called internally, but can be used via API if needed)
export async function POST(req: NextRequest) {
  try {
    const user = await requireAdminOrSuperAdmin(req);
    const body = await req.json();
    const { action, entity_type, entity_id, details } = body;

    const inserted = await logAuditEvent({
      actorUserCode: user.user_code,
      action: String(action ?? "System event"),
      entityType: entity_type ?? null,
      entityId: entity_id ?? null,
      details: details ?? null,
    });

    return NextResponse.json(inserted ?? { success: true });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Audit Logs POST Error:", error);
    return NextResponse.json({ error: "Failed to create audit log" }, { status: 500 });
  }
}
