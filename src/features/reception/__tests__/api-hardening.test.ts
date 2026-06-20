import { beforeEach, describe, expect, it, vi } from "vitest";

const { clientQueryMock, clientReleaseMock, connectMock, publishQueueInvalidationMock, queryMock } = vi.hoisted(() => ({
  clientQueryMock: vi.fn(),
  clientReleaseMock: vi.fn(),
  connectMock: vi.fn(),
  publishQueueInvalidationMock: vi.fn(),
  queryMock: vi.fn(),
}));

vi.mock("@/database/db", () => ({
  query: queryMock,
  default: {
    connect: connectMock,
  },
}));

vi.mock("@/src/lib/server/queueEvents", () => ({
  publishQueueInvalidation: publishQueueInvalidationMock,
}));

vi.mock("@/src/lib/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/server/auth")>();
  return {
    ...actual,
    getAuthenticatedUser: vi.fn(async () => ({
      user_code: "STAFF-1",
      role: "Receptionist",
      name: "Test Staff",
    })),
  };
});

import { GET as getQueue } from "@/src/app/api/queue/route";
import { PATCH as patchVisit } from "@/src/app/api/visit/route";
import { PATCH as patchVisitStatus } from "@/src/app/api/visit/status/route";
import { POST as postPara } from "@/src/app/api/clinicalDetails/gynaecologist/para/route";
import { POST as postVitals } from "@/src/app/api/patientVitals/route";
import { GET as getCurrentPregnancy } from "@/src/app/api/clinicalDetails/gynaecologist/currentPregnancy/[patientId]/route";

describe("reception API hardening", () => {
  beforeEach(() => {
    queryMock.mockReset();
    clientQueryMock.mockReset();
    clientReleaseMock.mockReset();
    connectMock.mockReset();
    publishQueueInvalidationMock.mockReset();
    connectMock.mockResolvedValue({
      query: clientQueryMock,
      release: clientReleaseMock,
    });
  });

  it("updates visits by visit_id only", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ status: "waiting" }] })
      .mockResolvedValueOnce({ rows: [{ visit_id: 44, patient_id: 1 }] });

    const response = await patchVisit({
      json: async () => ({
        visit_id: 44,
        doctor_id: 2,
        visit_type: "OPD",
        clinic_number: 201,
        status: "waiting",
        reason: "Follow up",
      }),
    } as any);

    expect(response.status).toBe(200);
    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(queryMock.mock.calls[1]?.[0]).toContain("where visit_id = $1");
    expect(queryMock.mock.calls[1]?.[0]).not.toContain("where patient_id");
  });

  it("routes an actual status change on /api/visit through update_and_log_visit_status", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ status: "waiting" }] }) // current status
      .mockResolvedValueOnce({ rows: [{ staff_id: 1 }] }) // resolveActorStaffId staff lookup
      .mockResolvedValueOnce({ rows: [] }) // proc call
      .mockResolvedValueOnce({ rows: [{ visit_id: 44 }] }); // metadata update

    const response = await patchVisit({
      json: async () => ({ visit_id: 44, status: "seen_by_doctor", doctor_id: 2 }),
    } as any);

    expect(response.status).toBe(200);
    const sqls = queryMock.mock.calls.map((c) => String(c[0]));
    // status change is logged via the proc, not written directly
    expect(sqls.some((s) => s.includes("call update_and_log_visit_status"))).toBe(true);
    const updateSql = sqls.find((s) => s.startsWith("update visit set"));
    expect(updateSql).toBeDefined();
    expect(updateSql).not.toContain("status =");
  });

  it("routes status changes through update_and_log_visit_status", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ visit_id: 44, status: "waiting" }] })
      .mockResolvedValueOnce({ rows: [{ staff_id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ visit_id: 44, status: "seen_by_doctor" }] });

    const response = await patchVisitStatus({
      json: async () => ({
        visit_id: 44,
        status: "seen_by_doctor",
      }),
    } as any);

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(queryMock.mock.calls[2]?.[0]).toContain("call update_and_log_visit_status");
    expect(queryMock.mock.calls[2]?.[1]).toEqual([44, "seen_by_doctor", null, 1]);
    expect(body.data.status).toBe("seen_by_doctor");
    expect(publishQueueInvalidationMock).toHaveBeenCalledWith("visit-status-updated");
  });

  it("updates para count only for the targeted obstetric history row", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ para_id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ obstetric_history_id: 55, para: 1 }] });

    const response = await postPara({
      json: async () => ({
        para: [
          {
            obstetric_history_id: 55,
            para_number: 1,
            birth_year: 2020,
            birth_month: 5,
            gender: "Female",
            delivery_type: "Normal",
            alive: "true",
            birth_weight_grams: 3200,
            complications: "",
            notes: "",
            gestational_age_weeks: 38,
          },
        ],
      }),
    } as any);

    expect(response.status).toBe(200);
    expect(queryMock.mock.calls[1]?.[0]).toContain("where obstetric_history_id = $2");
    expect(queryMock.mock.calls[1]?.[1]).toEqual([1, 55]);
  });

  it("creates vitals using the explicit visit_id contract", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ vital_id: 9, visit_id: 44 }] });

    const response = await postVitals({
      json: async () => ({
        visit_id: 44,
        blood_pressure: "120/80",
        heart_rate: 80,
        temperature: 98,
        weight: 60,
        height: 170,
        blood_group: "AB-",
      }),
    } as any);

    expect(response.status).toBe(200);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0]?.[0]).toContain("insert into patient_vitals");
    expect(queryMock.mock.calls[0]?.[1]?.[0]).toBe(44);
  });

  it("reads current pregnancy by visit_id instead of patient_id", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ visit_id: 44, patient_id: 1 }] });

    const response = await getCurrentPregnancy({} as any, {
      params: Promise.resolve({ patientId: "44" }),
    } as any);

    expect(response.status).toBe(200);
    expect(queryMock.mock.calls[0]?.[0]).toContain("where visit_id = $1");
    expect(queryMock.mock.calls[0]?.[1]).toEqual(["44"]);
  });

  it("filters queue reads to active statuses only", async () => {
    clientQueryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ visit_id: 44, status: "waiting" }] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await getQueue({} as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(clientQueryMock.mock.calls[2]?.[0]).toContain("v.status = any");
    expect(clientQueryMock.mock.calls[2]?.[1]?.[0]).toEqual(["waiting"]);
    expect(body[0]?.visit_id).toBe(44);
    expect(clientReleaseMock).toHaveBeenCalledTimes(1);
  });

  it("returns an explicit error status when queue reads time out", async () => {
    clientQueryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce({ code: "57014" })
      .mockResolvedValueOnce({ rows: [] });

    const response = await getQueue({} as any);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toMatch(/timed out/i);
    expect(clientQueryMock.mock.calls[3]?.[0]).toContain("ROLLBACK");
  });
});
