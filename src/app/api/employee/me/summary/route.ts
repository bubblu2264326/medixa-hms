import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { monthBounds, monthStartFromInput, resolvePersonByUserCode } from "@/src/lib/server/workforceFinance";
import { getCurrentDateInTimezone, getSystemTimezone } from "@/src/lib/server/systemTimezone";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const person = await resolvePersonByUserCode(user.user_code);

    if (!person) {
      return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
    }

    const { monthStart, monthEndExclusive } = monthBounds(monthStartFromInput());
    const systemTimezone = await getSystemTimezone();
    const localDate = getCurrentDateInTimezone(systemTimezone);
    const localYear = Number(localDate.slice(0, 4));

    const [attendance, compensation, leaveBalances, payroll] = await Promise.all([
      query(
        person.accountType === "doctor"
          ? `
            SELECT
              COUNT(*)::int AS total_days,
              COUNT(*) FILTER (WHERE derived_status IN ('on_time', 'late', 'overtime', 'early_leave', 'half_day'))::int AS present_days,
              COUNT(*) FILTER (WHERE derived_status = 'late')::int AS late_days,
              COALESCE(SUM(overtime_minutes), 0)::int AS overtime_minutes
            FROM doctor_attendance
            WHERE doctor_id = $1
              AND date >= $2::date
              AND date < $3::date
          `
          : `
            SELECT
              COUNT(*)::int AS total_days,
              COUNT(*) FILTER (WHERE derived_status IN ('on_time', 'late', 'overtime', 'early_leave', 'half_day'))::int AS present_days,
              COUNT(*) FILTER (WHERE derived_status = 'late')::int AS late_days,
              COALESCE(SUM(overtime_minutes), 0)::int AS overtime_minutes
            FROM staff_attendance
            WHERE staff_id = $1
              AND date >= $2::date
              AND date < $3::date
          `,
        [person.personId, monthStart, monthEndExclusive]
      ),
      query(
        `
        SELECT *
        FROM employee_compensation_profile
        WHERE account_type = $1
          AND person_id = $2
          AND active_from <= $3::date
          AND (active_to IS NULL OR active_to >= $3::date)
        ORDER BY active_from DESC
        LIMIT 1
        `,
        [person.accountType, person.personId, localDate]
      ),
      query(
        `
        SELECT
          slb.*,
          slt.leave_code,
          slt.leave_name
        FROM staff_leave_balances slb
        JOIN staff_leave_types slt ON slt.leave_type_id = slb.leave_type_id
        WHERE slb.account_type = $1
          AND slb.person_id = $2
          AND slb.period_year = $3::int
        ORDER BY slt.leave_name
        `,
        [person.accountType, person.personId, localYear]
      ),
      query(
        `
        SELECT
          pr.period_month,
          pr.status,
          pli.net_amount,
          pli.gross_amount,
          pli.allowance_total,
          pli.deduction_total
        FROM payroll_line_item pli
        JOIN payroll_run pr ON pr.payroll_run_id = pli.payroll_run_id
        WHERE pli.account_type = $1
          AND pli.person_id = $2
        ORDER BY pr.period_month DESC
        LIMIT 1
        `,
        [person.accountType, person.personId]
      ),
    ]);

    return NextResponse.json({
      employee: person,
      attendance: attendance.rows[0] ?? null,
      compensation: compensation.rows[0] ?? null,
      leave_balances: leaveBalances.rows,
      latest_payroll: payroll.rows[0] ?? null,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("employee summary GET error", error);
    return NextResponse.json({ error: "Failed to load employee summary" }, { status: 500 });
  }
}
