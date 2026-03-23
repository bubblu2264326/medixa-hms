import { query } from "@/database/db";
import { ACTIVE_ENCOUNTER_BLOCKING_VISIT_STATUSES } from "@/src/lib/server/visitLifecycle";
import { NextRequest, NextResponse } from "next/server";


export async function GET(req:NextRequest,{params}:{params:Promise<{patientId:string}>}){
      
    const id=(await params).patientId;
    try{
        const res=await query(
            "select v.visit_id,v.patient_id,v.doctor_id,v.visit_timestamp,v.visit_type,v.clinic_number,status,reason,d.doctor_name from visit v join doctor d on v.doctor_id =d.doctor_id where patient_id = $1 and (v.visit_timestamp > current_date and v.visit_timestamp < current_date + interval '1 day') and is_deleted = false and v.status = any($2::text[]) order by v.visit_timestamp desc limit 1 ",[id, ACTIVE_ENCOUNTER_BLOCKING_VISIT_STATUSES]);
       if(res.rows.length >0) return NextResponse.json(res.rows[0],{status:200});
       else return NextResponse.json({error:"No visit founded for that patient"},{status:400})
    }catch(err){
        console.error(err); 
        return NextResponse.json({error:"failed to get visist db error"},{status:500})
    }

}

export async function DELETE(req:NextRequest,{params}:{params:Promise<{patientId:string}>}){
      
    const id=(await params).patientId;
    try{
        const res=await query(
            "update visit set is_deleted = true where visit_id = $1 and is_deleted = false returning *",[id]);
        if(res.rows.length === 0){
            return NextResponse.json({error:"visit not found"},{status:404})
        }
        return NextResponse.json(res.rows[0], { status: 200 });
    }catch(err){
        console.error(err); 
        return NextResponse.json({error:"failed to delete visit"},{status:500})
    }

}
