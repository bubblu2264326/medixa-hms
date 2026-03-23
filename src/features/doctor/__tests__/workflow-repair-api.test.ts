import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  queryMock,
  getAuthenticatedDoctorMock,
  poolConnectMock,
  resolveDoctorVisitMock,
  ensureDoctorVisitWriteAccessMock,
  ensureDoctorSoftDeleteAccessMock,
  publishQueueInvalidationMock,
} = vi.hoisted(() => ({
  queryMock: vi.fn(),
  getAuthenticatedDoctorMock: vi.fn(),
  poolConnectMock: vi.fn(),
  resolveDoctorVisitMock: vi.fn(),
  ensureDoctorVisitWriteAccessMock: vi.fn(),
  ensureDoctorSoftDeleteAccessMock: vi.fn(),
  publishQueueInvalidationMock: vi.fn(),
}));

vi.mock("@/database/db", () => ({
  query: queryMock,
  default: {
    connect: poolConnectMock,
  },
}));

vi.mock("@/src/lib/server/doctor", () => ({
  getAuthenticatedDoctor: getAuthenticatedDoctorMock,
}));

vi.mock("@/src/lib/server/doctorWorkspace", () => ({
  resolveDoctorVisit: resolveDoctorVisitMock,
  ensureDoctorVisitWriteAccess: ensureDoctorVisitWriteAccessMock,
  ensureDoctorSoftDeleteAccess: ensureDoctorSoftDeleteAccessMock,
}));

vi.mock("@/src/lib/server/queueEvents", () => ({
  publishQueueInvalidation: publishQueueInvalidationMock,
}));

import { GET as getCheckedPatients } from "@/src/app/api/doctor/dashboard/checked-patients/route";
import { DELETE as softDeleteVisit } from "@/src/app/api/doctor/visit/[visitId]/soft-delete/route";
import { POST as createPrescription } from "@/src/app/api/doctor/prescriptions/route";

describe("doctor workflow repair APIs", () => {
  beforeEach(() => {
    queryMock.mockReset();
    getAuthenticatedDoctorMock.mockReset();
    poolConnectMock.mockReset();
    resolveDoctorVisitMock.mockReset();
    ensureDoctorVisitWriteAccessMock.mockReset();
    ensureDoctorSoftDeleteAccessMock.mockReset();
    publishQueueInvalidationMock.mockReset();

    getAuthenticatedDoctorMock.mockResolvedValue({
      doctor_id: 7,
      doctor_name: "Dr. Ahmed",
      specialization: "General",
      user_code: "DR7",
      role: "Doctor",
    });
  });

  it("uses seen-event filtering for checked patients", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const request = {
      nextUrl: {
        searchParams: new URLSearchParams({ from: "2026-03-23", to: "2026-03-23" }),
      },
    } as any;

    const response = await getCheckedPatients(request);
    expect(response.status).toBe(200);
    const sql = String(queryMock.mock.calls[0]?.[0] ?? "");
    expect(sql).toContain("with seen_events as");
    expect(sql).toContain("se.seen_at::date between");
    expect(sql).toContain("v.status as current_status");
  });

  it("blocks doctor soft-delete on guarded policy errors", async () => {
    const clientQuery = vi.fn();
    const release = vi.fn();
    poolConnectMock.mockResolvedValue({ query: clientQuery, release });
    resolveDoctorVisitMock.mockResolvedValue({
      visit_id: 99,
      status: "completed",
      doctor_id: 7,
    });
    ensureDoctorSoftDeleteAccessMock.mockImplementation(() => {
      throw new Error("Selected visit cannot be deleted because encounter is hard-locked");
    });

    const request = {} as any;
    const response = await softDeleteVisit(request, {
      params: Promise.resolve({ visitId: "99" }),
    } as any);

    expect(response.status).toBe(409);
    expect(clientQuery).toHaveBeenCalledWith("BEGIN");
    expect(clientQuery).toHaveBeenCalledWith("ROLLBACK");
    expect(release).toHaveBeenCalled();
  });

  it("returns append mode before lab completion and new_thread after lab progression", async () => {
    const release = vi.fn();
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ prescription_id: 11 }] }) // latestPrescription
      .mockResolvedValueOnce({ rows: [{ available_quantity: 50 }] }) // stock snapshot
      .mockResolvedValueOnce({ rows: [{ prescription_medicine_id: 101 }] }) // insert medicine
      .mockResolvedValueOnce({}); // COMMIT

    poolConnectMock.mockResolvedValue({ query: clientQuery, release });
    resolveDoctorVisitMock.mockResolvedValue({
      visit_id: 44,
      patient_id: 1,
      doctor_id: 7,
      status: "medicines_dispensed",
    });

    const appendReq = {
      json: vi.fn().mockResolvedValue({
        patient_id: 1,
        visit_id: 44,
        prescriptions: [
          {
            medicine_id: 5,
            dosage: "1 tab",
            instructions: "",
            prescribed_quantity: 2,
            dispensed_quantity: 0,
            frequency: "BD",
            duration: "5 days",
          },
        ],
      }),
    } as any;

    const appendResponse = await createPrescription(appendReq);
    const appendBody = await appendResponse.json();

    expect(appendResponse.status).toBe(201);
    expect(appendBody.mode).toBe("append");

    clientQuery.mockReset();
    clientQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ prescription_id: 12 }] }) // latestPrescription (ignored for mode)
      .mockResolvedValueOnce({ rows: [{ prescription_id: 13 }] }) // create new prescription
      .mockResolvedValueOnce({ rows: [{ available_quantity: 40 }] }) // stock snapshot
      .mockResolvedValueOnce({ rows: [{ prescription_medicine_id: 202 }] }) // insert medicine
      .mockResolvedValueOnce({}); // COMMIT

    resolveDoctorVisitMock.mockResolvedValue({
      visit_id: 45,
      patient_id: 1,
      doctor_id: 7,
      status: "lab_tests_done",
    });

    const newThreadReq = {
      json: vi.fn().mockResolvedValue({
        patient_id: 1,
        visit_id: 45,
        prescriptions: [
          {
            medicine_id: 5,
            dosage: "1 tab",
            instructions: "",
            prescribed_quantity: 2,
            dispensed_quantity: 0,
            frequency: "BD",
            duration: "5 days",
          },
        ],
      }),
    } as any;

    const newThreadResponse = await createPrescription(newThreadReq);
    const newThreadBody = await newThreadResponse.json();

    expect(newThreadResponse.status).toBe(201);
    expect(newThreadBody.mode).toBe("new_thread");
    expect(release).toHaveBeenCalled();
  });
});
