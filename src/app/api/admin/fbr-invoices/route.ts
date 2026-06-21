import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";

// GET /api/admin/fbr-invoices?status= — FBR submission queue (admin).
export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    const status = new URL(req.url).searchParams.get("status");
    const params: any[] = [];
    let where = "";
    if (status) { params.push(status); where = "WHERE status = $1"; }
    const res = await query(
      `SELECT submission_id, bill_id, status, fbr_invoice_number, attempts, created_at, submitted_at
       FROM fbr_invoice_submission ${where}
       ORDER BY created_at DESC
       LIMIT 200`,
      params
    );
    return NextResponse.json(res.rows, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("fbr invoices GET error", err);
    return NextResponse.json({ error: "Failed to load FBR submissions" }, { status: 500 });
  }
}

// POST /api/admin/fbr-invoices — idempotent retry. Re-queues a non-submitted
// submission so the PRAL worker picks it up again. A row already 'submitted' is
// never touched (returns 409), and re-queuing an already-queued row is a no-op,
// so repeated clicks/retries can't double-submit.
export async function POST(req: NextRequest) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const body = await req.json();
    const submissionId = Number(body?.submission_id ?? 0);
    if (!submissionId) {
      return NextResponse.json({ error: "submission_id is required" }, { status: 400 });
    }

    const res = await query(
      `UPDATE fbr_invoice_submission
       SET status = 'queued'
       WHERE submission_id = $1 AND status <> 'submitted'
       RETURNING submission_id, bill_id, status`,
      [submissionId]
    );

    if (!res.rows[0]) {
      return NextResponse.json(
        { error: "Submission not found or already submitted" },
        { status: 409 }
      );
    }

    await logAuditEvent({
      actorUserCode: actor.user_code,
      action: "FBR submission re-queued",
      entityType: "fbr_invoice_submission",
      entityId: submissionId,
      details: { billId: res.rows[0]?.bill_id ?? null },
    });

    return NextResponse.json(res.rows[0]);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("fbr invoices POST error", err);
    return NextResponse.json({ error: "Failed to retry FBR submission" }, { status: 500 });
  }
}
