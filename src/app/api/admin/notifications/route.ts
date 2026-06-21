import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";

// GET /api/admin/notifications?status= — the notification outbox (admin).
export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    const status = new URL(req.url).searchParams.get("status");
    const params: any[] = [];
    let where = "";
    if (status) { params.push(status); where = "WHERE status = $1"; }
    const res = await query(
      `SELECT notification_id, channel, recipient, template, status, related_entity, attempts, created_at, sent_at
       FROM notification_outbox ${where}
       ORDER BY created_at DESC
       LIMIT 200`,
      params
    );
    return NextResponse.json(res.rows, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("notifications outbox GET error", err);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}

// POST /api/admin/notifications — idempotent retry. Re-queues an outbox row that
// has not already been sent so the delivery worker picks it up again. A 'sent'
// row is never touched (409); re-queuing an already-queued row is a no-op, so
// repeated retries can't double-send.
export async function POST(req: NextRequest) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const body = await req.json();
    const notificationId = Number(body?.notification_id ?? 0);
    if (!notificationId) {
      return NextResponse.json({ error: "notification_id is required" }, { status: 400 });
    }

    const res = await query(
      `UPDATE notification_outbox
       SET status = 'queued'
       WHERE notification_id = $1 AND status <> 'sent'
       RETURNING notification_id, channel, status`,
      [notificationId]
    );

    if (!res.rows[0]) {
      return NextResponse.json(
        { error: "Notification not found or already sent" },
        { status: 409 }
      );
    }

    await logAuditEvent({
      actorUserCode: actor.user_code,
      action: "Notification re-queued",
      entityType: "notification_outbox",
      entityId: notificationId,
      details: { channel: res.rows[0]?.channel ?? null },
    });

    return NextResponse.json(res.rows[0]);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("notifications outbox POST error", err);
    return NextResponse.json({ error: "Failed to retry notification" }, { status: 500 });
  }
}
