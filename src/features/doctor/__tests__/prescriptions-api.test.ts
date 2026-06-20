import { beforeEach, describe, expect, it, vi } from "vitest";

const { connectMock, queryMock, releaseMock, getAuthenticatedDoctorMock } = vi.hoisted(() => ({
  connectMock: vi.fn(),
  queryMock: vi.fn(),
  releaseMock: vi.fn(),
  getAuthenticatedDoctorMock: vi.fn(),
}));

vi.mock("@/database/db", () => ({
  default: {
    connect: connectMock,
  },
}));

vi.mock("@/src/lib/server/doctor", () => ({
  getAuthenticatedDoctor: getAuthenticatedDoctorMock,
}));

import { POST as postPrescription } from "@/src/app/api/doctor/prescriptions/route";

describe("doctor prescriptions api", () => {
  beforeEach(() => {
    queryMock.mockReset();
    connectMock.mockReset();
    releaseMock.mockReset();
    getAuthenticatedDoctorMock.mockReset();

    getAuthenticatedDoctorMock.mockResolvedValue({
      doctor_id: 7,
      doctor_name: "Dr. Ahmed Khan",
      specialization: "General Medicine",
      user_code: "DR7",
      role: "Doctor",
    });

    connectMock.mockResolvedValue({
      query: queryMock,
      release: releaseMock,
    });
  });

  it("creates a prescription against the explicit selected visit when visit_id is provided", async () => {
    queryMock.mockResolvedValue({ rows: [] }); // default for trailing reads (allergy check, COMMIT)
    queryMock
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ visit_id: 44, status: "waiting" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ prescription_id: 13 }] })
      .mockResolvedValueOnce({ rows: [{ available_quantity: 3 }] })
      .mockResolvedValueOnce({ rows: [{ prescription_medicine_id: 99 }] })
      .mockResolvedValueOnce({});

    const response = await postPrescription(
      {
        json: async () => ({
          patient_id: 1,
          visit_id: 44,
          prescriptions: [
            {
              medicine_id: 5,
              dosage: "1 tablet",
              instructions: "After meal",
              prescribed_quantity: 10,
              dispensed_quantity: 0,
              frequency: "BD",
              duration: "5 days",
            },
          ],
        }),
      } as any
    );

    const body = await response.json();

    expect(response.status).toBe(201);
    expect(queryMock.mock.calls[1]?.[0]).toContain("where v.visit_id = $1");
    expect(queryMock.mock.calls[1]?.[1]).toEqual([44, 7, 1]);
    expect(queryMock.mock.calls[5]?.[0]).toContain("available_quantity_snapshot");
    expect(body.visit_id).toBe(44);
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});
