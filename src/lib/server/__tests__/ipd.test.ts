import { describe, it, expect, vi } from "vitest";
import { admitPatient, dischargePatient } from "@/src/lib/server/ipd";

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
