import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";

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
