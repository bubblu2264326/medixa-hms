import { describe, it, expect, beforeEach, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));
const { logAuditEventMock } = vi.hoisted(() => ({ logAuditEventMock: vi.fn(async () => null) }));
const { getAuthenticatedUserMock } = vi.hoisted(() => ({ getAuthenticatedUserMock: vi.fn() }));

vi.mock("@/database/db", () => ({ query: queryMock }));
vi.mock("@/src/lib/server/audit", () => ({ logAuditEvent: logAuditEventMock }));
// importOriginal keeps the real AuthError class so the route's
// `err instanceof AuthError` checks work; only getAuthenticatedUser is stubbed.
vi.mock("@/src/lib/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/server/auth")>();
  return { ...actual, getAuthenticatedUser: getAuthenticatedUserMock };
});

import { POST, PATCH, GET } from "@/src/app/api/patient/route";
import { AuthError } from "@/src/lib/server/auth";

const buildReq = (body?: unknown) => ({ json: async () => body }) as any;

describe("patient API", () => {
  beforeEach(() => {
    queryMock.mockReset();
    logAuditEventMock.mockClear();
    getAuthenticatedUserMock.mockReset();
    getAuthenticatedUserMock.mockResolvedValue({
      user_code: "STF001",
      role: "Receptionist",
      name: "Front Desk",
    });
  });

  it("creates a patient with valid data, coerces age, and writes an audit entry", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ patient_id: 7 }] });
    const res = await POST(
      buildReq({ patient_name: "Asma Bibi", age: "30", gender: "Female", cnic: "3520112223334" })
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.patient_id).toBe(7);
    // age coerced to a real number (regression guard for the parseInt -> NaN bug)
    expect(queryMock.mock.calls[0][1][1]).toBe(30);
    expect(logAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "patient.create", entityType: "patient", entityId: 7 })
    );
  });

  it("rejects invalid data with 400 and never touches the DB", async () => {
    const res = await POST(buildReq({ patient_name: "", gender: "Alien" }));
    expect(res.status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
    expect(logAuditEventMock).not.toHaveBeenCalled();
  });

  it("maps a duplicate-CNIC violation (PG 23505) to 409", async () => {
    queryMock.mockRejectedValueOnce(Object.assign(new Error("dup"), { code: "23505" }));
    const res = await POST(buildReq({ patient_name: "Dup", cnic: "3520112223334" }));
    expect(res.status).toBe(409);
  });

  it("returns 401 when unauthenticated", async () => {
    getAuthenticatedUserMock.mockRejectedValueOnce(new AuthError("Not authenticated", 401));
    const res = await POST(buildReq({ patient_name: "X" }));
    expect(res.status).toBe(401);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("PATCH requires patient_id (400 when missing)", async () => {
    const res = await PATCH(buildReq({ patient_name: "No Id" }));
    expect(res.status).toBe(400);
  });

  it("PATCH returns 404 when the patient does not exist", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const res = await PATCH(buildReq({ patient_id: 999, patient_name: "Ghost" }));
    expect(res.status).toBe(404);
    expect(logAuditEventMock).not.toHaveBeenCalled();
  });

  it("GET returns patient rows for an authenticated user", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ patient_id: 1, patient_name: "A" }] });
    const res = await GET(buildReq());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
  });
});
