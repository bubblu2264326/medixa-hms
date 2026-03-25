import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";
import {
  isValidIanaTimezone,
  invalidateSystemTimezoneCache,
  setSystemTimezoneCache,
} from "@/src/lib/server/systemTimezone";

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
      if (s?.key === "system_timezone") {
        const timezone = typeof s?.value === "string" ? s.value.trim() : "";
        if (!timezone || !isValidIanaTimezone(timezone)) {
          return NextResponse.json({ error: "Invalid IANA timezone value" }, { status: 400 });
        }
      }

      await query(
        `
        INSERT INTO system_settings (setting_key, setting_value, updated_by)
        VALUES ($1, $2::jsonb, $3)
        ON CONFLICT (setting_key) DO UPDATE
        SET
          setting_value = EXCLUDED.setting_value,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = EXCLUDED.updated_by
        `,
        [s.key, JSON.stringify(s.value), actorStaffId]
      );

      await logAuditEvent({
        actorStaffId: actorStaffId ? Number(actorStaffId) : null,
        action: "Update Setting",
        entityType: "System",
        entityId: s.key,
        details: { old: "...", new: s.value },
      });
    }

    const timezoneSetting = settings.find((item: any) => item?.key === "system_timezone");
    if (timezoneSetting) {
      setSystemTimezoneCache(String(timezoneSetting.value));
    } else {
      invalidateSystemTimezoneCache();
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
