import pool from "@/database/db";
import { NextRequest, NextResponse } from "next/server";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";

export async function GET(req:NextRequest,{params}:{params:{test_id:string}}) {
    const TestId=(await params).test_id;
   const client=await  pool.connect();
    try{
     await getAuthenticatedUser(req);
     const res= await client.query("select * from lab_test_parameters where test_id = $1",[TestId]);
       if(res.rows.length <= 0){
           throw new Error("Failed to Get Lab test Parameters from DB");
         }
         return NextResponse.json(res.rows,{status:200});
    }
    catch(err){
        if (err instanceof AuthError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        console.error(err);
        return NextResponse.json({error:err},{status:500})
    }
    finally{
        client.release();
    }

}