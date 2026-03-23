import pool from "@/database/db";
import { getAuthenticatedDoctor } from "@/src/lib/server/doctor";
import { publishQueueInvalidation } from "@/src/lib/server/queueEvents";
import { transitionDoctorVisitStatus } from "@/src/lib/server/doctorWorkspace";
import { NextRequest, NextResponse } from "next/server";
import { parseVisitStatus } from "@/src/lib/server/visitLifecycle";

const DOCTOR_ALLOWED_TARGET_STATUSES = new Set(["seen_by_doctor", "waiting", "discharged"]);

function getDoctorRouteErrorStatus(message: string) {
  const normalized = message.toLowerCase();
  if (message === "Not authenticated") {
    return 401;
  }

  if (normalized.includes("not found")) {
    return 404;
  }

  if (normalized.includes("invalid doctor status transition") || normalized.includes("no longer actionable")) {
    return 409;
  }

  return 403;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  const client = await pool.connect();

  try {
    const doctor = await getAuthenticatedDoctor(req);
    const { visitId } = await params;
    const body = await req.json();
    const status = String(body.status ?? "");
    const parsedStatus = parseVisitStatus(status);
    if (!parsedStatus || !DOCTOR_ALLOWED_TARGET_STATUSES.has(parsedStatus)) {
      return NextResponse.json({ error: "Invalid visit status" }, { status: 400 });
    }

    await client.query("BEGIN");

    const result = await transitionDoctorVisitStatus(client, {
      visitId: Number(visitId),
      doctorId: doctor.doctor_id,
      nextStatus: parsedStatus,
    });

    await client.query("COMMIT");
    publishQueueInvalidation("doctor-visit-status-updated");
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to update doctor visit status";
    const status = getDoctorRouteErrorStatus(message);
    return NextResponse.json({ error: message }, { status });
  } finally {
    client.release();
  }
}
