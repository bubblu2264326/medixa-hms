import { query } from "@/database/db";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { NextRequest, NextResponse } from "next/server";


export async function GET(req: NextRequest) {
    try {
        await getAuthenticatedUser(req);
        const { searchParams } = new URL(req.url);
        const visitType = searchParams.get('visitType') || 'OPD';

        const clinicNo = await query('select get_clinic_number($1) as "clinicNo"', [visitType]);
        return NextResponse.json(clinicNo.rows[0], { status: 200 });
    } catch (err) {
        if (err instanceof AuthError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        console.error(err);
        return NextResponse.json({ error: "unable to get clinic no " }, { status: 500 })
    }

}