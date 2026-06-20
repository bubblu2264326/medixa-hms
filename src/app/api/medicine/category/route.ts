import { query } from "@/database/db";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { NextRequest, NextResponse } from "next/server";



export async function GET(req: NextRequest) {
    try {
        await getAuthenticatedUser(req);
        const  res=await query(`
            SELECT name AS category
            FROM medicine_category
            WHERE is_active = true
            ORDER BY name ASC
        `);
        return NextResponse.json(res.rows)

    } catch (err) {
         if (err instanceof AuthError) {
             return NextResponse.json({ error: err.message }, { status: err.status });
         }
         console.error(err);
         return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
    }
}
