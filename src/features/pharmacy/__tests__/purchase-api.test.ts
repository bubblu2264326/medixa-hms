import { describe, it, expect, beforeEach, vi } from "vitest";

const { connectMock, clientQueryMock, releaseMock } = vi.hoisted(() => ({
  connectMock: vi.fn(),
  clientQueryMock: vi.fn(),
  releaseMock: vi.fn(),
}));
const { getAuthenticatedUserMock } = vi.hoisted(() => ({ getAuthenticatedUserMock: vi.fn() }));
const { resolveActorStaffIdMock } = vi.hoisted(() => ({ resolveActorStaffIdMock: vi.fn(async () => 1) }));

vi.mock("@/database/db", () => ({ default: { connect: connectMock }, query: vi.fn() }));
vi.mock("@/src/lib/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/server/auth")>();
  return { ...actual, getAuthenticatedUser: getAuthenticatedUserMock };
});
vi.mock("@/src/lib/server/actor", () => ({ resolveActorStaffId: resolveActorStaffIdMock }));

import { POST } from "@/src/app/api/pharmacy/purchase/route";
import { AuthError } from "@/src/lib/server/auth";

const buildReq = (body?: unknown) => ({ json: async () => body }) as any;

describe("pharmacy purchase API (auth + validation)", () => {
  beforeEach(() => {
    connectMock.mockReset();
    clientQueryMock.mockReset();
    releaseMock.mockReset();
    getAuthenticatedUserMock.mockReset();
    getAuthenticatedUserMock.mockResolvedValue({ user_code: "PH001", role: "Pharmacist", name: "P" });
    connectMock.mockResolvedValue({ query: clientQueryMock, release: releaseMock });
    clientQueryMock.mockResolvedValue({ rows: [] });
  });

  it("returns 401 when unauthenticated and never opens a connection", async () => {
    getAuthenticatedUserMock.mockRejectedValueOnce(new AuthError("Not authenticated", 401));
    const res = await POST(buildReq({ party_id: 1, items: [{ medicine_id: 1 }] }));
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(connectMock).not.toHaveBeenCalled();
  });

  it("returns 400 on missing required fields and releases the client", async () => {
    const res = await POST(buildReq({ party_id: null, items: [] }));
    expect(res.status).toBe(400);
    expect(releaseMock).toHaveBeenCalled();
    // never began a transaction for invalid input
    expect(clientQueryMock.mock.calls.some((c) => String(c[0]) === "BEGIN")).toBe(false);
  });
});
