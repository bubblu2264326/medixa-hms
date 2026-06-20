import { describe, it, expect, beforeEach, vi } from "vitest";

const { connectMock, clientQueryMock, releaseMock } = vi.hoisted(() => ({
  connectMock: vi.fn(),
  clientQueryMock: vi.fn(),
  releaseMock: vi.fn(),
}));
const { getAuthenticatedUserMock } = vi.hoisted(() => ({ getAuthenticatedUserMock: vi.fn() }));
const { resolveActorStaffIdMock } = vi.hoisted(() => ({ resolveActorStaffIdMock: vi.fn(async () => 1) }));
const { logAuditEventMock } = vi.hoisted(() => ({ logAuditEventMock: vi.fn(async () => null) }));

vi.mock("@/database/db", () => ({
  default: { connect: connectMock },
  query: vi.fn(),
}));
vi.mock("@/src/lib/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/server/auth")>();
  return { ...actual, getAuthenticatedUser: getAuthenticatedUserMock };
});
vi.mock("@/src/lib/server/actor", () => ({ resolveActorStaffId: resolveActorStaffIdMock }));
vi.mock("@/src/lib/server/audit", () => ({ logAuditEvent: logAuditEventMock }));

import { POST } from "@/src/app/api/pharmacy/purchase/return/route";
import { AuthError } from "@/src/lib/server/auth";

const buildReq = (body?: unknown) => ({ json: async () => body }) as any;
const validBody = {
  purchase_id: 10,
  reason: "damaged",
  created_by: 999, // body-supplied actor must be IGNORED
  items: [{ medicine_id: 2, batch_id: 3, quantity: 1, sub_quantity: 0, unit_cost: 5 }],
};

describe("pharmacy purchase-return API", () => {
  beforeEach(() => {
    connectMock.mockReset();
    clientQueryMock.mockReset();
    releaseMock.mockReset();
    getAuthenticatedUserMock.mockReset();
    resolveActorStaffIdMock.mockReset();
    logAuditEventMock.mockClear();

    getAuthenticatedUserMock.mockResolvedValue({ user_code: "PH001", role: "Pharmacist", name: "Pharma" });
    resolveActorStaffIdMock.mockResolvedValue(1);
    connectMock.mockResolvedValue({ query: clientQueryMock, release: releaseMock });
    clientQueryMock.mockImplementation((sql: string) => {
      if (/INSERT INTO purchase_return\b/i.test(sql) && /RETURNING return_id/i.test(sql)) {
        return Promise.resolve({ rows: [{ return_id: 5 }] });
      }
      return Promise.resolve({ rows: [] });
    });
  });

  it("runs an atomic transaction on a dedicated client and uses the server-resolved actor", async () => {
    const res = await POST(buildReq(validBody));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ success: true, returnId: 5 });

    // Transaction ran on the CONNECTED client (the C1 bug ran these on pooled query()).
    const sqls = clientQueryMock.mock.calls.map((c) => String(c[0]));
    expect(sqls.some((s) => s === "BEGIN")).toBe(true);
    expect(sqls.some((s) => s === "COMMIT")).toBe(true);
    expect(releaseMock).toHaveBeenCalled();

    // created_by is the resolved staff id (1), NOT the body's 999.
    const headerCall = clientQueryMock.mock.calls.find(
      (c) => /INSERT INTO purchase_return\b/i.test(String(c[0])) && /RETURNING/i.test(String(c[0]))
    );
    expect(headerCall?.[1]?.[2]).toBe(1);

    expect(logAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "pharmacy.purchase_return", entityId: 5 }),
      expect.anything()
    );
  });

  it("rejects invalid input with 400 and never opens a connection", async () => {
    const res = await POST(buildReq({ purchase_id: 10, items: [] }));
    expect(res.status).toBe(400);
    expect(connectMock).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated (no connection opened)", async () => {
    getAuthenticatedUserMock.mockRejectedValueOnce(new AuthError("Not authenticated", 401));
    const res = await POST(buildReq(validBody));
    expect(res.status).toBe(401);
    expect(connectMock).not.toHaveBeenCalled();
  });

  it("ROLLBACKs and releases the client when a detail insert fails", async () => {
    clientQueryMock.mockImplementation((sql: string) => {
      if (sql === "BEGIN") return Promise.resolve({ rows: [] });
      if (/INSERT INTO purchase_return\b/i.test(sql) && /RETURNING/i.test(sql)) {
        return Promise.resolve({ rows: [{ return_id: 5 }] });
      }
      if (/INSERT INTO purchase_return_detail/i.test(sql)) {
        return Promise.reject(new Error("detail insert failed"));
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await POST(buildReq(validBody));
    expect(res.status).toBe(500);
    const sqls = clientQueryMock.mock.calls.map((c) => String(c[0]));
    expect(sqls.some((s) => s === "ROLLBACK")).toBe(true);
    expect(releaseMock).toHaveBeenCalled();
  });
});
