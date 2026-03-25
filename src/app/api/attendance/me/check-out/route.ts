import { NextRequest, NextResponse } from "next/server";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { markAttendanceByUserCode } from "@/src/lib/server/attendance";
import { logAuditEvent } from "@/src/lib/server/audit";

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser(req);
        const body = await req.json().catch(() => ({}));
        const at = body?.at ? new Date(String(body.at)) : new Date();

        const result = await markAttendanceByUserCode({
            userCode: user.user_code,
            source: "self",
            markedBy: user.role || "Self",
            event: "check_out",
            at: Number.isNaN(at.getTime()) ? new Date() : at,
        });

        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const accountType = result.data.account_type ?? (user.account_type === "doctor" ? "doctor" : "staff");

        await logAuditEvent({
            actorUserCode: user.user_code,
            action: "Attendance check-out marked",
            entityType: accountType === "doctor" ? "doctor_attendance" : "staff_attendance",
            entityId: result.data.attendance_id,
            details: {
                source: "self",
                event: "check_out",
                userCode: user.user_code,
                accountType,
                date: result.data.date,
                derivedStatus: result.data.derived_status,
                message: result.data.message,
            },
        });

        return NextResponse.json({
            message: result.data.message,
            data: result.data,
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Self Check-out Error:", error);
        return NextResponse.json({ error: "Failed to mark check-out" }, { status: 500 });
    }
}
