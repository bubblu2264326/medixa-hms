import { query } from "@/database/db";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        await getAuthenticatedUser(req);
        const res = await query('select doctor_id, doctor_name from doctor;');
        return NextResponse.json(res.rows, { status: 200 });
    } catch (err) {
        if (err instanceof AuthError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        console.error(err);
        return NextResponse.json({ error: "Failed to fetch doctors list" }, { status: 500 });
    }
}
