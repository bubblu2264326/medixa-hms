import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";

type PermissionPolicyInput = {
  staff_id?: number | null;
  role_id?: number | null;
  module: string;
  action: "view" | "create" | "edit" | "delete" | "approve" | "export";
  allowed?: boolean;
  scope_type?: "global" | "facility" | "branch" | "department";
  scope_value?: string | null;
  expires_at?: string | null;
};

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    const { searchParams } = new URL(req.url);
    const staffId = Number(searchParams.get("staff_id") ?? 0) || null;
    const roleId = Number(searchParams.get("role_id") ?? 0) || null;
    const moduleName = searchParams.get("module");

    if (!staffId && !roleId) {
      return NextResponse.json({ error: "staff_id or role_id is required" }, { status: 400 });
    }

    const params: any[] = [];
    let where = "WHERE 1=1";
    if (staffId) {
      params.push(staffId);
      where += ` AND spp.staff_id = $${params.length}`;
    }
    if (roleId) {
      params.push(roleId);
      where += ` AND spp.role_id = $${params.length}`;
    }
    if (moduleName) {
      params.push(moduleName);
      where += ` AND spp.module = $${params.length}`;
    }

    const result = await query(
      `
      SELECT
        spp.policy_id,
        spp.staff_id,
        s.name AS staff_name,
        spp.role_id,
        sr.role_name,
        spp.module,
        spp.action,
        spp.allowed,
        spp.scope_type,
        spp.scope_value,
        spp.granted_at,
        spp.expires_at
      FROM staff_permission_policies spp
      LEFT JOIN staff s ON s.staff_id = spp.staff_id
      LEFT JOIN staff_roles sr ON sr.role_id = spp.role_id
      ${where}
      ORDER BY spp.module, spp.action, spp.scope_type, spp.scope_value NULLS FIRST
      `,
      params
    );

    return NextResponse.json(result.rows);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 permissions GET error", error);
    return NextResponse.json({ error: "Failed to load permission policies" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const body = await req.json();
    const policies: PermissionPolicyInput[] = Array.isArray(body?.policies) ? body.policies : [];

    if (policies.length === 0) {
      return NextResponse.json({ error: "policies[] is required" }, { status: 400 });
    }

    const upserted: any[] = [];
    for (const p of policies) {
      if (!p?.module || !p?.action || (!p.staff_id && !p.role_id)) {
        return NextResponse.json(
          { error: "Each policy needs module, action, and either staff_id or role_id" },
          { status: 400 }
        );
      }

      const before = await query(
        `
        SELECT * FROM staff_permission_policies
        WHERE COALESCE(staff_id, 0) = COALESCE($1, 0)
          AND COALESCE(role_id, 0) = COALESCE($2, 0)
          AND module = $3
          AND action = $4
          AND scope_type = COALESCE($5, 'global')
          AND COALESCE(scope_value, '') = COALESCE($6, '')
        LIMIT 1
        `,
        [
          p.staff_id ?? null,
          p.role_id ?? null,
          p.module,
          p.action,
          p.scope_type ?? "global",
          p.scope_value ?? null,
        ]
      );

      const result = await query(
        `
        INSERT INTO staff_permission_policies (
          staff_id,
          role_id,
          module,
          action,
          allowed,
          scope_type,
          scope_value,
          granted_by,
          expires_at
        ) VALUES ($1, $2, $3, $4, COALESCE($5, true), COALESCE($6, 'global'), $7, (SELECT staff_id FROM staff WHERE user_code = $8), $9)
        ON CONFLICT (COALESCE(staff_id, 0), COALESCE(role_id, 0), module, action, scope_type, COALESCE(scope_value, ''))
        DO UPDATE SET
          allowed = EXCLUDED.allowed,
          granted_by = EXCLUDED.granted_by,
          granted_at = CURRENT_TIMESTAMP,
          expires_at = EXCLUDED.expires_at
        RETURNING *
        `,
        [
          p.staff_id ?? null,
          p.role_id ?? null,
          p.module,
          p.action,
          p.allowed ?? true,
          p.scope_type ?? "global",
          p.scope_value ?? null,
          actor.user_code,
          p.expires_at ?? null,
        ]
      );

      const after = result.rows[0];
      upserted.push(after);

      await query(
        `
        INSERT INTO staff_permission_audit (policy_id, actor_staff_id, event_type, before_json, after_json)
        VALUES (
          $1,
          (SELECT staff_id FROM staff WHERE user_code = $2),
          $3,
          $4::jsonb,
          $5::jsonb
        )
        `,
        [
          after.policy_id,
          actor.user_code,
          before.rows[0] ? "updated" : "created",
          before.rows[0] ? JSON.stringify(before.rows[0]) : null,
          JSON.stringify(after),
        ]
      );
    }

    await logAuditEvent({
      actorUserCode: actor.user_code,
      action: "Permission matrix updated",
      entityType: "staff_permission_policies",
      entityId: upserted[0]?.policy_id ?? null,
      details: {
        changedPolicies: upserted.length,
      },
    });

    return NextResponse.json({ success: true, policies: upserted });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 permissions PUT error", error);
    return NextResponse.json({ error: "Failed to update permission policies" }, { status: 500 });
  }
}
