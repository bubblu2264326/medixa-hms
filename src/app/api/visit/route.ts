
import { query } from "@/database/db";
import { publishQueueInvalidation } from "@/src/lib/server/queueEvents";
import {
   ACTIVE_ENCOUNTER_BLOCKING_VISIT_STATUSES,
   assertVisitStatusTransition,
   parseVisitStatus,
} from "@/src/lib/server/visitLifecycle";
import { NextRequest, NextResponse } from "next/server";



export async function PATCH(req: NextRequest) {
   const res = await req.json();
   try {
      if (!res.visit_id) {
         return NextResponse.json({ error: "visit_id is required" }, { status: 400 });
      }
      if (res.status != null) {
         const requestedStatus = parseVisitStatus(String(res.status));
         if (!requestedStatus) {
            return NextResponse.json({ error: "Invalid visit status" }, { status: 400 });
         }
         const currentVisit = await query(
            "select status from visit where visit_id = $1 and is_deleted = false limit 1",
            [res.visit_id]
         );
         if (currentVisit.rows.length === 0) {
            return NextResponse.json({ error: "visit not found" }, { status: 404 });
         }
         assertVisitStatusTransition(String(currentVisit.rows[0].status ?? ""), requestedStatus, "visit");
      }
      const v_res = await query(
         "update visit set doctor_id = $2, visit_type = $3, clinic_number = $4, status = $5, reason = $6 where visit_id = $1 and is_deleted = false returning *",
         [res.visit_id, res.doctor_id, res.visit_type, res.clinic_number, res.status, res.reason]
      );
      if (v_res.rows.length === 0) {
         return NextResponse.json({ error: "visit not found" }, { status: 404 });
      }

      publishQueueInvalidation("visit-updated");
      return NextResponse.json(v_res.rows[0]);
   } catch (err) {
      console.error(err);
      return NextResponse.json({ error: "failed to update visist" }, { status: 500 });
   }
}

export async function POST(req: NextRequest) {
   const res = await req.json();
   console.log(res);
   try {
      const checkRes = await query(
         "SELECT visit_id FROM visit WHERE patient_id = $1 AND (visit_timestamp > current_date AND visit_timestamp < current_date + interval '1 day') AND status = any($2::text[]) AND is_deleted = false LIMIT 1",
         [res.patient_id, ACTIVE_ENCOUNTER_BLOCKING_VISIT_STATUSES]
      );

      if (checkRes.rows.length > 0) {
         return NextResponse.json(
            { error: "Active visit already exists for this patient today" },
            { status: 409 }
         );
      }

      const v_res = await query('insert into visit(patient_id,doctor_id,visit_type,clinic_number,status,reason) values($1,$2,$3,$4,$5,$6) returning *;', [res.patient_id, res.doctor_id, res.visit_type, res.clinic_number, "waiting", res.reason]);
      console.log(v_res.rows[0]);
      const bill_res = await query("insert into bill(patient_id,visit_id,total_amount,payment_status) values($1,$2,$3,$4) returning *", [res.patient_id, v_res.rows[0].visit_id, 0, "Unpaid"]);
      console.log(bill_res.rows[0]);

      publishQueueInvalidation("visit-created");
      return NextResponse.json(v_res.rows[0]);
   } catch (err: any) {
      console.error(err);
      return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
   }


}

export async function DELETE(req: NextRequest) {
   const res = await req.json();
   try {
      if (!res.visit_id) {
         return NextResponse.json({ error: "visit_id is required" }, { status: 400 });
      }
      const deletedVisit = await query(
         "update visit set is_deleted = true where visit_id = $1 and is_deleted = false returning *",
         [res.visit_id]
      );
      if (deletedVisit.rows.length === 0) {
         return NextResponse.json({ error: "visit not found" }, { status: 404 });
      }
      publishQueueInvalidation("visit-deleted");
      return NextResponse.json(deletedVisit.rows[0], { status: 200 });
   } catch (err) {
      console.error(err);
      return NextResponse.json({ error: "failed to delete visit" }, { status: 500 });
   }
}
