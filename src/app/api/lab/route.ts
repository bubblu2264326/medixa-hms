// app/api/laborder/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/database/db";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";

export async function GET(req:NextRequest){
  const client =await pool.connect();
  try{
    await getAuthenticatedUser(req);
    const res=await client.query("select * from lab_test");
    if(res.rows.length <= 0){
      throw new Error("Failed to Get Lab test from DB");
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


// POST: create a new lab order
export async function POST(req: NextRequest) {
  try {
    await getAuthenticatedUser(req);
    const { patient_id, tests } = await req.json();

    if (!patient_id || !tests?.length) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Extract doctor_id from first test
    const doctor_id = tests[0]?.doctor_id;
    if (!doctor_id) {
      return NextResponse.json({ error: "Doctor ID is required" }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Get visit_id (same as prescription API)
      const visit_res = await fetch(`http://localhost:3000/api/visit/${patient_id}`);
      if (!visit_res.ok) {
        throw new Error(`Failed to fetch visit: ${visit_res.statusText}`);
      }
      const visit_id = (await visit_res.json()).visit_id;

      // Insert lab orders
      const insertPromises = tests.map((t: any) =>
        client.query(
          `INSERT INTO lab_order 
           (visit_id, test_id, ordered_by, performed_by, status) 
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            visit_id,
            t.test_id,
            doctor_id,
            null, // performed_by not known yet
            "Pending", // default status
          ]
        )
      );

      const results = await Promise.all(insertPromises);
      
      await client.query("COMMIT");

      return NextResponse.json(
        { success: true, labOrders: results.map(r => r.rows[0]) },
        { status: 201 }
      );
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Database error:", err);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Server error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH: update lab order (e.g. status or performed_by)
export async function PATCH(req: NextRequest) {
  try {
    await getAuthenticatedUser(req);
    const { order_id, status, performed_by } = await req.json();

    if (!order_id) {
      return NextResponse.json({ error: "order_id required" }, { status: 400 });
    }

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (status) {
      fields.push(`status = $${idx++}`);
      values.push(status);
    }

    if (performed_by) {
      fields.push(`performed_by = $${idx++}`);
      values.push(performed_by);
    }

    if (!fields.length) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    values.push(order_id);

    const res = await pool.query(
      `UPDATE lab_order 
       SET ${fields.join(", ")}, created_at = created_at -- keep created_at unchanged
       WHERE order_id = $${idx}
       RETURNING *`,
      values
    );

    if (!res.rows.length) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, updated: res.rows[0] });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Server error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
