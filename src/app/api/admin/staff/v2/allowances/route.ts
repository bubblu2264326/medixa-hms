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
    const accountType = searchParams.get("account_type");
    const personId = Number(searchParams.get("person_id") ?? 0) || null;
    const activeOnly = searchParams.get("active") !== "false";

    const params: any[] = [];
    const filters: string[] = ["1=1"];

    if (activeOnly) filters.push("ea.is_active = true");

    if (accountType === "staff" || accountType === "doctor") {
      params.push(accountType);
      filters.push(`ea.account_type = $${params.length}`);
    }
    if (personId) {
      params.push(personId);
      filters.push(`ea.person_id = $${params.length}`);
    }

    const result = await query(
      `
      SELECT
        ea.*,
        COALESCE(s.name, d.doctor_name) AS person_name,
        COALESCE(s.user_code, d.user_code) AS user_code
      FROM employee_allowance ea
      LEFT JOIN staff s ON s.staff_id = ea.staff_id
      LEFT JOIN doctor d ON d.doctor_id = ea.doctor_id
      WHERE ${filters.join(" AND ")}
      ORDER BY ea.account_type, ea.person_id, ea.allowance_name
      `,
      params
    );

    return NextResponse.json(result.rows);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("allowances GET error", error);
    return NextResponse.json({ error: "Failed to load allowances" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const body = await req.json();

    const accountType = normalizeAccountType(body?.account_type);
    const personId = Number(body?.person_id ?? 0);

    if (!personId || !body?.allowance_code || !body?.allowance_name) {
      return NextResponse.json({ error: "person_id, allowance_code and allowance_name are required" }, { status: 400 });
    }

    const result = await query(
      `
      INSERT INTO employee_allowance (
        account_type,
        person_id,
        staff_id,
        doctor_id,
        allowance_code,
        allowance_name,
        amount,
        allowance_mode,
        taxable,
        is_active,
        effective_from,
        effective_to,
        notes,
        updated_at
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        COALESCE($9, false),
        COALESCE($10, true),
        COALESCE($11::date, CURRENT_DATE),
        $12::date,
        $13,
        CURRENT_TIMESTAMP
      )
      RETURNING *
      `,
      [
        accountType,
        personId,
        accountType === "staff" ? personId : null,
        accountType === "doctor" ? personId : null,
        String(body.allowance_code).trim().toUpperCase(),
        String(body.allowance_name).trim(),
        Number(body?.amount ?? 0),
        body?.allowance_mode === "one_time" ? "one_time" : "recurring",
        body?.taxable ?? false,
        body?.is_active ?? true,
        body?.effective_from ?? null,
        body?.effective_to ?? null,
        body?.notes ?? null,
      ]
    );

    await logAuditEvent({
      actorUserCode: actor.user_code,
      action: "Allowance created",
      entityType: "employee_allowance",
      entityId: result.rows[0]?.allowance_id ?? null,
      details: {
        accountType,
        personId,
        allowanceCode: String(body.allowance_code),
      },
    });

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("allowances POST error", error);
    return NextResponse.json({ error: "Failed to create allowance" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const body = await req.json();
    const allowanceId = Number(body?.allowance_id ?? 0);
    if (!allowanceId) {
      return NextResponse.json({ error: "allowance_id is required" }, { status: 400 });
    }

    const mode =
      body?.allowance_mode === "one_time"
        ? "one_time"
        : body?.allowance_mode === "recurring"
          ? "recurring"
          : null;

    const result = await query(
      `
      UPDATE employee_allowance
      SET
        allowance_name = COALESCE($2, allowance_name),
        amount = COALESCE($3, amount),
        allowance_mode = COALESCE($4, allowance_mode),
        taxable = COALESCE($5, taxable),
        updated_at = CURRENT_TIMESTAMP
      WHERE allowance_id = $1
        AND is_active = true
      RETURNING *
      `,
      [
        allowanceId,
        body?.allowance_name != null ? String(body.allowance_name).trim() : null,
        body?.amount != null ? Number(body.amount) : null,
        mode,
        typeof body?.taxable === "boolean" ? body.taxable : null,
      ]
    );

    if (!result.rows[0]) {
      return NextResponse.json({ error: "Active allowance not found" }, { status: 404 });
    }

    await logAuditEvent({
      actorUserCode: actor.user_code,
      action: "Allowance updated",
      entityType: "employee_allowance",
      entityId: allowanceId,
      details: {
        amount: result.rows[0]?.amount ?? null,
        allowanceMode: result.rows[0]?.allowance_mode ?? null,
      },
    });

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("allowances PATCH error", error);
    return NextResponse.json({ error: "Failed to update allowance" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const { searchParams } = new URL(req.url);
    const allowanceId = Number(searchParams.get("allowance_id") ?? 0);

    if (!allowanceId) {
      return NextResponse.json({ error: "allowance_id is required" }, { status: 400 });
    }

    const result = await query(
      `
      UPDATE employee_allowance
      SET is_active = false,
          updated_at = CURRENT_TIMESTAMP
      WHERE allowance_id = $1
      RETURNING *
      `,
      [allowanceId]
    );

    if (!result.rows[0]) {
      return NextResponse.json({ error: "Allowance not found" }, { status: 404 });
    }

    await logAuditEvent({
      actorUserCode: actor.user_code,
      action: "Allowance deactivated",
      entityType: "employee_allowance",
      entityId: allowanceId,
    });

    return NextResponse.json({ success: true, allowance: result.rows[0] });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("allowances DELETE error", error);
    return NextResponse.json({ error: "Failed to deactivate allowance" }, { status: 500 });
  }
}
