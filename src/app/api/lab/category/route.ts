import { query } from "@/database/db";
import { NextRequest, NextResponse } from "next/server";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";

export async function GET(
  req: NextRequest
) {

 try {
  await getAuthenticatedUser(req);
  const res=await query("select distinct category from lab_test;");
  return NextResponse.json(res.rows);

 } catch (error) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({error:error},{status:500})

 }

}
