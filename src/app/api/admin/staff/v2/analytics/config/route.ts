import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";
import {
  defaultScoreConfig,
  getScoreConfig,
  normalizeScoreConfig,
  WORKFORCE_ANALYTICS_CONFIG_KEY,
} from "@/src/lib/server/workforceAnalytics";

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    const { config, updatedAt } = await getScoreConfig();

    return NextResponse.json({
      setting_key: WORKFORCE_ANALYTICS_CONFIG_KEY,
      updated_at: updatedAt,
      config,
      defaults: defaultScoreConfig(),
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 analytics config GET error", error);
    return NextResponse.json({ error: "Failed to load workforce analytics config" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const body = await req.json();
    const normalized = normalizeScoreConfig(body?.config ?? body ?? {});

    const saved = await query(
      `
      INSERT INTO system_settings (setting_key, setting_value, description, updated_by, updated_at)
      VALUES ($1, $2::jsonb, $3, (SELECT staff_id FROM staff WHERE user_code = $4 LIMIT 1), CURRENT_TIMESTAMP)
      ON CONFLICT (setting_key)
      DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        description = COALESCE(EXCLUDED.description, system_settings.description),
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING setting_key, setting_value, updated_at
      `,
      [
        WORKFORCE_ANALYTICS_CONFIG_KEY,
        JSON.stringify(normalized),
        "Workforce analytics scorecard configuration",
        actor.user_code,
      ]
    );

    await logAuditEvent({
      actorUserCode: actor.user_code,
      action: "Workforce analytics score config updated",
      entityType: "system_settings",
      entityId: WORKFORCE_ANALYTICS_CONFIG_KEY,
      details: {
        settingKey: WORKFORCE_ANALYTICS_CONFIG_KEY,
        version: normalized.version,
      },
    });

    return NextResponse.json({
      setting_key: saved.rows[0]?.setting_key,
      updated_at: saved.rows[0]?.updated_at,
      config: normalizeScoreConfig(saved.rows[0]?.setting_value ?? normalized),
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 analytics config PATCH error", error);
    return NextResponse.json({ error: "Failed to update workforce analytics config" }, { status: 500 });
  }
}
