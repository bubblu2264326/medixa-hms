import pool from "@/database/db";
import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";
import {
    evaluateAttendance,
    getAttendancePolicy,
    markAttendanceByUserCode,
} from "@/src/lib/server/attendance";
import {
    getCurrentDateInTimezone,
    getSystemTimezone,
    parseDbUtcNaiveTimestamp,
} from "@/src/lib/server/systemTimezone";

// GET: Fetch attendance records (can filter by date or staff_id)
export async function GET(req: NextRequest) {
    try {
        await requireAdminOrSuperAdmin(req);
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const timeZone = await getSystemTimezone();
    const date = searchParams.get("date") || getCurrentDateInTimezone(timeZone);
    const staffId = searchParams.get("staff_id");
    const accountType = searchParams.get("account_type");

    const client = await pool.connect();
    try {
        const policy = await getAttendancePolicy();
        const params: any[] = [date];
        const filters: string[] = [];
        if (staffId) {
            params.push(Number(staffId));
            filters.push(`person_id = $${params.length}`);
        }
        if (accountType === "staff" || accountType === "doctor") {
            params.push(accountType);
            filters.push(`account_type = $${params.length}`);
        }

        const filterSql = filters.length ? ` WHERE ${filters.join(" AND ")}` : "";
        const sql = `
            SELECT *
            FROM (
              SELECT
                a.attendance_id,
                a.date,
                a.status,
                a.check_in_time,
                a.check_out_time,
                a.marked_by,
                a.check_in_source,
                a.check_out_source,
                a.late_minutes,
                a.early_leave_minutes,
                a.overtime_minutes,
                a.derived_status,
                a.is_unscheduled,
                a.is_on_time,
                a.shift_code,
                a.roster_id,
                a.policy_snapshot,
                s.staff_id AS person_id,
                s.user_code,
                s.name AS staff_name,
                'staff'::text AS account_type,
                st.shift_code AS roster_shift_code,
                st.shift_name AS roster_shift_name,
                st.start_time::text AS roster_start_time,
                st.end_time::text AS roster_end_time,
                st.is_night_shift AS roster_is_night_shift
              FROM staff_attendance a
              JOIN staff s ON a.staff_id = s.staff_id
              LEFT JOIN staff_roster_assignments r
                ON r.staff_id = a.staff_id
                AND r.roster_date = a.date
              LEFT JOIN staff_shift_templates st
                ON st.shift_template_id = r.shift_template_id
              WHERE a.date = $1

              UNION ALL

              SELECT
                a.attendance_id,
                a.date,
                a.status,
                a.check_in_time,
                a.check_out_time,
                a.marked_by,
                a.check_in_source,
                a.check_out_source,
                a.late_minutes,
                a.early_leave_minutes,
                a.overtime_minutes,
                a.derived_status,
                a.is_unscheduled,
                a.is_on_time,
                a.shift_code,
                a.roster_id,
                a.policy_snapshot,
                d.doctor_id AS person_id,
                d.user_code,
                d.doctor_name AS staff_name,
                'doctor'::text AS account_type,
                st.shift_code AS roster_shift_code,
                st.shift_name AS roster_shift_name,
                st.start_time::text AS roster_start_time,
                st.end_time::text AS roster_end_time,
                st.is_night_shift AS roster_is_night_shift
              FROM doctor_attendance a
              JOIN doctor d ON a.doctor_id = d.doctor_id
              LEFT JOIN staff_roster_assignments r
                ON r.roster_id = a.roster_id
              LEFT JOIN staff_shift_templates st
                ON st.shift_template_id = r.shift_template_id
              WHERE a.date = $1
            ) t
            ${filterSql}
            ORDER BY staff_name ASC
        `;

        const res = await client.query(sql, params);
        const payload = res.rows.map((row: any) => {
            const derived = evaluateAttendance(
                {
                    date: String(row.date),
                    checkInTime: parseDbUtcNaiveTimestamp(row.check_in_time),
                    checkOutTime: parseDbUtcNaiveTimestamp(row.check_out_time),
                    status: row.status,
                    roster: row.roster_id
                        ? {
                              roster_id: Number(row.roster_id),
                              shift_code: row.roster_shift_code ?? null,
                              shift_name: row.roster_shift_name ?? null,
                              start_time: row.roster_start_time ?? null,
                              end_time: row.roster_end_time ?? null,
                              is_night_shift: Boolean(row.roster_is_night_shift ?? false),
                          }
                        : null,
                },
                policy
            );

            return {
                ...row,
                staff_id: Number(row.person_id),
                derived_status: row.derived_status ?? derived.derived_status,
                is_unscheduled: row.is_unscheduled ?? derived.is_unscheduled,
                is_on_time: row.is_on_time ?? derived.is_on_time,
                late_minutes: Number(row.late_minutes ?? derived.late_minutes ?? 0),
                early_leave_minutes: Number(row.early_leave_minutes ?? derived.early_leave_minutes ?? 0),
                overtime_minutes: Number(row.overtime_minutes ?? derived.overtime_minutes ?? 0),
                attendance_message: derived.message,
            };
        });
        const summary = {
            total_staff: payload.length,
            present_today: payload.filter((row: any) =>
                ["on_time", "late", "early_leave", "overtime", "unscheduled", "half_day"].includes(
                    String(row.derived_status ?? "").toLowerCase()
                )
            ).length,
            absent: payload.filter((row: any) => String(row.derived_status ?? "").toLowerCase() === "absent").length,
            late_or_half_day: payload.filter((row: any) =>
                ["late", "half_day"].includes(String(row.derived_status ?? "").toLowerCase())
            ).length,
            unscheduled: payload.filter((row: any) => Boolean(row.is_unscheduled)).length,
        };
        return NextResponse.json({ records: payload, summary });
    } catch (err) {
        console.error("Attendance GET Error:", err);
        return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
    } finally {
        client.release();
    }
}

// POST: Mark attendance (Hybrid endpoint for Fingerprint/Mobile)
export async function POST(req: NextRequest) {
    let userCode = "system";
    let role = "Admin";
    try {
        const user = await requireAdminOrSuperAdmin(req);
        userCode = user.user_code;
        role = user.role;
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { user_code, marked_by } = body;

    if (!user_code) {
        return NextResponse.json({ error: "user_code is required" }, { status: 400 });
    }

    try {
        const result = await markAttendanceByUserCode({
            userCode: String(user_code),
            source: "admin",
            markedBy: marked_by || role || "Admin",
            event: "auto",
        });
        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const accountType = result.data.account_type ?? "staff";

        await logAuditEvent({
            actorUserCode: userCode,
            action: result.data.event === "check_out" ? "Attendance check-out marked" : "Attendance check-in marked",
            entityType: accountType === "doctor" ? "doctor_attendance" : "staff_attendance",
            entityId: result.data.attendance_id,
            details: {
                staffId: result.data.staff_id,
                accountType,
                userCode: result.data.user_code,
                source: result.data.source,
                markedBy: marked_by || role || "Admin",
                event: result.data.event,
                date: result.data.date,
                derivedStatus: result.data.derived_status,
                message: result.data.message,
            },
        });

        return NextResponse.json({
            message: result.data.event === "check_out" ? "Check-out successful" : "Check-in successful",
            data: result.data,
        });
    } catch (err) {
        console.error("Attendance POST Error:", err);
        return NextResponse.json({ error: "Failed to mark attendance" }, { status: 500 });
    }
}
