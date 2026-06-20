import { query } from "@/database/db";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { NextRequest, NextResponse } from "next/server";



export async function GET(req:NextRequest,{params}:{params:{patientId:string}}){
  const id=(await params).patientId;
  console.log(id);

 try {
  await getAuthenticatedUser(req);
  const res= await query(`SELECT
    v.visit_id,
    p.prescription_id,
    pm.prescription_medicine_id,
    m.category,
    m.generic_name,
    m.brand_name,
    m.dosage_value,
    m.dosage_unit,
    m.form,
    m.price,
    pm.frequency,
    pm.duration,
    pm.prescribed_quantity,
    pm.dispensed_quantity,
    pm.instructions,
    d.doctor_name AS prescribed_by,
    s.name AS dispensed_by,
    p.created_at::date AS order_date
FROM visit v
JOIN prescription p ON v.visit_id = p.visit_id
JOIN prescription_medicines pm ON p.prescription_id = pm.prescription_id
JOIN medicine m ON m.medicine_id = pm.medicine_id
JOIN doctor d ON d.doctor_id = p.doctor_id
LEFT JOIN staff s ON s.staff_id = pm.dispensed_by
WHERE v.patient_id = $1
ORDER BY v.visit_id DESC;  -- This should show both visit 36 and visit 1

;`,[id])


  return NextResponse.json(res.rows,{status:200})
 } catch (err) {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({error:err},{status:500})
 }




}