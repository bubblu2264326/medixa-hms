import { NextRequest,NextResponse } from "next/server";
import {query} from '@/database/db'
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";

export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}) {
    const pid=(await params).id;
    //fetch patient details from db
    try{
        await getAuthenticatedUser(req);

        const data=await query('select patient_id, patient_name, age, gender, contact_number, cnic, address, created_at from patient where patient_id = $1',[pid]);

        return NextResponse.json(data.rows[0]);


    }catch(err){
        if (err instanceof AuthError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        console.error(err);
        return NextResponse.json({error:"something went wrong"},{status:500});
    }


}