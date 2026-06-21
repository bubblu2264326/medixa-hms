import { beforeEach, describe, expect, it, vi } from "vitest";

// Verifies the lab→bill invariant: ordering a priced lab test posts a
// bill_charge_source(source_type='lab') for the catalog price and grows the
// visit bill's total — the charge the cashier later collects. A zero/unpriced
// test creates the order but no charge.

const { connectMock, clientQueryMock, releaseMock, authDoctorMock, resolveVisitMock, writeAccessMock } =
  vi.hoisted(() => ({
    connectMock: vi.fn(),
    clientQueryMock: vi.fn(),
    releaseMock: vi.fn(),
    authDoctorMock: vi.fn(),
    resolveVisitMock: vi.fn(),
    writeAccessMock: vi.fn(),
  }));

vi.mock("@/database/db", () => ({ default: { connect: connectMock } }));
vi.mock("@/src/lib/server/doctor", () => ({ getAuthenticatedDoctor: authDoctorMock }));
vi.mock("@/src/lib/server/doctorWorkspace", () => ({
  resolveDoctorVisit: resolveVisitMock,
  ensureDoctorLabOrderWriteAccess: writeAccessMock,
}));

import { POST } from "@/src/app/api/doctor/lab-orders/route";

let orderSeq = 100;
function wire(priceByTest: Record<number, number | null>) {
  orderSeq = 100;
  clientQueryMock.mockImplementation(async (sql: string, params?: unknown[]) => {
    const s = String(sql);
    if (/^\s*(BEGIN|COMMIT|ROLLBACK)/i.test(s)) return { rows: [] };
    if (s.includes("insert into lab_order")) {
      const testId = Number(params?.[1]);
      return { rows: [{ order_id: ++orderSeq, visit_id: params?.[0], test_id: testId, status: "Pending" }] };
    }
    if (s.includes("from lab_test")) {
      const testId = Number(params?.[0]);
      const price = priceByTest[testId];
      return { rows: [{ test_name: `Test${testId}`, price }] };
    }
    if (s.includes("from bill") && s.includes("for update")) return { rows: [{ bill_id: 9 }] };
    if (s.includes("insert into bill_item")) return { rows: [{ item_id: 55 }] };
    if (s.includes("insert into bill_charge_source")) return { rows: [] };
    if (s.includes("update bill")) return { rows: [] };
    return { rows: [] };
  });
}

const call = (body: any) => POST({ json: async () => body } as any);

describe("lab order billing (lab→bill)", () => {
  beforeEach(() => {
    connectMock.mockReset();
    clientQueryMock.mockReset();
    releaseMock.mockReset();
    authDoctorMock.mockReset();
    resolveVisitMock.mockReset();
    writeAccessMock.mockReset();
    authDoctorMock.mockResolvedValue({ doctor_id: 7 });
    resolveVisitMock.mockResolvedValue({ visit_id: 5, patient_id: 3, status: "seen_by_doctor" });
    writeAccessMock.mockReturnValue(undefined);
    connectMock.mockResolvedValue({ query: clientQueryMock, release: releaseMock });
  });

  it("charges a priced lab test to the visit bill", async () => {
    wire({ 4: 500 });
    const res = await call({ patient_id: 3, visit_id: 5, tests: [{ test_id: 4 }] });
    expect(res.status).toBe(201);

    const calls = clientQueryMock.mock.calls;
    const chargeCall = calls.find((c) => String(c[0]).includes("insert into bill_charge_source"));
    expect(chargeCall).toBeTruthy();
    // params: [billId, billItemId, orderId, price, metaJson]
    expect(chargeCall![1]).toEqual([9, 55, 101, 500, expect.any(String)]);

    const updateCall = calls.find((c) => String(c[0]).includes("update bill"));
    expect(updateCall).toBeTruthy();
    expect(updateCall![1]).toEqual([9, 500]); // [billId, chargeTotal]
  });

  it("sums charges across multiple priced tests", async () => {
    wire({ 4: 500, 8: 250 });
    const res = await call({ patient_id: 3, visit_id: 5, tests: [{ test_id: 4 }, { test_id: 8 }] });
    expect(res.status).toBe(201);
    const updateCall = clientQueryMock.mock.calls.find((c) => String(c[0]).includes("update bill"));
    expect(updateCall![1]).toEqual([9, 750]);
  });

  it("creates the order but no charge for a zero/unpriced test", async () => {
    wire({ 4: 0, 8: null });
    const res = await call({ patient_id: 3, visit_id: 5, tests: [{ test_id: 4 }, { test_id: 8 }] });
    expect(res.status).toBe(201);
    const calls = clientQueryMock.mock.calls;
    expect(calls.some((c) => String(c[0]).includes("insert into lab_order"))).toBe(true);
    expect(calls.some((c) => String(c[0]).includes("insert into bill_charge_source"))).toBe(false);
    expect(calls.some((c) => String(c[0]).includes("update bill"))).toBe(false);
  });
});
