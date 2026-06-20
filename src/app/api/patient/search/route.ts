import { query } from "@/database/db";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        await getAuthenticatedUser(req);
        const { searchParams } = new URL(req.url);
        const searchTerm = searchParams.get("q");

        if (!searchTerm) {
            return NextResponse.json({ error: "Search term required" }, { status: 400 });
        }

        const res = await query(
            `SELECT patient_id, patient_name, age, gender, cnic, contact_number 
             FROM patient 
             WHERE patient_name ILIKE $1 
                OR cnic ILIKE $1 
                OR patient_id::text ILIKE $1
             ORDER BY patient_id DESC
             LIMIT 10`,
            [`%${searchTerm}%`]
        );

        return NextResponse.json(res.rows, { status: 200 });
    } catch (err) {
        if (err instanceof AuthError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        console.error("Search API Error:", err);
        return NextResponse.json({ error: "Failed to search patients" }, { status: 500 });
    }
}
