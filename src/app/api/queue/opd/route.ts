import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        await getAuthenticatedUser(req);
        //will get info from visit and ppatient table
        //return patients with opd only
        const data = [{
            patientId: "1",
            patientName: "saad",
            clinicNo: "1",
            doctor: "Fouzia Ishaq"
        }
        ];
        return NextResponse.json(data, { status: 200 })
    } catch (err) {
        if (err instanceof AuthError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        console.error(err);
        return NextResponse.json({ error: "something went wrong" }, { status: 500 });
    }
}
