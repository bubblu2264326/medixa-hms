import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock, getAuthMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  getAuthMock: vi.fn(),
}));

vi.mock("@/database/db", () => ({ query: queryMock }));
vi.mock("@/src/lib/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/server/auth")>();
  return { ...actual, getAuthenticatedUser: getAuthMock };
});

import { assertPermitted, requirePermission } from "@/src/lib/server/permissions";

describe("granular RBAC — assertPermitted / requirePermission", () => {
  beforeEach(() => {
    queryMock.mockReset();
    getAuthMock.mockReset();
  });

  it("allows when there is no matching deny policy", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ staff_id: 7, role_id: 2 }] }) // who
      .mockResolvedValueOnce({ rows: [] }); // no deny
    await expect(assertPermitted({ user_code: "ADM001" }, "staff_directory", "view")).resolves.toBeUndefined();
  });

  it("throws 403 when an explicit deny policy matches the actor", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ staff_id: 7, role_id: 2 }] })
      .mockResolvedValueOnce({ rows: [{ exists: 1 }] }); // deny present
    await expect(
      assertPermitted({ user_code: "ADM001" }, "staff_directory", "edit")
    ).rejects.toMatchObject({ status: 403 });
  });

  it("allows (no second query) when the actor maps to no staff/role", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ staff_id: null, role_id: null }] });
    await expect(assertPermitted({ user_code: "DOC001" }, "settings", "edit")).resolves.toBeUndefined();
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("requirePermission authenticates then enforces the policy", async () => {
    getAuthMock.mockResolvedValueOnce({ user_code: "ADM001", role: "Admin" });
    queryMock
      .mockResolvedValueOnce({ rows: [{ staff_id: 7, role_id: 2 }] })
      .mockResolvedValueOnce({ rows: [] });
    const user = await requirePermission({} as any, "staff_directory", "view");
    expect(user.user_code).toBe("ADM001");
  });
});
