import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";
import { query } from "@/database/db";

function getRequestMeta(req: NextRequest) {
    return {
        ip:
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            null,
        userAgent: req.headers.get("user-agent") || null,
    };
}

export async function POST(req:NextRequest){
    const requestMeta = getRequestMeta(req);
    try {
        const user = await getAuthenticatedUser(req);
        if (user.account_type === "doctor" && user.session_id) {
            await query(
                `
                UPDATE doctor_security_sessions
                SET revoked_at = CURRENT_TIMESTAMP,
                    revoked_reason = 'logout'
                WHERE session_id::text = $1
                `,
                [user.session_id]
            );
        } else if (user.session_id) {
            await query(
                `
                UPDATE staff_security_sessions
                SET revoked_at = CURRENT_TIMESTAMP,
                    revoked_reason = 'logout'
                WHERE session_id::text = $1
                `,
                [user.session_id]
            );
        }
        await logAuditEvent({
            actorUserCode: user.user_code,
            action: "Logout",
            entityType: "auth",
            entityId: user.user_code,
            details: {
                userCode: user.user_code,
                userName: user.name,
                role: user.role,
                outcome: "success",
                ...requestMeta,
            },
        });
    } catch {
        // Ignore auth extraction errors during logout to avoid blocking cookie cleanup.
    }

    const res=NextResponse.json({success:true});
    res.cookies.set("token","",{
        httpOnly:true,
        maxAge:0,
        sameSite:"lax",
        path:"/"
    })
    return res;
}
