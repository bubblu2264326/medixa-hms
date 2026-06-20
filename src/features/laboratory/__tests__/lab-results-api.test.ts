import { beforeEach, describe, expect, it, vi } from "vitest";

const { connectMock, clientQueryMock, releaseMock, requireRolesMock, enqueueMock } = vi.hoisted(() => ({
  connectMock: vi.fn(),
  clientQueryMock: vi.fn(),
  releaseMock: vi.fn(),
  requireRolesMock: vi.fn(),
  enqueueMock: vi.fn(),
}));

vi.mock("@/database/db", () => ({ default: { connect: connectMock } }));
vi.mock("@/src/lib/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/server/auth")>();
  return { ...actual, requireRoles: requireRolesMock };
});
vi.mock("@/src/lib/server/actor", () => ({ resolveActorStaffId: vi.fn(async () => 1) }));
vi.mock("@/src/lib/server/audit", () => ({ logAuditEvent: vi.fn(async () => {}) }));
vi.mock("@/src/lib/server/notifications", () => ({ enqueueNotification: enqueueMock }));

import { POST } from "@/src/app/api/lab/results/route";

function wire() {
  clientQueryMock.mockImplementation(async (sql: string) => {
    const s = String(sql);
    if (/^\s*(BEGIN|COMMIT|ROLLBACK)/i.test(s)) return { rows: [] };
    if (s.includes("FROM lab_order") && s.includes("FOR UPDATE")) return { rows: [{ order_id: 1, test_id: 4, ordered_by: 7, status: "Pending" }] };
    if (s.includes("FROM lab_test_parameters")) return { rows: [{ parameter_id: 10, parameter_name: "Hb", reference_range_min: 12, reference_range_max: 16, is_critical: true }] };
    if (s.includes("FROM doctor")) return { rows: [{ contact_number: "0300" }] };
    return { rows: [] };
  });
}
const call = (body: any) => POST({ json: async () => body } as any);

describe("lab results entry", () => {
  beforeEach(() => {
    connectMock.mockReset(); clientQueryMock.mockReset(); releaseMock.mockReset();
    requireRolesMock.mockReset(); enqueueMock.mockReset();
    requireRolesMock.mockResolvedValue({ user_code: "STF003", role: "Lab_Technician" });
    enqueueMock.mockResolvedValue(1);
    connectMock.mockResolvedValue({ query: clientQueryMock, release: releaseMock });
    wire();
  });

  it("flags an out-of-range critical value and raises a critical alert", async () => {
    const res = await call({ order_id: 1, results: [{ parameter_id: 10, result_value: "8" }] });
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.entered).toBe(1);
    expect(body.critical_alerts).toEqual([{ parameter: "Hb", value: "8" }]);
    expect(enqueueMock).toHaveBeenCalledTimes(1); // doctor alerted
  });

  it("does not flag a normal in-range value", async () => {
    const res = await call({ order_id: 1, results: [{ parameter_id: 10, result_value: "14" }] });
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.critical_alerts).toEqual([]);
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("rejects an empty submission (400) without connecting", async () => {
    const res = await call({ order_id: 1, results: [] });
    expect(res.status).toBe(400);
    expect(connectMock).not.toHaveBeenCalled();
  });
});
