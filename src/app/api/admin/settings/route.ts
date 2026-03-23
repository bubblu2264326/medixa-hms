import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";

// GET: Fetch all system settings
export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    const settings = await query("SELECT * FROM system_settings ORDER BY setting_key ASC");
    return NextResponse.json(settings.rows);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Settings GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// PUT: Bulk update settings
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAdminOrSuperAdmin(req);
    const body = await req.json();
    const { settings } = body; // settings = [{ key: 'string', value: any }]

    if (!settings) {
      return NextResponse.json({ error: "Settings are required" }, { status: 400 });
    }

    const staffResult = await query(
      "SELECT staff_id FROM staff WHERE user_code = $1 LIMIT 1",
      [user.user_code]
    );
    const actorStaffId = staffResult.rows[0]?.staff_id ?? null;

    for (const s of settings) {
      await query(
        `UPDATE system_settings 
         SET setting_value = $2::jsonb, updated_at = CURRENT_TIMESTAMP, updated_by = $3
         WHERE setting_key = $1`,
        [s.key, JSON.stringify(s.value), actorStaffId]
      );

      // Log the change
      await query(
        `INSERT INTO audit_logs (staff_id, action, entity_type, entity_id, details) 
         VALUES ($1, $2, $3, $4, $5)`,
        [actorStaffId, "Update Setting", "System", s.key, JSON.stringify({ old: "...", new: s.value })]
      );
    }

    return NextResponse.json({ message: "Settings updated successfully" });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Settings PUT Error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
