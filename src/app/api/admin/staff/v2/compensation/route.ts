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

    const params: any[] = [];
    const filters: string[] = ["1=1"];

    if (accountType === "staff" || accountType === "doctor") {
      params.push(accountType);
      filters.push(`cp.account_type = $${params.length}`);
    }
    if (personId) {
      params.push(personId);
      filters.push(`cp.person_id = $${params.length}`);
    }

    const result = await query(
      `
      SELECT
        cp.*, 
        COALESCE(s.name, d.doctor_name) AS person_name,
        COALESCE(s.user_code, d.user_code) AS user_code,
        COALESCE(s.role, 'Doctor') AS role
      FROM employee_compensation_profile cp
      LEFT JOIN staff s ON s.staff_id = cp.staff_id
      LEFT JOIN doctor d ON d.doctor_id = cp.doctor_id
      WHERE ${filters.join(" AND ")}
      ORDER BY cp.account_type, cp.person_id, cp.active_from DESC
      `,
      params
    );

    return NextResponse.json(result.rows);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("compensation GET error", error);
    return NextResponse.json({ error: "Failed to load compensation settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const body = await req.json();

    const accountType = normalizeAccountType(body?.account_type);
    const personId = Number(body?.person_id ?? 0);
    const salaryModel = body?.salary_model === "per_patient_seen" ? "per_patient_seen" : "fixed_monthly";

    if (!personId) {
      return NextResponse.json({ error: "person_id is required" }, { status: 400 });
    }

    const staffId = accountType === "staff" ? personId : null;
    const doctorId = accountType === "doctor" ? personId : null;

    const result = await query(
      `
      INSERT INTO employee_compensation_profile (
        account_type,
        person_id,
        staff_id,
        doctor_id,
        salary_model,
        payroll_cycle,
        base_monthly_salary,
        per_patient_fee,
        active_from,
        active_to,
        notes,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, 'monthly', $6, $7,
        COALESCE($8::date, CURRENT_DATE),
        $9::date,
        $10,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (account_type, person_id, active_from)
      DO UPDATE SET
        salary_model = EXCLUDED.salary_model,
        base_monthly_salary = EXCLUDED.base_monthly_salary,
        per_patient_fee = EXCLUDED.per_patient_fee,
        active_to = EXCLUDED.active_to,
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
      `,
      [
        accountType,
        personId,
        staffId,
        doctorId,
        salaryModel,
        Number(body?.base_monthly_salary ?? 0),
        Number(body?.per_patient_fee ?? 0),
        body?.active_from ?? null,
        body?.active_to ?? null,
        body?.notes ?? null,
      ]
    );

    await logAuditEvent({
      actorUserCode: actor.user_code,
      action: "Compensation profile upserted",
      entityType: "employee_compensation_profile",
      entityId: result.rows[0]?.compensation_id ?? null,
      details: {
        accountType,
        personId,
        salaryModel,
      },
    });

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("compensation PUT error", error);
    return NextResponse.json({ error: "Failed to save compensation settings" }, { status: 500 });
  }
}
