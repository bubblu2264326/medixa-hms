import pool from "@/database/db";
import { getAuthenticatedDoctor } from "@/src/lib/server/doctor";
import {
  ensureDoctorLabOrderWriteAccess,
  resolveDoctorVisit,
} from "@/src/lib/server/doctorWorkspace";
import { NextRequest, NextResponse } from "next/server";

type LabOrderPayload = {
  test_id: string | number;
  urgency?: string;
};

function getDoctorRouteErrorStatus(message: string) {
  if (message === "Not authenticated") {
    return 401;
  }

  if (message.includes("not found")) {
    return 404;
  }

  if (message.includes("no longer actionable")) {
    return 409;
  }

  return 403;
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();

  try {
    const doctor = await getAuthenticatedDoctor(req);
    const { patient_id, visit_id, tests } = await req.json();

    if (!patient_id || !visit_id || !Array.isArray(tests) || tests.length === 0) {
      return NextResponse.json({ error: "Invalid lab order payload" }, { status: 400 });
    }

    await client.query("BEGIN");

    const visit = await resolveDoctorVisit(client, {
      visitId: Number(visit_id),
      patientId: Number(patient_id),
      doctorId: doctor.doctor_id,
      lock: true,
    });

    if (!visit) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Selected visit was not found for this doctor and patient" },
        { status: 404 }
      );
    }

    ensureDoctorLabOrderWriteAccess(String(visit.status));
    const visitId = Number(visit.visit_id);
    const seenTestIds = new Set<number>();
    const insertedOrders = [];

    for (const test of tests as LabOrderPayload[]) {
      const testId = Number(test.test_id);

      if (!testId) {
        throw new Error("Each lab order row must include a valid test_id");
      }

      if (seenTestIds.has(testId)) {
        throw new Error("Duplicate tests are not allowed in one lab order submit");
      }

      seenTestIds.add(testId);

      const orderResult = await client.query(
        `
          insert into lab_order (visit_id, test_id, ordered_by, status, urgency)
          values ($1, $2, $3, $4, $5)
          returning *
        `,
        [
          visitId,
          testId,
          doctor.doctor_id,
          "Pending",
          test.urgency ?? "Routine",
        ]
      );

      insertedOrders.push(orderResult.rows[0]);
    }

    await client.query("COMMIT");

    return NextResponse.json(
      { visit_id: visitId, orders: insertedOrders },
      { status: 201 }
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to create lab orders";
    const status = getDoctorRouteErrorStatus(message);
    return NextResponse.json({ error: message }, { status });
  } finally {
    client.release();
  }
}
