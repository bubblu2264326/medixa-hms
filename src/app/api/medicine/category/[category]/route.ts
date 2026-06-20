import { query } from "@/database/db";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { NextRequest, NextResponse } from "next/server";


export async function GET(req:NextRequest,{params}:{params:{category:string}}){
     const ctg=(await params).category;

   try {
      await getAuthenticatedUser(req);
      const res=await query("select * from medicine where category = $1",[ctg]);
      return NextResponse.json(res.rows);

   } catch (err) {
      if (err instanceof AuthError) {
         return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error(err);
      return NextResponse.json({error:"error on category/[category]"})

   }
}