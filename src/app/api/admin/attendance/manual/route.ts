import pool from "@/database/db";
import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";
import {
    AttendanceAccountType,
    getAttendancePolicy,
    previewManualAttendance,
    recomputeAndPersistAttendance,
} from "@/src/lib/server/attendance";

function normalizeTimeInput(value: unknown) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
}

// POST: Admin manual entry or override for staff attendance
export async function POST(req: NextRequest) {
    try {
        const user = await requireAdminOrSuperAdmin(req);
        const {
            staff_id,
            person_id,
            account_type,
            date,
            status,
            check_in_time,
            check_out_time,
            reason,
        } = await req.json();
        const accountType: AttendanceAccountType = account_type === "doctor" ? "doctor" : "staff";
        const employeeId = Number(person_id ?? staff_id);

        if (!employeeId || !date || !status) {
            return NextResponse.json(
                { error: "Missing required fields (employee id, date, status)" },
                { status: 400 }
            );
        }

        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const attendanceTable = accountType === "doctor" ? "doctor_attendance" : "staff_attendance";
            const personIdColumn = accountType === "doctor" ? "doctor_id" : "staff_id";

            const beforeResult = await client.query(
                `
                SELECT *
                FROM ${attendanceTable}
                WHERE ${personIdColumn} = $1
                  AND date = $2::date
                LIMIT 1
                `,
                [employeeId, String(date)]
            );
            const before = beforeResult.rows[0] ?? null;

            const checkIn = normalizeTimeInput(check_in_time);
            const checkOut = normalizeTimeInput(check_out_time);
            const upsertSql = `
                INSERT INTO ${attendanceTable} (
                  ${personIdColumn},
                  date,
                  status,
                  check_in_time,
                  check_out_time,
                  marked_by,
                  admin_id,
                  check_in_source,
                  check_out_source
                )
                VALUES (
                  $1,
                  $2::date,
                  $3,
                  CASE WHEN $4 IS NULL THEN NULL ELSE ($2::date + $4::time) END,
                  CASE WHEN $5 IS NULL THEN NULL ELSE ($2::date + $5::time) END,
                  'Admin',
                  (SELECT staff_id FROM staff WHERE user_code = $6),
                  CASE WHEN $4 IS NULL THEN NULL ELSE 'admin' END,
                  CASE WHEN $5 IS NULL THEN NULL ELSE 'admin' END
                )
                ON CONFLICT (${personIdColumn}, date) DO UPDATE SET
                  status = EXCLUDED.status,
                  check_in_time = COALESCE(EXCLUDED.check_in_time, ${attendanceTable}.check_in_time),
                  check_out_time = COALESCE(EXCLUDED.check_out_time, ${attendanceTable}.check_out_time),
                  admin_id = EXCLUDED.admin_id,
                  marked_by = EXCLUDED.marked_by,
                  check_in_source = COALESCE(EXCLUDED.check_in_source, ${attendanceTable}.check_in_source),
                  check_out_source = COALESCE(EXCLUDED.check_out_source, ${attendanceTable}.check_out_source)
                RETURNING *
            `;
            const res = await client.query(upsertSql, [
                employeeId,
                String(date),
                String(status),
                checkIn,
                checkOut,
                user.user_code,
            ]);
            const saved = res.rows[0];
            const policy = await getAttendancePolicy();
            const computed = await recomputeAndPersistAttendance(String(saved.attendance_id), policy, accountType);
            const afterResult = await client.query(
                `
                SELECT *
                FROM ${attendanceTable}
                WHERE attendance_id = $1
                LIMIT 1
                `,
                [saved.attendance_id]
            );
            const after = afterResult.rows[0] ?? saved;

            await logAuditEvent(
                {
                    actorUserCode: user.user_code,
                    action: "Attendance adjusted manually",
                    entityType: attendanceTable,
                    entityId: saved?.attendance_id ?? null,
                    details: {
                        staffId: employeeId,
                        accountType,
                        date,
                        status,
                        checkInTime: checkIn ?? null,
                        checkOutTime: checkOut ?? null,
                        source: "admin",
                        reason: typeof reason === "string" ? reason.trim() : null,
                        computed,
                        before,
                        after,
                    },
                },
                client
            );
            await client.query("COMMIT");
            return NextResponse.json({ message: "Attendance record updated manually", data: after, computed });
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    } catch (err) {
        if (err instanceof AuthError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        console.error("Manual Attendance POST Error:", err);
        return NextResponse.json({ error: "Failed to record manual attendance" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        await requireAdminOrSuperAdmin(req);
        const { staff_id, person_id, account_type, date, status, check_in_time, check_out_time } = await req.json();
        const accountType: AttendanceAccountType = account_type === "doctor" ? "doctor" : "staff";
        const employeeId = Number(person_id ?? staff_id);
        if (!employeeId || !date) {
            return NextResponse.json({ error: "Missing required fields (employee id, date)" }, { status: 400 });
        }

        const preview = await previewManualAttendance({
            personId: employeeId,
            accountType,
            date: String(date),
            status: typeof status === "string" ? status : "Present",
            checkInTime: normalizeTimeInput(check_in_time),
            checkOutTime: normalizeTimeInput(check_out_time),
        });

        return NextResponse.json({ preview });
    } catch (err) {
        if (err instanceof AuthError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        console.error("Manual Attendance Preview Error:", err);
        return NextResponse.json({ error: "Failed to preview manual attendance" }, { status: 500 });
    }
}
