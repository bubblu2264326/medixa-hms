import type { PoolClient } from "pg";

// IPD domain logic. All mutating helpers take a transactional client and are
// meant to run inside BEGIN/COMMIT from the route. Visit status transitions go
// through update_and_log_visit_status so visit_status_history stays authoritative.

export type IpdRunner = Pick<PoolClient, "query">;

export class IpdError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "IpdError";
    this.status = status;
  }
}

export const ADMISSION_TYPES = ["opd_referred", "emergency", "direct", "planned"] as const;
export const DISCHARGE_TYPES = ["normal", "lama", "referred", "transferred", "death", "absconded"] as const;
export const ORDER_TYPES = ["medication", "lab", "radiology", "diet", "iv", "procedure", "nursing"] as const;
export const MAR_ACTIONS = ["given", "refused", "held", "skipped", "missed"] as const;

export type AdmitInput = {
  patientId: number;
  visitId?: number | null;
  attendingDoctorId?: number | null;
  admissionType?: (typeof ADMISSION_TYPES)[number];
  bedId: number;
  provisionalDiagnosis?: string | null;
  createdBy: number | null;
};

// Recompute the room-rent charge (days x current bed rate) for an admission and
// upsert it as a single 'room_rent' line. Idempotent — safe to call repeatedly
// (on bill view, transfer, discharge). Time-based, so it lives here, not in a
// row trigger. v1 uses the current bed's rate across the stay; per-transfer
// rate stints are a v2 refinement.
export async function accrueRoomRent(client: IpdRunner, admissionId: number, postedBy: number | null) {
  await client.query(
    `
    INSERT INTO ip_charge (admission_id, charge_type, description, qty, unit_rate, amount, source_ref, posted_by)
    SELECT a.admission_id, 'room_rent', 'Room charges',
           GREATEST(1, CEIL(EXTRACT(EPOCH FROM (COALESCE(a.discharge_datetime, now()) - a.admission_datetime)) / 86400.0))::numeric,
           COALESCE(b.daily_rate, 0),
           GREATEST(1, CEIL(EXTRACT(EPOCH FROM (COALESCE(a.discharge_datetime, now()) - a.admission_datetime)) / 86400.0))::numeric * COALESCE(b.daily_rate, 0),
           'room_rent', $2
    FROM admission a
    LEFT JOIN bed b ON b.bed_id = a.current_bed_id
    WHERE a.admission_id = $1 AND COALESCE(b.daily_rate, 0) > 0
    ON CONFLICT (admission_id, source_ref) WHERE charge_type = 'room_rent'
    DO UPDATE SET qty = EXCLUDED.qty, unit_rate = EXCLUDED.unit_rate, amount = EXCLUDED.amount, posted_at = now()
    `,
    [admissionId, postedBy]
  );
}

export async function admitPatient(client: IpdRunner, input: AdmitInput) {
  const bed = await client.query(`SELECT bed_id, status FROM bed WHERE bed_id = $1 FOR UPDATE`, [input.bedId]);
  if (bed.rows.length === 0) throw new IpdError("Bed not found", 404);
  if (bed.rows[0].status !== "vacant") throw new IpdError("Bed is not available", 409);

  const adm = await client.query(
    `INSERT INTO admission (patient_id, visit_id, attending_doctor_id, admission_type,
        provisional_diagnosis, current_bed_id, created_by)
     VALUES ($1, $2, $3, COALESCE($4, 'direct'), $5, $6, $7)
     RETURNING admission_id, admission_no`,
    [
      input.patientId,
      input.visitId ?? null,
      input.attendingDoctorId ?? null,
      input.admissionType ?? null,
      input.provisionalDiagnosis ?? null,
      input.bedId,
      input.createdBy,
    ]
  );
  const admissionId: number = adm.rows[0].admission_id;

  await client.query(`UPDATE bed SET status = 'occupied' WHERE bed_id = $1`, [input.bedId]);
  await client.query(
    `INSERT INTO bed_transfer (admission_id, from_bed_id, to_bed_id, reason, by_staff_id)
     VALUES ($1, NULL, $2, 'admission', $3)`,
    [admissionId, input.bedId, input.createdBy]
  );

  if (input.visitId) {
    await client.query(`CALL update_and_log_visit_status($1, $2, $3, $4)`, [
      input.visitId,
      "admitted",
      null,
      input.createdBy,
    ]);
  }
  return { admissionId, admissionNo: adm.rows[0].admission_no as string };
}

export async function transferBed(
  client: IpdRunner,
  opts: { admissionId: number; toBedId: number; reason?: string | null; byStaffId: number | null }
) {
  const adm = await client.query(
    `SELECT current_bed_id, status FROM admission WHERE admission_id = $1 FOR UPDATE`,
    [opts.admissionId]
  );
  if (adm.rows.length === 0) throw new IpdError("Admission not found", 404);
  if (adm.rows[0].status !== "admitted") throw new IpdError("Admission is not active", 409);
  const fromBed = adm.rows[0].current_bed_id;
  if (fromBed != null && Number(fromBed) === Number(opts.toBedId)) {
    throw new IpdError("Patient is already in that bed", 409);
  }
  const tgt = await client.query(`SELECT status FROM bed WHERE bed_id = $1 FOR UPDATE`, [opts.toBedId]);
  if (tgt.rows.length === 0) throw new IpdError("Target bed not found", 404);
  if (tgt.rows[0].status !== "vacant") throw new IpdError("Target bed is not available", 409);

  await accrueRoomRent(client, opts.admissionId, opts.byStaffId);
  if (fromBed) await client.query(`UPDATE bed SET status = 'vacant' WHERE bed_id = $1`, [fromBed]);
  await client.query(`UPDATE bed SET status = 'occupied' WHERE bed_id = $1`, [opts.toBedId]);
  await client.query(`UPDATE admission SET current_bed_id = $2 WHERE admission_id = $1`, [opts.admissionId, opts.toBedId]);
  await client.query(
    `INSERT INTO bed_transfer (admission_id, from_bed_id, to_bed_id, reason, by_staff_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [opts.admissionId, fromBed, opts.toBedId, opts.reason ?? null, opts.byStaffId]
  );
}

export async function dischargePatient(
  client: IpdRunner,
  opts: { admissionId: number; dischargeType: string; finalDiagnosis?: string | null; byStaffId: number | null }
) {
  if (!(DISCHARGE_TYPES as readonly string[]).includes(opts.dischargeType)) {
    throw new IpdError("Invalid discharge_type", 400);
  }
  const adm = await client.query(
    `SELECT visit_id, current_bed_id, status FROM admission WHERE admission_id = $1 FOR UPDATE`,
    [opts.admissionId]
  );
  if (adm.rows.length === 0) throw new IpdError("Admission not found", 404);
  if (adm.rows[0].status !== "admitted") throw new IpdError("Admission already discharged", 409);

  // set discharge first so room-rent accrual bills up to the discharge time
  await client.query(
    `UPDATE admission
        SET status = 'discharged', discharge_datetime = now(), discharge_type = $2,
            final_diagnosis = COALESCE($3, final_diagnosis)
      WHERE admission_id = $1`,
    [opts.admissionId, opts.dischargeType, opts.finalDiagnosis ?? null]
  );
  await accrueRoomRent(client, opts.admissionId, opts.byStaffId);

  const bedId = adm.rows[0].current_bed_id;
  if (bedId) await client.query(`UPDATE bed SET status = 'vacant' WHERE bed_id = $1`, [bedId]);

  await client.query(
    `INSERT INTO ip_final_bill (admission_id, gross_amount, advance_adjusted, net_due)
     SELECT admission_id, total_charges, LEAST(total_advances, total_charges), GREATEST(total_charges - total_advances, 0)
       FROM v_ip_running_bill WHERE admission_id = $1
     ON CONFLICT (admission_id) DO UPDATE
       SET gross_amount = EXCLUDED.gross_amount, advance_adjusted = EXCLUDED.advance_adjusted,
           net_due = EXCLUDED.net_due, updated_at = now()`,
    [opts.admissionId]
  );

  if (adm.rows[0].visit_id) {
    await client.query(`CALL update_and_log_visit_status($1, $2, $3, $4)`, [
      adm.rows[0].visit_id,
      "discharged",
      null,
      opts.byStaffId,
    ]);
  }
}

export async function getRunningBill(runner: IpdRunner, admissionId: number) {
  const r = await runner.query(`SELECT * FROM v_ip_running_bill WHERE admission_id = $1`, [admissionId]);
  return r.rows[0] ?? null;
}

export type OrderInput = {
  admissionId: number;
  orderedByDoctorId?: number | null;
  orderType: (typeof ORDER_TYPES)[number];
  details?: string | null;
  priority?: "stat" | "routine" | "prn";
  medication?: {
    medicineId?: number | null;
    drugName: string;
    dose?: string | null;
    route?: string | null;
    frequency?: string | null;
    scheduleTimes?: string | null;
  };
};

// Place an inpatient doctor order; if it's a medication order, also create the
// medication_order detail the MAR will chart against.
export async function placeDoctorOrder(client: IpdRunner, input: OrderInput) {
  const adm = await client.query(`SELECT status FROM admission WHERE admission_id = $1`, [input.admissionId]);
  if (adm.rows.length === 0) throw new IpdError("Admission not found", 404);
  if (adm.rows[0].status !== "admitted") throw new IpdError("Admission is not active", 409);

  const ord = await client.query(
    `INSERT INTO doctor_order (admission_id, ordered_by_doctor_id, order_type, details, priority)
     VALUES ($1, $2, $3, $4, COALESCE($5, 'routine')) RETURNING order_id`,
    [input.admissionId, input.orderedByDoctorId ?? null, input.orderType, input.details ?? null, input.priority ?? null]
  );
  const orderId: number = ord.rows[0].order_id;

  let medOrderId: number | null = null;
  if (input.orderType === "medication" && input.medication) {
    const m = input.medication;
    const mo = await client.query(
      `INSERT INTO medication_order (order_id, medicine_id, drug_name, dose, route, frequency, schedule_times)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING med_order_id`,
      [orderId, m.medicineId ?? null, m.drugName, m.dose ?? null, m.route ?? null, m.frequency ?? null, m.scheduleTimes ?? null]
    );
    medOrderId = mo.rows[0].med_order_id;
  }
  return { orderId, medOrderId };
}

export type MarInput = {
  medOrderId: number;
  action: (typeof MAR_ACTIONS)[number];
  scheduledDt?: string | null;
  doseGiven?: string | null;
  route?: string | null;
  reason?: string | null;
  notes?: string | null;
  administeredByStaffId: number | null;
  allowAllergyOverride?: boolean;
};

// Chart a medication administration (MAR). Patient-safety gates:
//  * the dose must chart against an existing medication_order whose parent
//    doctor_order is ACTIVE (no free-floating / stale-order administrations);
//  * a 'given' dose must record the administering nurse (non-repudiation);
//  * a 'given' dose is blocked if the drug matches an active patient allergy,
//    unless an explicit override is supplied (then it's recorded for audit).
export async function chartMedicationAdministration(client: IpdRunner, input: MarInput) {
  if (!(MAR_ACTIONS as readonly string[]).includes(input.action)) throw new IpdError("Invalid action", 400);

  const mo = await client.query(
    `SELECT mo.med_order_id, mo.drug_name, o.status AS order_status, a.patient_id, a.admission_id
       FROM medication_order mo
       JOIN doctor_order o ON o.order_id = mo.order_id
       JOIN admission a ON a.admission_id = o.admission_id
      WHERE mo.med_order_id = $1`,
    [input.medOrderId]
  );
  if (mo.rows.length === 0) throw new IpdError("Medication order not found", 404);
  const row = mo.rows[0];
  if (row.order_status !== "active") throw new IpdError("Cannot administer against a non-active order", 409);
  if (input.action === "given" && !input.administeredByStaffId) {
    throw new IpdError("administered_by is required for a given dose", 400);
  }

  if (input.action === "given" && !input.allowAllergyOverride) {
    const allergy = await client.query(
      `SELECT allergen, severity FROM patient_allergy
        WHERE patient_id = $1 AND is_active
          AND ($2 ILIKE '%' || allergen || '%' OR allergen ILIKE '%' || $2 || '%')
        LIMIT 1`,
      [row.patient_id, row.drug_name]
    );
    if (allergy.rows.length > 0) {
      throw new IpdError(
        `Allergy alert: patient is allergic to '${allergy.rows[0].allergen}' (${allergy.rows[0].severity}). Resubmit with allowAllergyOverride=true to proceed.`,
        409
      );
    }
  }

  const administeredDt = input.action === "given" ? new Date() : null;
  const ins = await client.query(
    `INSERT INTO medication_administration
       (med_order_id, scheduled_dt, action, administered_dt, administered_by_staff_id, dose_given, route, reason, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING mar_id`,
    [
      input.medOrderId,
      input.scheduledDt ?? null,
      input.action,
      administeredDt,
      input.administeredByStaffId ?? null,
      input.doseGiven ?? null,
      input.route ?? null,
      input.reason ?? null,
      input.notes ?? null,
    ]
  );
  return { marId: ins.rows[0].mar_id as number, admissionId: row.admission_id as number };
}
