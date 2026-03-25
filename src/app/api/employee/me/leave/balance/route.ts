import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { resolvePersonByUserCode } from "@/src/lib/server/workforceFinance";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const person = await resolvePersonByUserCode(user.user_code);

    if (!person) {
      return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year") ?? new Date().getFullYear());

    const rows = await query(
      `
      SELECT
        slt.leave_type_id,
        slt.leave_code,
        slt.leave_name,
        COALESCE(leo.annual_quota, lrq.annual_quota, slt.default_annual_quota, 0)::numeric AS entitled,
        COALESCE(slb.opening_balance, 0)::numeric AS opening_balance,
        COALESCE(slb.accrued, 0)::numeric AS accrued,
        COALESCE(slb.consumed, 0)::numeric AS consumed,
        COALESCE(slb.adjusted, 0)::numeric AS adjusted,
        (
          COALESCE(slb.opening_balance, 0) +
          COALESCE(slb.accrued, 0) +
          COALESCE(slb.adjusted, 0) -
          COALESCE(slb.consumed, 0)
        )::numeric AS balance_left
      FROM staff_leave_types slt
      LEFT JOIN staff_leave_balances slb
        ON slb.leave_type_id = slt.leave_type_id
       AND slb.account_type = $1
       AND slb.person_id = $2
       AND slb.period_year = $3
      LEFT JOIN leave_employee_quota_override leo
        ON leo.leave_type_id = slt.leave_type_id
       AND leo.account_type = $1
       AND leo.person_id = $2
       AND leo.active = true
      LEFT JOIN (
        SELECT
          lrq.leave_type_id,
          lrq.annual_quota
        FROM leave_role_quota lrq
        WHERE lrq.role_name = $4
          AND lrq.active = true
      ) lrq ON lrq.leave_type_id = slt.leave_type_id
      WHERE slt.active = true
      ORDER BY slt.leave_name
      `,
      [person.accountType, person.personId, year, person.role]
    );

    return NextResponse.json({
      year,
      account_type: person.accountType,
      person_id: person.personId,
      rows: rows.rows,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("employee leave balance GET error", error);
    return NextResponse.json({ error: "Failed to load leave balance" }, { status: 500 });
  }
}
