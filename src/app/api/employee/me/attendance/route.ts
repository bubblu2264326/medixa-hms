import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { monthBounds, monthStartFromInput, resolvePersonByUserCode } from "@/src/lib/server/workforceFinance";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const person = await resolvePersonByUserCode(user.user_code);

    if (!person) {
      return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const { monthStart, monthEndExclusive } = monthBounds(monthStartFromInput(month));

    const result = await query(
      person.accountType === "doctor"
        ? `
          SELECT
            attendance_id,
            date,
            check_in_time,
            check_out_time,
            status,
            derived_status,
            late_minutes,
            early_leave_minutes,
            overtime_minutes,
            is_unscheduled,
            shift_code
          FROM doctor_attendance
          WHERE doctor_id = $1
            AND date >= $2::date
            AND date < $3::date
          ORDER BY date DESC
        `
        : `
          SELECT
            attendance_id,
            date,
            check_in_time,
            check_out_time,
            status,
            derived_status,
            late_minutes,
            early_leave_minutes,
            overtime_minutes,
            is_unscheduled,
            shift_code
          FROM staff_attendance
          WHERE staff_id = $1
            AND date >= $2::date
            AND date < $3::date
          ORDER BY date DESC
        `,
      [person.personId, monthStart, monthEndExclusive]
    );

    return NextResponse.json({
      month: monthStart.slice(0, 7),
      rows: result.rows,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("employee attendance GET error", error);
    return NextResponse.json({ error: "Failed to load attendance" }, { status: 500 });
  }
}
