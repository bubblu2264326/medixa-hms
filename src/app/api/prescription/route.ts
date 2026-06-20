

// app/api/prescription/route.ts
import { NextRequest, NextResponse } from "next/server";
import  pool  from "@/database/db"; // adjust according to your DB setup
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";

export async function POST(req: NextRequest) {
  try {
    await getAuthenticatedUser(req);
    const { patient_id, prescriptions } = await req.json();

    if (!patient_id || !prescriptions?.length) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Extract doctor_id from the first prescription
    const doctor_id = prescriptions[0]?.doctor_id;
    
    if (!doctor_id) {
      return NextResponse.json({ error: "Doctor ID is required" }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");
        const  visit_res=await fetch(`http://localhost:3000/api/visit/${patient_id}`);
        if (!visit_res.ok) {
        throw new Error(`Failed to fetch visit: ${visit_res.statusText}`);
      }
        const visit_id=(await visit_res.json()).visit_id;
        console.log(visit_id);
        
      // Insert into prescription table
      
      
      const presRes = await client.query(
        `INSERT INTO prescription (visit_id, doctor_id) 
         VALUES ($1, $2) RETURNING *`,
        [visit_id, doctor_id]
      );

      const prescriptionId = presRes.rows[0].prescription_id;
      console.log(prescriptions);
      
      // Insert medicines into prescription_medicines table
      const insertPromises = prescriptions.map((p: any) =>
        client.query(
          `INSERT INTO prescription_medicines
           (prescription_id, medicine_id, dosage, instructions, prescribed_quantity, dispensed_quantity, frequency, duration,dispensed_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7,$8,$9)`,
          [
            prescriptionId,
            p.medicine_id,
            p.dosage,
            p.instructions,
            p.prescribed_quantity,
            p.dispensed_quantity || 0, // Default to 0 if not provided
            p.frequency,
            p.duration,
            null
          ]
        )
      );

      await Promise.all(insertPromises);
      await client.query("COMMIT");

      return NextResponse.json({ success: true, prescriptionId });
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


export async function PATCH(req:NextRequest){
    try {
        await getAuthenticatedUser(req);
        const data=await req.json();

        return NextResponse.json(data);
    } catch (err) {
        if (err instanceof AuthError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}