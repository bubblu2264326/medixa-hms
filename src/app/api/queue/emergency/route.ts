import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { NextRequest,NextResponse } from "next/server";

export async function GET(req: NextRequest){
 try {
    await getAuthenticatedUser(req);
    //will get info from visit and ppatient table
    const data=[
    {
        patientId:"2",
        patientName:"Bablu",
        clinicNo:"2",
        doctor:"Dr Saad"
    },
     {
        patientId:"3",
        patientName:"Dablu",
        clinicNo:"3",
        doctor:"Dr Saad"
    },
];
return NextResponse.json(data,{status:200})
 } catch (err) {
    if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "something went wrong" }, { status: 500 });
 }
}
