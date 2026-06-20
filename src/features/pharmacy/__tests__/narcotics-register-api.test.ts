import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock, requireRolesMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  requireRolesMock: vi.fn(),
}));

vi.mock("@/database/db", () => ({ query: queryMock }));
vi.mock("@/src/lib/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/server/auth")>();
  return { ...actual, requireRoles: requireRolesMock };
});

import { GET } from "@/src/app/api/pharmacy/narcotics-register/route";
import { AuthError } from "@/src/lib/server/auth";

const reqWith = (qs = "") => ({ url: `http://localhost/api/pharmacy/narcotics-register${qs}` }) as any;

describe("narcotics register API", () => {
  beforeEach(() => {
    queryMock.mockReset();
    requireRolesMock.mockReset();
  });

  it("returns the register for an authorized pharmacist (200)", async () => {
    requireRolesMock.mockResolvedValue({ user_code: "STF002", role: "Pharmacist" });
    queryMock.mockResolvedValueOnce({ rows: [{ medicine_id: 5, movement_type: "dispense", qty_units: 2 }] });
    const res = await GET(reqWith("?from=2026-01-01&to=2026-12-31"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
    // date filters bound to $1/$2
    expect(queryMock.mock.calls[0]?.[1]).toEqual(["2026-01-01", "2026-12-31"]);
  });

  it("forbids a non-pharmacy role (403)", async () => {
    requireRolesMock.mockRejectedValue(new AuthError("Forbidden", 403));
    const res = await GET(reqWith());
    expect(res.status).toBe(403);
    expect(queryMock).not.toHaveBeenCalled();
  });
});
