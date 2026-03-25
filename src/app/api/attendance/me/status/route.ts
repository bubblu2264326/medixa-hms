import { NextRequest, NextResponse } from "next/server";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { getAttendanceRecordByUserCode } from "@/src/lib/server/attendance";

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser(req);
        const record = await getAttendanceRecordByUserCode(user.user_code);

        return NextResponse.json({
            data: record || null,
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Attendance Status Check Error:", error);
        return NextResponse.json({ error: "Failed to load attendance status" }, { status: 500 });
    }
}
