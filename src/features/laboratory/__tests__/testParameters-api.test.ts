import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock, getAuthMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  getAuthMock: vi.fn(),
}));

vi.mock("@/database/db", () => ({
  query: queryMock,
  default: { connect: vi.fn() },
}));

vi.mock("@/src/lib/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/server/auth")>();
  return {
    ...actual,
    getAuthenticatedUser: getAuthMock,
  };
});

import { GET } from "@/src/app/api/lab/testParameters/[test_id]/route";
import { AuthError } from "@/src/lib/server/auth";

const call = (test_id: string) =>
  GET({} as any, { params: Promise.resolve({ test_id }) } as any);

describe("GET /api/lab/testParameters/[test_id]", () => {
  beforeEach(() => {
    queryMock.mockReset();
    getAuthMock.mockReset();
    getAuthMock.mockResolvedValue({ user_code: "STF003", role: "Lab_Technician", name: "Tech" });
  });

  it("rejects unauthenticated callers with 401 and never queries", async () => {
    getAuthMock.mockRejectedValueOnce(new AuthError("Unauthorized", 401));
    const res = await call("4");
    expect(res.status).toBe(401);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("returns 400 on a non-numeric test_id without querying", async () => {
    const res = await call("abc");
    expect(res.status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("returns the test's parameters (explicit columns, ordered) with the numeric id", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ parameter_id: 1, test_id: 4, parameter_name: "Hemoglobin", display_order: 1 }],
    });
    const res = await call("4");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
    const sql = String(queryMock.mock.calls[0]?.[0]);
    expect(sql).toContain("lab_test_parameters");
    expect(sql).not.toContain("*");
    expect(sql).toContain("ORDER BY display_order");
    expect(queryMock.mock.calls[0]?.[1]).toEqual([4]);
  });

  it("returns 200 with an empty array when the test has no parameters (regression: previously 500)", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const res = await call("4");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual([]);
  });
});
