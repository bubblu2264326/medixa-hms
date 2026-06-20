import pool from "@/database/db";
import { getAuthenticatedDoctor } from "@/src/lib/server/doctor";
import { listActiveAllergies } from "@/src/lib/server/allergy";
import {
  ensureDoctorVisitWriteAccess,
  resolveDoctorVisit,
} from "@/src/lib/server/doctorWorkspace";
import {
  canAppendPrescriptionThread,
  shouldCreateNewPrescriptionThread,
} from "@/src/lib/server/visitLifecycle";
import { NextRequest, NextResponse } from "next/server";

type PrescriptionPayload = {
  medicine_id: string | number;
  dosage: string;
  instructions: string;
  prescribed_quantity: number;
  dispensed_quantity?: number;
  frequency: string;
  duration: string;
  available_quantity?: number;
  availability_status?: string;
  availability_note?: string | null;
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
    const { patient_id, visit_id, prescriptions } = await req.json();

    if (!patient_id || !visit_id || !Array.isArray(prescriptions) || prescriptions.length === 0) {
      return NextResponse.json({ error: "Invalid prescription payload" }, { status: 400 });
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

    ensureDoctorVisitWriteAccess(String(visit.status));
    const visitId = Number(visit.visit_id);
    const seenMedicineIds = new Set<number>();

    for (const item of prescriptions as PrescriptionPayload[]) {
      const medicineId = Number(item.medicine_id);

      if (!medicineId) {
        throw new Error("Each prescription row must include a valid medicine_id");
      }
      if (!item.dosage?.trim()) {
        throw new Error("Each prescription row must include a dosage");
      }
      if (!item.frequency?.trim()) {
        throw new Error("Each prescription row must include a frequency");
      }
      if (!item.duration?.trim()) {
        throw new Error("Each prescription row must include a duration");
      }
      if (Number(item.prescribed_quantity) <= 0) {
        throw new Error("Each prescription row must include a positive quantity");
      }
      if (seenMedicineIds.has(medicineId)) {
        throw new Error("Duplicate medicine lines are not allowed in one prescription submit");
      }

      seenMedicineIds.add(medicineId);
    }

    const appendMode = canAppendPrescriptionThread(String(visit.status));
    const newThreadMode = shouldCreateNewPrescriptionThread(String(visit.status));
    const selectionMode: "append" | "new_thread" =
      newThreadMode || !appendMode ? "new_thread" : "append";

    const latestPrescription = await client.query(
      `
        select prescription_id
        from prescription
        where visit_id = $1
        order by prescription_id desc
        limit 1
      `,
      [visitId]
    );

    let prescriptionId = selectionMode === "append"
      ? latestPrescription.rows[0]?.prescription_id
      : null;

    if (!prescriptionId) {
      const prescriptionResult = await client.query(
        `
          insert into prescription (visit_id, doctor_id)
          values ($1, $2)
          returning prescription_id
        `,
        [visitId, doctor.doctor_id]
      );

      prescriptionId = prescriptionResult.rows[0].prescription_id;
    }

    const insertedMedicines = [];

    for (const item of prescriptions as PrescriptionPayload[]) {
      const stockSnapshotResult = await client.query(
        `
          select
            coalesce(max(vp.total_stock_quantity), 0) as available_quantity
          from v_medicine_pos vp
          where vp.id = $1
        `,
        [Number(item.medicine_id)]
      );

      const availableQuantity = Number(stockSnapshotResult.rows[0]?.available_quantity ?? 0);
      const availabilityStatus =
        availableQuantity <= 0
          ? 'out_of_stock'
          : availableQuantity <= 5
            ? 'low_stock'
            : Number(item.prescribed_quantity || 0) > availableQuantity
              ? 'insufficient_stock'
              : 'available';
      const availabilityNote =
        availabilityStatus === 'out_of_stock'
          ? 'Out of stock in pharmacy at prescribing time'
          : availabilityStatus === 'insufficient_stock'
            ? `Only ${availableQuantity} unit(s) available at prescribing time`
            : item.availability_note || null;

      const medicineResult = await client.query(
        `
          insert into prescription_medicines (
            prescription_id,
            medicine_id,
            dosage,
            duration,
            instructions,
            dispensed_by,
            frequency,
            prescribed_quantity,
            dispensed_quantity,
            available_quantity_snapshot,
            availability_status,
            availability_note
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          returning *
        `,
        [
          prescriptionId,
          Number(item.medicine_id),
          item.dosage.trim(),
          item.duration,
          item.instructions,
          null,
          item.frequency,
          Number(item.prescribed_quantity || 0),
          Number(item.dispensed_quantity || 0),
          availableQuantity,
          availabilityStatus,
          availabilityNote,
        ]
      );

      insertedMedicines.push(medicineResult.rows[0]);
    }

    // Prescribe-time allergy check (non-blocking): surface any prescribed drug
    // whose name overlaps an active patient allergy so the doctor is warned.
    const allergyWarnings: { medicine_id: number; drug: string; allergen: string; severity: string }[] = [];
    const allergies = await listActiveAllergies(client, Number(patient_id));
    if (allergies.length > 0) {
      const meds = await client.query(
        `select medicine_id, generic_name, brand_name from medicine where medicine_id = any($1::int[])`,
        [[...seenMedicineIds]]
      );
      for (const m of meds.rows) {
        const names = [m.generic_name, m.brand_name].map((n) => String(n ?? "").toLowerCase()).filter(Boolean);
        for (const a of allergies) {
          const allergen = String(a.allergen ?? "").toLowerCase();
          if (allergen && names.some((n) => n.includes(allergen) || allergen.includes(n))) {
            allergyWarnings.push({ medicine_id: m.medicine_id, drug: m.generic_name || m.brand_name, allergen: a.allergen, severity: a.severity });
            break;
          }
        }
      }
    }

    await client.query("COMMIT");

    return NextResponse.json(
      {
        mode: selectionMode,
        prescription_id: prescriptionId,
        visit_id: visitId,
        medicines: insertedMedicines,
        allergy_warnings: allergyWarnings,
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to create prescription";
    const status = getDoctorRouteErrorStatus(message);
    return NextResponse.json({ error: message }, { status });
  } finally {
    client.release();
  }
}
