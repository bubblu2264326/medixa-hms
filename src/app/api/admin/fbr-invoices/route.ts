import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";

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
