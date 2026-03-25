import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";
import { getAttendancePolicy } from "@/src/lib/server/attendance";

const POLICY_KEYS = {
    grace_minutes: "attendance_grace_minutes",
    half_day_minutes: "attendance_half_day_minutes",
    overtime_minutes: "attendance_overtime_minutes",
    early_leave_minutes: "attendance_early_leave_minutes",
} as const;

function toNumber(value: unknown, fallback: number) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
}

export async function GET(req: NextRequest) {
    try {
        await requireAdminOrSuperAdmin(req);
        const policy = await getAttendancePolicy();
        return NextResponse.json({
            scope: "global_clinic",
            policy: {
                grace_minutes: policy.grace_minutes,
                half_day_minutes: policy.half_day_minutes,
                overtime_minutes: policy.overtime_minutes,
                early_leave_minutes: policy.early_leave_minutes,
            },
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Attendance Policy GET Error:", error);
        return NextResponse.json({ error: "Failed to load attendance policy" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const user = await requireAdminOrSuperAdmin(req);
        const body = await req.json();
        const current = await getAttendancePolicy();
        const next = {
            grace_minutes: toNumber(body?.grace_minutes, current.grace_minutes),
            half_day_minutes: toNumber(body?.half_day_minutes, current.half_day_minutes),
            overtime_minutes: toNumber(body?.overtime_minutes, current.overtime_minutes),
            early_leave_minutes: toNumber(body?.early_leave_minutes, current.early_leave_minutes),
        };

        if (
            next.grace_minutes < 0 ||
            next.half_day_minutes < 1 ||
            next.overtime_minutes < 0 ||
            next.early_leave_minutes < 0
        ) {
            return NextResponse.json({ error: "Invalid policy values" }, { status: 400 });
        }

        const staffResult = await query("SELECT staff_id FROM staff WHERE user_code = $1 LIMIT 1", [user.user_code]);
        const actorStaffId = staffResult.rows[0]?.staff_id ?? null;
        const updates = [
            [POLICY_KEYS.grace_minutes, next.grace_minutes, "Grace period in minutes before late mark starts."],
            [POLICY_KEYS.half_day_minutes, next.half_day_minutes, "Worked minutes threshold for half day."],
            [POLICY_KEYS.overtime_minutes, next.overtime_minutes, "Minimum overtime minutes before overtime status."],
            [POLICY_KEYS.early_leave_minutes, next.early_leave_minutes, "Early leave threshold in minutes."],
        ] as const;

        for (const [key, value, description] of updates) {
            await query(
                `
                INSERT INTO system_settings (setting_key, setting_value, description, updated_by)
                VALUES ($1, $2::jsonb, $3, $4)
                ON CONFLICT (setting_key) DO UPDATE
                SET
                  setting_value = EXCLUDED.setting_value,
                  description = COALESCE(EXCLUDED.description, system_settings.description),
                  updated_by = EXCLUDED.updated_by,
                  updated_at = CURRENT_TIMESTAMP
                `,
                [key, JSON.stringify(value), description, actorStaffId]
            );
        }

        await logAuditEvent({
            actorUserCode: user.user_code,
            action: "Attendance policy updated",
            entityType: "system_settings",
            entityId: "attendance_policy",
            details: {
                source: "admin",
                scope: "global_clinic",
                before: {
                    grace_minutes: current.grace_minutes,
                    half_day_minutes: current.half_day_minutes,
                    overtime_minutes: current.overtime_minutes,
                    early_leave_minutes: current.early_leave_minutes,
                },
                after: next,
            },
        });

        return NextResponse.json({
            message: "Attendance policy updated",
            scope: "global_clinic",
            policy: next,
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Attendance Policy PUT Error:", error);
        return NextResponse.json({ error: "Failed to update attendance policy" }, { status: 500 });
    }
}
