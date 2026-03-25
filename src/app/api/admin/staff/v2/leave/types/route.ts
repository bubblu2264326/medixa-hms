import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    const result = await query(
      `
      SELECT
        leave_type_id,
        leave_code,
        leave_name,
        default_annual_quota,
        is_paid,
        requires_attachment,
        active
      FROM staff_leave_types
      ORDER BY leave_name
      `
    );
    return NextResponse.json(result.rows);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 leave types GET error", error);
    return NextResponse.json({ error: "Failed to load leave types" }, { status: 500 });
  }
}

