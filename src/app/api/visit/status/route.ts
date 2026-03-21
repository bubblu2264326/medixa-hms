import { NextRequest, NextResponse } from "next/server";
import {query} from "@/database/db"
import { publishQueueInvalidation } from "@/src/lib/server/queueEvents";
import { getCurrentStaffId } from "@/src/lib/utils";
///there is  a procedure which are doing work of /visisttStatus History and /Status 



export async function PATCH(req:NextRequest){
    const data=await req.json();
    try {
        if (!data.visit_id || !data.status) {
            return NextResponse.json({ error: "visit_id and status are required" }, { status: 400 });
        }
        await query("call update_and_log_visit_status($1,$2,$3,$4)", [
            data.visit_id,
            data.status,
            data.updated_by_doctor ?? null,
            data.updated_by_staff ?? getCurrentStaffId(),
        ]);
        const res = await query("select * from visit where visit_id = $1", [data.visit_id]);
        if(res.rows.length === 0){
            return NextResponse.json({message:"no patient found for that visist id"},{status:404})
        }
        publishQueueInvalidation("visit-status-updated");
        return NextResponse.json({data:res.rows[0]},{status:200})
    } catch (err) {
        console.error(err);
        return NextResponse.json({error:"DB error on Visit/Status Patch "},{status:500})
    }
}
