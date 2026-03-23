import pool from "@/database/db";
import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";

// POST: Admin manual entry or override for staff attendance
export async function POST(req: NextRequest) {
    try {
        const user = await requireAdminOrSuperAdmin(req);
        const { staff_id, date, status, check_in_time, check_out_time } = await req.json();

        if (!staff_id || !date || !status) {
            return NextResponse.json({ error: "Missing required fields (staff_id, date, status)" }, { status: 400 });
        }

        const client = await pool.connect();
        const query = `
            INSERT INTO staff_attendance (staff_id, date, status, check_in_time, check_out_time, marked_by, admin_id)
            VALUES ($1, $2, $3, $4, $5, 'Admin', (SELECT staff_id FROM staff WHERE user_code = $6))
            ON CONFLICT (staff_id, date) DO UPDATE SET
                status = EXCLUDED.status,
                check_in_time = COALESCE(EXCLUDED.check_in_time, staff_attendance.check_in_time),
                check_out_time = COALESCE(EXCLUDED.check_out_time, staff_attendance.check_out_time),
                admin_id = EXCLUDED.admin_id,
                marked_by = EXCLUDED.marked_by
            RETURNING *
        `;
        try {
            const params = [staff_id, date, status, check_in_time, check_out_time, user.user_code];
            const res = await client.query(query, params);
            await logAuditEvent(
                {
                    actorUserCode: user.user_code,
                    action: "Attendance adjusted manually",
                    entityType: "staff_attendance",
                    entityId: res.rows[0]?.attendance_id ?? null,
                    details: {
                        staffId: Number(staff_id),
                        date,
                        status,
                        checkInTime: check_in_time ?? null,
                        checkOutTime: check_out_time ?? null,
                    },
                },
                client
            );
            return NextResponse.json({ message: "Attendance record updated manually", data: res.rows[0] });
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
