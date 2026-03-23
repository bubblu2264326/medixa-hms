import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock, getAuthenticatedUserMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  getAuthenticatedUserMock: vi.fn(),
}));

vi.mock("@/database/db", () => ({
  query: queryMock,
}));

vi.mock("@/src/lib/server/auth", async () => {
  const actual = await vi.importActual<typeof import("@/src/lib/server/auth")>("@/src/lib/server/auth");
  return {
    ...actual,
    getAuthenticatedUser: getAuthenticatedUserMock,
  };
});

import { PATCH as patchVisitStatus } from "@/src/app/api/visit/status/route";

describe("visit status payment guard", () => {
  beforeEach(() => {
    queryMock.mockReset();
    getAuthenticatedUserMock.mockReset();
    getAuthenticatedUserMock.mockResolvedValue({
      user_code: "ST-100",
      role: "Admin",
      name: "Admin User",
    });
  });

  it("blocks transition to payment_done when bill due is still pending", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ visit_id: 44, status: "medicines_dispensed" }] })
      .mockResolvedValueOnce({ rows: [{ outstanding_due: 250 }] });

    const response = await patchVisitStatus({
      json: async () => ({ visit_id: 44, status: "payment_done" }),
    } as any);

    expect(response.status).toBe(409);
    expect(queryMock.mock.calls.some((call) => String(call[0]).includes("update_and_log_visit_status"))).toBe(false);
  });
});
