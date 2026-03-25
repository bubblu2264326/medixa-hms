import { NextRequest, NextResponse } from "next/server";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser(req);

        return NextResponse.json({
            user_code: user.user_code,
            role: user.role,
            name: user.name,
            account_type: user.account_type ?? "staff",
        });
    } catch (err: any) {
        if (err instanceof AuthError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        console.error(err);
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
}
