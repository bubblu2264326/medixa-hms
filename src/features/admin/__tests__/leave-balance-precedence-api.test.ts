import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAuthenticatedUserMock, resolvePersonByUserCodeMock, queryMock } = vi.hoisted(() => ({
  getAuthenticatedUserMock: vi.fn(),
  resolvePersonByUserCodeMock: vi.fn(),
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
  getAuthenticatedUser: getAuthenticatedUserMock,
}));

vi.mock("@/src/lib/server/workforceFinance", () => ({
  resolvePersonByUserCode: resolvePersonByUserCodeMock,
}));

vi.mock("@/database/db", () => ({
  query: queryMock,
}));

import { GET } from "@/src/app/api/employee/me/leave/balance/route";

describe("leave balance precedence query", () => {
  beforeEach(() => {
    getAuthenticatedUserMock.mockReset();
    resolvePersonByUserCodeMock.mockReset();
    queryMock.mockReset();
  });

  it("uses employee override before role quota before default leave quota", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ user_code: "STF001", role: "Receptionist" });
    resolvePersonByUserCodeMock.mockResolvedValue({
      accountType: "staff",
      personId: 1,
      userCode: "STF001",
      name: "A",
      role: "Receptionist",
    });
    queryMock.mockResolvedValue({ rows: [] });

    const response = await GET(new Request("http://localhost/api/employee/me/leave/balance?year=2026") as any);
    expect(response.status).toBe(200);

    const sqlText = String(queryMock.mock.calls[0]?.[0]);
    expect(sqlText).toContain("COALESCE(leo.annual_quota, lrq.annual_quota, slt.default_annual_quota, 0)");
  });
});
