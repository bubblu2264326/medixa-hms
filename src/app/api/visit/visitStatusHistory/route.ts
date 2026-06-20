

///will update 
///there is  a procedure which are doing work of /visisttStatus History and /Status 
import { query } from "@/database/db";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req:NextRequest){
     const data=await req.json();

     try{
      await getAuthenticatedUser(req);
      const res=await query("insert into visit_status_history(visit_id,status,updated_by_doctor,updated_by_staff) values($1,$2,$3,$4) returning *",[data.visit_id,data.status,data.updated_by_doctor,data.updated_by_staff])
      return NextResponse.json({data:res.rows[0]},{status:200})

     }catch(err){
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error(err);
      return NextResponse.json({error:"Erroe form visit/visitStatusHitory"})
     }
}