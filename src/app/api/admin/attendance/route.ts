import pool from "@/database/db";
import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";

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
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const staffId = searchParams.get("staff_id");

    const client = await pool.connect();
    try {
        let query = `
            SELECT a.*, s.name as staff_name, s.user_code 
            FROM staff_attendance a
            JOIN staff s ON a.staff_id = s.staff_id
            WHERE a.date = $1
        `;
        const params: any[] = [date];

        if (staffId) {
            query += ` AND a.staff_id = $2`;
            params.push(staffId);
        }

        const res = await client.query(query, params);
        return NextResponse.json(res.rows);
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
    try {
        const user = await requireAdminOrSuperAdmin(req);
        userCode = user.user_code;
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

    const client = await pool.connect();
    try {
        // 1. Find the staff_id for the given user_code
        const staffRes = await client.query("SELECT staff_id FROM staff WHERE user_code = $1", [user_code]);
        if (staffRes.rows.length === 0) {
            return NextResponse.json({ error: "Staff not found" }, { status: 404 });
        }
        const staff_id = staffRes.rows[0].staff_id;
        const today = new Date().toISOString().split("T")[0];

        // 2. Check if there's already an entry for today
        const existing = await client.query(
            "SELECT * FROM staff_attendance WHERE staff_id = $1 AND date = $2",
            [staff_id, today]
        );

        if (existing.rows.length === 0) {
            // New Check-in
            const insertRes = await client.query(
                `INSERT INTO staff_attendance (staff_id, date, check_in_time, status, marked_by) 
                 VALUES ($1, $2, CURRENT_TIMESTAMP, 'Present', $3) 
                 RETURNING *`,
                [staff_id, today, marked_by || "System"]
            );
            await logAuditEvent(
                {
                    actorUserCode: userCode,
                    action: "Attendance check-in marked",
                    entityType: "staff_attendance",
                    entityId: insertRes.rows[0]?.attendance_id ?? null,
                    details: {
                        staffId: Number(staff_id),
                        date: today,
                        markedBy: marked_by || "System",
                        event: "check_in",
                    },
                },
                client
            );
            return NextResponse.json({ message: "Check-in successful", data: insertRes.rows[0] });
        } else {
            // Check-out (if not already checked out)
            const record = existing.rows[0];
            if (record.check_out_time) {
                return NextResponse.json({ message: "Already checked out today", data: record });
            }

            const updateRes = await client.query(
                `UPDATE staff_attendance 
                 SET check_out_time = CURRENT_TIMESTAMP 
                 WHERE attendance_id = $1 
                 RETURNING *`,
                [record.attendance_id]
            );
            await logAuditEvent(
                {
                    actorUserCode: userCode,
                    action: "Attendance check-out marked",
                    entityType: "staff_attendance",
                    entityId: updateRes.rows[0]?.attendance_id ?? null,
                    details: {
                        staffId: Number(staff_id),
                        date: today,
                        markedBy: marked_by || "System",
                        event: "check_out",
                    },
                },
                client
            );
            return NextResponse.json({ message: "Check-out successful", data: updateRes.rows[0] });
        }
    } catch (err) {
        console.error("Attendance POST Error:", err);
        return NextResponse.json({ error: "Failed to mark attendance" }, { status: 500 });
    } finally {
        client.release();
    }
}
