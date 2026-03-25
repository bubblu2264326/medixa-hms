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
    const month = searchParams.get("month");

    const params: any[] = [person.accountType, person.personId];
    const filters: string[] = ["pli.account_type = $1", "pli.person_id = $2"];

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      params.push(`${month}-01`);
      filters.push(`pr.period_month = $${params.length}::date`);
    }

    const rows = await query(
      `
      SELECT
        pr.payroll_run_id,
        pr.period_month,
        pr.status,
        pr.generated_at,
        pr.finalized_at,
        pli.payroll_line_id,
        pli.salary_model,
        pli.base_amount,
        pli.patient_count,
        pli.per_patient_fee,
        pli.allowance_total,
        pli.deduction_total,
        pli.adjustment_total,
        pli.gross_amount,
        pli.net_amount,
        pli.calc_snapshot
      FROM payroll_line_item pli
      JOIN payroll_run pr ON pr.payroll_run_id = pli.payroll_run_id
      WHERE ${filters.join(" AND ")}
      ORDER BY pr.period_month DESC
      `,
      params
    );

    return NextResponse.json(rows.rows);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("employee payroll GET error", error);
    return NextResponse.json({ error: "Failed to load payroll history" }, { status: 500 });
  }
}
