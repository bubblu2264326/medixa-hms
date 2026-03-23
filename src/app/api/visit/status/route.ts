import { NextRequest, NextResponse } from "next/server";
import {query} from "@/database/db"
import { publishQueueInvalidation } from "@/src/lib/server/queueEvents";
import { getAuthenticatedUser } from "@/src/lib/server/auth";
import { assertVisitStatusTransition, parseVisitStatus } from "@/src/lib/server/visitLifecycle";

async function resolveDoctorIdByUserCode(userCode: string) {
    const res = await query(
        "select doctor_id from doctor where user_code = $1 limit 1",
        [userCode]
    );
    return res.rows[0]?.doctor_id ? Number(res.rows[0].doctor_id) : null;
}

async function resolveStaffIdByUserCode(userCode: string) {
    const res = await query(
        "select staff_id from staff where user_code = $1 limit 1",
        [userCode]
    );
    return res.rows[0]?.staff_id ? Number(res.rows[0].staff_id) : null;
}

export async function PATCH(req:NextRequest){
    const data=await req.json();
    try {
        if (!data.visit_id || !data.status) {
            return NextResponse.json({ error: "visit_id and status are required" }, { status: 400 });
        }
        const user = await getAuthenticatedUser(req);
        const requestedStatus = parseVisitStatus(String(data.status));
        if (!requestedStatus) {
            return NextResponse.json({ error: "Invalid visit status" }, { status: 400 });
        }
        const currentVisit = await query(
            "select visit_id, status from visit where visit_id = $1 and is_deleted = false limit 1",
            [data.visit_id]
        );
        if (currentVisit.rows.length === 0) {
            return NextResponse.json({message:"no patient found for that visist id"},{status:404})
        }
        const currentStatus = String(currentVisit.rows[0].status ?? "");
        assertVisitStatusTransition(currentStatus, requestedStatus, "visit");

        if (requestedStatus === "payment_done" || requestedStatus === "completed") {
            let outstandingDue = 0;
            try {
                const billDueResult = await query(
                    `
                      SELECT
                        GREATEST(
                          COALESCE(b.total_amount, 0) - COALESCE(SUM(cpt.amount), 0),
                          0
                        ) AS outstanding_due
                      FROM bill b
                      LEFT JOIN cashier_payment_txn cpt ON cpt.bill_id = b.bill_id
                      WHERE b.visit_id = $1
                      GROUP BY b.bill_id, b.total_amount
                      ORDER BY b.bill_id DESC
                      LIMIT 1
                    `,
                    [data.visit_id]
                );
                outstandingDue = Number(billDueResult.rows[0]?.outstanding_due ?? 0);
            } catch {
                const fallbackBill = await query(
                    `
                      SELECT
                        COALESCE(total_amount, 0) AS total_amount,
                        COALESCE(payment_status, 'Unpaid') AS payment_status
                      FROM bill
                      WHERE visit_id = $1
                      ORDER BY bill_id DESC
                      LIMIT 1
                    `,
                    [data.visit_id]
                );
                const row = fallbackBill.rows[0];
                if (row) {
                    const status = String(row.payment_status ?? "Unpaid");
                    outstandingDue = status === "Paid" ? 0 : Number(row.total_amount ?? 0);
                }
            }

            if (outstandingDue > 0) {
                return NextResponse.json(
                    { error: "Cannot mark visit as payment_done/completed while dues are pending" },
                    { status: 409 }
                );
            }
        }

        let updatedByDoctor = data.updated_by_doctor ?? null;
        let updatedByStaff = data.updated_by_staff ?? null;

        if (!updatedByDoctor && !updatedByStaff) {
            if (user.role === "Doctor") {
                updatedByDoctor = await resolveDoctorIdByUserCode(user.user_code);
            } else {
                updatedByStaff = await resolveStaffIdByUserCode(user.user_code);
            }
        }

        if (!updatedByDoctor && !updatedByStaff) {
            return NextResponse.json({ error: "Unable to resolve authenticated actor for visit status update" }, { status: 403 });
        }

        await query("call update_and_log_visit_status($1,$2,$3,$4)", [
            data.visit_id,
            requestedStatus,
            updatedByDoctor,
            updatedByStaff,
        ]);
        const res = await query("select * from visit where visit_id = $1", [data.visit_id]);
        publishQueueInvalidation("visit-status-updated");
        return NextResponse.json({data:res.rows[0]},{status:200})
    } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : "DB error on Visit/Status Patch";
        const normalized = message.toLowerCase();
        const status =
            normalized.includes("not authenticated")
                ? 401
                : normalized.includes("invalid visit status transition")
                    ? 409
                    : normalized.includes("pending")
                        ? 409
                    : 500;
        return NextResponse.json({error:message},{status})
    }
}
