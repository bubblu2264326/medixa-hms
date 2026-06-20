import { describe, it, expect, vi } from "vitest";
import { admitPatient, dischargePatient, chartMedicationAdministration } from "@/src/lib/server/ipd";

function makeClient(opts: { bedStatus?: string; admissionStatus?: string } = {}) {
  const calls: { sql: string; params: any[] }[] = [];
  const bedStatus = opts.bedStatus ?? "vacant";
  const admissionStatus = opts.admissionStatus ?? "admitted";
  const query = vi.fn(async (sql: string, params: any[] = []) => {
    const s = String(sql);
    calls.push({ sql: s, params });
    if (s.includes("FROM bed WHERE bed_id") && s.includes("FOR UPDATE")) return { rows: [{ bed_id: 5, status: bedStatus }] };
    if (s.includes("FROM admission WHERE admission_id") && s.includes("FOR UPDATE")) {
      return { rows: [{ visit_id: 44, current_bed_id: 5, status: admissionStatus }] };
    }
    if (s.includes("INSERT INTO admission")) return { rows: [{ admission_id: 100, admission_no: "IPD000100" }] };
    return { rows: [] };
  });
  return { client: { query } as any, calls };
}
const find = (calls: { sql: string; params: any[] }[], frag: string) => calls.find((c) => c.sql.includes(frag));

describe("ipd domain — admit", () => {
  it("admits to a vacant bed, occupies it, logs the transfer, flips visit -> admitted", async () => {
    const { client, calls } = makeClient();
    const res = await admitPatient(client, { patientId: 1, visitId: 44, bedId: 5, createdBy: 1 });
    expect(res).toEqual({ admissionId: 100, admissionNo: "IPD000100" });
    expect(find(calls, "UPDATE bed SET status = 'occupied'")).toBeTruthy();
    expect(find(calls, "INSERT INTO bed_transfer")).toBeTruthy();
    expect(find(calls, "update_and_log_visit_status")?.params).toEqual([44, "admitted", null, 1]);
  });

  it("rejects admission to an occupied bed (409)", async () => {
    const { client } = makeClient({ bedStatus: "occupied" });
    await expect(admitPatient(client, { patientId: 1, bedId: 5, createdBy: 1 })).rejects.toMatchObject({ status: 409 });
  });

  it("does not touch the visit proc for a direct admit (no visitId)", async () => {
    const { client, calls } = makeClient();
    await admitPatient(client, { patientId: 1, bedId: 5, createdBy: 1 });
    expect(find(calls, "update_and_log_visit_status")).toBeFalsy();
  });
});

describe("ipd domain — discharge", () => {
  it("discharges: sets status, accrues rent, frees the bed, builds the final bill, flips visit", async () => {
    const { client, calls } = makeClient();
    await dischargePatient(client, { admissionId: 100, dischargeType: "normal", byStaffId: 1 });
    expect(find(calls, "status = 'discharged'")).toBeTruthy();
    expect(find(calls, "INSERT INTO ip_charge")).toBeTruthy(); // room-rent accrual
    expect(find(calls, "UPDATE bed SET status = 'vacant'")).toBeTruthy();
    expect(find(calls, "INSERT INTO ip_final_bill")).toBeTruthy();
    expect(find(calls, "update_and_log_visit_status")?.params).toEqual([44, "discharged", null, 1]);
  });

  it("rejects an invalid discharge_type (400) before querying", async () => {
    const { client, calls } = makeClient();
    await expect(
      dischargePatient(client, { admissionId: 100, dischargeType: "teleport", byStaffId: 1 })
    ).rejects.toMatchObject({ status: 400 });
    expect(calls.length).toBe(0);
  });

  it("rejects discharging an already-discharged admission (409)", async () => {
    const { client } = makeClient({ admissionStatus: "discharged" });
    await expect(
      dischargePatient(client, { admissionId: 100, dischargeType: "normal", byStaffId: 1 })
    ).rejects.toMatchObject({ status: 409 });
  });
});

function marClient(opts: { orderStatus?: string; allergy?: boolean; drugName?: string } = {}) {
  const calls: { sql: string; params: any[] }[] = [];
  const orderStatus = opts.orderStatus ?? "active";
  const allergyRows = opts.allergy ? [{ allergen: "Penicillin", severity: "severe" }] : [];
  const query = vi.fn(async (sql: string, params: any[] = []) => {
    const s = String(sql);
    calls.push({ sql: s, params });
    if (s.includes("FROM medication_order mo")) {
      return { rows: [{ med_order_id: 1, drug_name: opts.drugName ?? "Amoxicillin", order_status: orderStatus, patient_id: 9, admission_id: 100 }] };
    }
    if (s.includes("FROM patient_allergy")) return { rows: allergyRows };
    if (s.includes("INSERT INTO medication_administration")) return { rows: [{ mar_id: 7 }] };
    return { rows: [] };
  });
  return { client: { query } as any, calls };
}
const marFind = (calls: { sql: string }[], frag: string) => calls.find((c) => c.sql.includes(frag));

describe("ipd domain — MAR safety", () => {
  it("charts a given dose against an active order with no allergy conflict", async () => {
    const { client, calls } = marClient();
    const res = await chartMedicationAdministration(client, { medOrderId: 1, action: "given", administeredByStaffId: 3 });
    expect(res).toEqual({ marId: 7, admissionId: 100 });
    expect(marFind(calls, "INSERT INTO medication_administration")).toBeTruthy();
  });

  it("refuses to administer against a non-active order (409)", async () => {
    const { client } = marClient({ orderStatus: "discontinued" });
    await expect(
      chartMedicationAdministration(client, { medOrderId: 1, action: "given", administeredByStaffId: 3 })
    ).rejects.toMatchObject({ status: 409 });
  });

  it("requires the administering nurse for a given dose (400)", async () => {
    const { client } = marClient();
    await expect(
      chartMedicationAdministration(client, { medOrderId: 1, action: "given", administeredByStaffId: null })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("blocks a given dose that conflicts with an active allergy (409), no insert", async () => {
    const { client, calls } = marClient({ allergy: true, drugName: "Penicillin V" });
    await expect(
      chartMedicationAdministration(client, { medOrderId: 1, action: "given", administeredByStaffId: 3 })
    ).rejects.toMatchObject({ status: 409 });
    expect(marFind(calls, "INSERT INTO medication_administration")).toBeFalsy();
  });

  it("allows an allergy-conflicting dose when explicitly overridden (and skips the allergy query)", async () => {
    const { client, calls } = marClient({ allergy: true, drugName: "Penicillin V" });
    const res = await chartMedicationAdministration(client, {
      medOrderId: 1, action: "given", administeredByStaffId: 3, allowAllergyOverride: true,
    });
    expect(res.marId).toBe(7);
    expect(marFind(calls, "FROM patient_allergy")).toBeFalsy();
  });
});
