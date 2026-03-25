import { NextRequest, NextResponse } from "next/server";
import { markAttendanceByUserCode, getAttendancePolicy } from "@/src/lib/server/attendance";
import { logAuditEvent } from "@/src/lib/server/audit";

function normalizeEvent(input: unknown): "check_in" | "check_out" | "auto" {
    const value = String(input ?? "auto").trim().toLowerCase();
    if (value === "check-in" || value === "check_in" || value === "in") return "check_in";
    if (value === "check-out" || value === "check_out" || value === "out") return "check_out";
    return "auto";
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const headerApiKey = req.headers.get("x-attendance-device-key");
        const bodyApiKey = typeof body?.api_key === "string" ? body.api_key : null;
        const policy = await getAttendancePolicy();
        const expectedApiKey = String(policy.device_api_key ?? "");

        if (!expectedApiKey || (headerApiKey !== expectedApiKey && bodyApiKey !== expectedApiKey)) {
            return NextResponse.json({ error: "Invalid device API key" }, { status: 401 });
        }

        const userCode = String(body?.user_code ?? body?.biometric_token ?? "")
            .trim()
            .toUpperCase();
        if (!userCode) {
            return NextResponse.json({ error: "user_code or biometric_token is required" }, { status: 400 });
        }

        const event = normalizeEvent(body?.event);
        const at = body?.at ? new Date(String(body.at)) : new Date();
        const markedBy = String(body?.device_id ?? body?.terminal_id ?? "Attendance Device");
        const result = await markAttendanceByUserCode({
            userCode,
            source: "device",
            markedBy,
            event,
            at: Number.isNaN(at.getTime()) ? new Date() : at,
        });

        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const accountType = result.data.account_type ?? "staff";

        await logAuditEvent({
            action: "Attendance device event processed",
            entityType: accountType === "doctor" ? "doctor_attendance" : "staff_attendance",
            entityId: result.data.attendance_id,
            details: {
                source: "device",
                event: result.data.event,
                accountType,
                userCode: result.data.user_code,
                date: result.data.date,
                deviceId: body?.device_id ?? null,
                terminalId: body?.terminal_id ?? null,
                biometricToken: body?.biometric_token ? "provided" : "missing",
                derivedStatus: result.data.derived_status,
                message: result.data.message,
            },
        });

        return NextResponse.json({
            success: true,
            employee: {
                staff_id: result.data.staff_id,
                user_code: result.data.user_code,
                name: result.data.staff_name,
            },
            punch: {
                event: result.data.event,
                at: result.data.event === "check_out" ? result.data.check_out_time : result.data.check_in_time,
                source: result.data.source,
            },
            outcome: {
                status: result.data.derived_status,
                message: result.data.message,
                late_minutes: result.data.late_minutes,
                overtime_minutes: result.data.overtime_minutes,
                early_leave_minutes: result.data.early_leave_minutes,
                unscheduled: result.data.is_unscheduled,
            },
        });
    } catch (error) {
        console.error("Attendance Device Event Error:", error);
        return NextResponse.json({ error: "Failed to process attendance event" }, { status: 500 });
    }
}
