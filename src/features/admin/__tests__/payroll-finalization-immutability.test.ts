import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminOrSuperAdminMock, queryMock } = vi.hoisted(() => ({
  requireAdminOrSuperAdminMock: vi.fn(),
  queryMock: vi.fn(),
}));

vi.mock("@/src/lib/server/auth", () => ({
  AuthError: class AuthError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  requireAdminOrSuperAdmin: requireAdminOrSuperAdminMock,
}));

vi.mock("@/database/db", () => ({
  query: queryMock,
}));

vi.mock("@/src/lib/server/audit", () => ({
  logAuditEvent: vi.fn(),
}));

import { PATCH } from "@/src/app/api/admin/payroll/runs/[id]/route";

describe("payroll run immutability", () => {
  beforeEach(() => {
    requireAdminOrSuperAdminMock.mockReset();
    queryMock.mockReset();
  });

  it("blocks non-void modifications for finalized payroll runs", async () => {
    requireAdminOrSuperAdminMock.mockResolvedValue({
      user_code: "SADM001",
      role: "Super Admin",
    });

    queryMock.mockResolvedValueOnce({ rows: [{ payroll_run_id: 9, status: "finalized" }] });

    const response = await PATCH(
      new Request("http://localhost/api/admin/payroll/runs/9", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adjustment: { payroll_line_id: 77, amount: 500 } }),
      }) as any,
      { params: { id: "9" } }
    );

    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.error).toBe("Finalized payroll run is immutable");
  });
});
