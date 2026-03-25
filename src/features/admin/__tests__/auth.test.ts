import { beforeEach, describe, expect, it, vi } from "vitest";

const { jwtVerifyMock } = vi.hoisted(() => ({
  jwtVerifyMock: vi.fn(),
}));
const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock("jose", () => ({
  jwtVerify: jwtVerifyMock,
}));
vi.mock("@/database/db", () => ({
  query: queryMock,
}));

import { AuthError, getAuthenticatedUser, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";

const buildRequest = (token?: string) =>
  ({
    cookies: {
      get: vi.fn((name: string) => {
        if (name !== "token" || !token) return undefined;
        return { value: token };
      }),
    },
  }) as any;

describe("admin auth helpers", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue({
      rows: [{ session_version: 1, employment_status: "active", revoked_at: null }],
    });
  });

  it("rejects missing token with 401", async () => {
    await expect(getAuthenticatedUser(buildRequest())).rejects.toMatchObject<AuthError>({
      status: 401,
      message: "Not authenticated",
    });
  });

  it("allows Admin and Super Admin roles", async () => {
    jwtVerifyMock.mockResolvedValueOnce({
      payload: { user_code: "ADM-1", role: "Admin", name: "Admin" },
    });
    const admin = await requireAdminOrSuperAdmin(buildRequest("token-1"));
    expect(admin.role).toBe("Admin");

    jwtVerifyMock.mockResolvedValueOnce({
      payload: { user_code: "SADM-1", role: "Super Admin", name: "Super Admin" },
    });
    const superAdmin = await requireAdminOrSuperAdmin(buildRequest("token-2"));
    expect(superAdmin.role).toBe("Super Admin");
  });

  it("rejects non-admin role with 403", async () => {
    jwtVerifyMock.mockResolvedValueOnce({
      payload: { user_code: "DOC-1", role: "Doctor", name: "Doctor" },
    });

    await expect(requireAdminOrSuperAdmin(buildRequest("token-3"))).rejects.toMatchObject<AuthError>({
      status: 403,
      message: "Forbidden",
    });
  });
});
