import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";

function normalizeAccountType(value: unknown) {
  return value === "doctor" ? "doctor" : "staff";
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const accountType = searchParams.get("account_type");
    const personId = Number(searchParams.get("person_id") ?? 0) || null;

    const roleParams: any[] = [];
    const roleFilters: string[] = ["1=1"];
    if (role) {
      roleParams.push(role);
      roleFilters.push(`lrq.role_name = $${roleParams.length}`);
    }

    const overrideParams: any[] = [];
    const overrideFilters: string[] = ["1=1"];
    if (accountType === "staff" || accountType === "doctor") {
      overrideParams.push(accountType);
      overrideFilters.push(`leo.account_type = $${overrideParams.length}`);
    }
    if (personId) {
      overrideParams.push(personId);
      overrideFilters.push(`leo.person_id = $${overrideParams.length}`);
    }

    const [roleQuotas, overrides] = await Promise.all([
      query(
        `
        SELECT lrq.*, lt.leave_code, lt.leave_name
        FROM leave_role_quota lrq
        JOIN staff_leave_types lt ON lt.leave_type_id = lrq.leave_type_id
        WHERE ${roleFilters.join(" AND ")}
        ORDER BY lrq.role_name, lt.leave_name
        `,
        roleParams
      ),
      query(
        `
        SELECT
          leo.*,
          lt.leave_code,
          lt.leave_name,
          COALESCE(s.name, d.doctor_name) AS person_name,
          COALESCE(s.user_code, d.user_code) AS user_code
        FROM leave_employee_quota_override leo
        JOIN staff_leave_types lt ON lt.leave_type_id = leo.leave_type_id
        LEFT JOIN staff s ON s.staff_id = leo.staff_id
        LEFT JOIN doctor d ON d.doctor_id = leo.doctor_id
        WHERE ${overrideFilters.join(" AND ")}
        ORDER BY leo.account_type, leo.person_id, lt.leave_name
        `,
        overrideParams
      ),
    ]);

    return NextResponse.json({
      role_quotas: roleQuotas.rows,
      employee_overrides: overrides.rows,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("leave policy GET error", error);
    return NextResponse.json({ error: "Failed to load leave policies" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const body = await req.json();

    if (body?.scope === "role") {
      if (!body?.role_name || !body?.leave_type_id || body?.annual_quota == null) {
        return NextResponse.json({ error: "role_name, leave_type_id and annual_quota are required" }, { status: 400 });
      }

      const upsert = await query(
        `
        INSERT INTO leave_role_quota (role_name, leave_type_id, annual_quota, active, updated_at)
        VALUES ($1, $2, $3, COALESCE($4, true), CURRENT_TIMESTAMP)
        ON CONFLICT (role_name, leave_type_id)
        DO UPDATE SET
          annual_quota = EXCLUDED.annual_quota,
          active = EXCLUDED.active,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
        `,
        [
          String(body.role_name),
          Number(body.leave_type_id),
          Number(body.annual_quota),
          body?.active ?? true,
        ]
      );

      await logAuditEvent({
        actorUserCode: actor.user_code,
        action: "Role leave quota updated",
        entityType: "leave_role_quota",
        entityId: upsert.rows[0]?.role_quota_id ?? null,
      });

      return NextResponse.json(upsert.rows[0]);
    }

    const accountType = normalizeAccountType(body?.account_type);
    const personId = Number(body?.person_id ?? 0);

    if (!personId || !body?.leave_type_id || body?.annual_quota == null) {
      return NextResponse.json({ error: "account_type, person_id, leave_type_id and annual_quota are required" }, { status: 400 });
    }

    const upsert = await query(
      `
      INSERT INTO leave_employee_quota_override (
        account_type,
        person_id,
        staff_id,
        doctor_id,
        leave_type_id,
        annual_quota,
        active,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        COALESCE($7, true),
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (account_type, person_id, leave_type_id)
      DO UPDATE SET
        annual_quota = EXCLUDED.annual_quota,
        active = EXCLUDED.active,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
      `,
      [
        accountType,
        personId,
        accountType === "staff" ? personId : null,
        accountType === "doctor" ? personId : null,
        Number(body.leave_type_id),
        Number(body.annual_quota),
        body?.active ?? true,
      ]
    );

    await logAuditEvent({
      actorUserCode: actor.user_code,
      action: "Employee leave quota override updated",
      entityType: "leave_employee_quota_override",
      entityId: upsert.rows[0]?.override_id ?? null,
      details: { accountType, personId },
    });

    return NextResponse.json(upsert.rows[0]);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("leave policy PUT error", error);
    return NextResponse.json({ error: "Failed to update leave policy" }, { status: 500 });
  }
}
