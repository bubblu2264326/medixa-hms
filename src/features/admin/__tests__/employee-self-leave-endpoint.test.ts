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

vi.mock("@/src/lib/server/audit", () => ({
  logAuditEvent: vi.fn(),
}));

import { GET } from "@/src/app/api/employee/me/leave/requests/route";

describe("employee self leave endpoint", () => {
  beforeEach(() => {
    getAuthenticatedUserMock.mockReset();
    resolvePersonByUserCodeMock.mockReset();
    queryMock.mockReset();
  });

  it("always scopes to authenticated employee identity", async () => {
    getAuthenticatedUserMock.mockResolvedValue({
      user_code: "DOC001",
      role: "Doctor",
      account_type: "doctor",
    });
    resolvePersonByUserCodeMock.mockResolvedValue({
      accountType: "doctor",
      personId: 7,
      userCode: "DOC001",
      name: "Dr Test",
      role: "Doctor",
    });
    queryMock.mockResolvedValue({ rows: [] });

    const response = await GET(
      new Request("http://localhost/api/employee/me/leave/requests?person_id=999&account_type=staff") as any
    );
    expect(response.status).toBe(200);

    const params = queryMock.mock.calls[0]?.[1];
    expect(params[0]).toBe("doctor");
    expect(params[1]).toBe(7);
  });
});
