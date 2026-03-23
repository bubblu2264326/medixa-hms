import pool from "@/database/db";
import { getAuthenticatedDoctor } from "@/src/lib/server/doctor";
import {
  ensureDoctorSoftDeleteAccess,
  resolveDoctorVisit,
} from "@/src/lib/server/doctorWorkspace";
import { publishQueueInvalidation } from "@/src/lib/server/queueEvents";
import { NextRequest, NextResponse } from "next/server";

function getDoctorRouteErrorStatus(message: string) {
  const normalized = message.toLowerCase();
  if (message === "Not authenticated") {
    return 401;
  }

  if (normalized.includes("not found")) {
    return 404;
  }

  if (normalized.includes("hard-locked") || normalized.includes("cannot be deleted")) {
    return 409;
  }

  return 403;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  const client = await pool.connect();

  try {
    const doctor = await getAuthenticatedDoctor(req);
    const { visitId } = await params;
    const parsedVisitId = Number(visitId);

    await client.query("BEGIN");

    const visit = await resolveDoctorVisit(client, {
      visitId: parsedVisitId,
      doctorId: doctor.doctor_id,
      lock: true,
    });

    if (!visit) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Visit not found for this doctor" },
        { status: 404 }
      );
    }

    ensureDoctorSoftDeleteAccess(String(visit.status));

    // Log actor + timestamp in visit history before deletion.
    await client.query(`call update_and_log_visit_status($1,$2,$3,$4)`, [
      parsedVisitId,
      String(visit.status),
      doctor.doctor_id,
      null,
    ]);

    const deletedResult = await client.query(
      `
        update visit
        set is_deleted = true
        where visit_id = $1
          and doctor_id = $2
          and is_deleted = false
        returning visit_id, patient_id, doctor_id, status, is_deleted
      `,
      [parsedVisitId, doctor.doctor_id]
    );

    if (deletedResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    await client.query("COMMIT");
    publishQueueInvalidation("doctor-visit-soft-deleted");

    return NextResponse.json(
      {
        visit: deletedResult.rows[0],
        audit: {
          actor_doctor_id: doctor.doctor_id,
          old_is_deleted: false,
          new_is_deleted: true,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to soft delete doctor visit";
    const status = getDoctorRouteErrorStatus(message);
    return NextResponse.json({ error: message }, { status });
  } finally {
    client.release();
  }
}
