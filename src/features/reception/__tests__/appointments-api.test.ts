import { beforeEach, describe, expect, it, vi } from "vitest";

const { connectMock, clientQueryMock, releaseMock, queryMock } = vi.hoisted(() => ({
  connectMock: vi.fn(),
  clientQueryMock: vi.fn(),
  releaseMock: vi.fn(),
  queryMock: vi.fn(),
}));

vi.mock("@/database/db", () => ({ default: { connect: connectMock }, query: queryMock }));
vi.mock("@/src/lib/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/server/auth")>();
  return {
    ...actual,
    requireRoles: vi.fn(async () => ({ user_code: "STF001", role: "Receptionist", name: "R" })),
    getAuthenticatedUser: vi.fn(async () => ({ user_code: "STF001", role: "Receptionist", name: "R" })),
  };
});
vi.mock("@/src/lib/server/actor", () => ({ resolveActorStaffId: vi.fn(async () => 1) }));
vi.mock("@/src/lib/server/audit", () => ({ logAuditEvent: vi.fn(async () => {}) }));

import { POST } from "@/src/app/api/appointments/route";
import { PATCH } from "@/src/app/api/appointments/[id]/route";

describe("appointments API", () => {
  beforeEach(() => {
    connectMock.mockReset();
    clientQueryMock.mockReset();
    releaseMock.mockReset();
    queryMock.mockReset();
    connectMock.mockResolvedValue({ query: clientQueryMock, release: releaseMock });
    clientQueryMock.mockResolvedValue({ rows: [] }); // default for trailing reads (reminder enqueue)
  });

  it("books a slot -> 201", async () => {
    clientQueryMock.mockResolvedValueOnce({ rows: [{ appointment_id: 50, scheduled_at: "2099-01-01T10:00:00" }] });
    const res = await POST({ json: async () => ({ patient_id: 1, doctor_id: 2, scheduled_at: "2099-01-01 10:00" }) } as any);
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.appointment_id).toBe(50);
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a booking with missing fields (400) before connecting", async () => {
    const res = await POST({ json: async () => ({ patient_id: 1 }) } as any);
    expect(res.status).toBe(400);
    expect(connectMock).not.toHaveBeenCalled();
  });

  it("maps a slot clash (unique violation) to 409", async () => {
    clientQueryMock.mockRejectedValueOnce({ code: "23505" });
    const res = await POST({ json: async () => ({ patient_id: 1, doctor_id: 2, scheduled_at: "2099-01-01 10:00" }) } as any);
    expect(res.status).toBe(409);
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid status on PATCH (400)", async () => {
    const res = await PATCH({ json: async () => ({ status: "teleport" }) } as any, { params: Promise.resolve({ id: "50" }) } as any);
    expect(res.status).toBe(400);
  });

  it("updates appointment status -> 200", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ appointment_id: 50, status: "confirmed" }] });
    const res = await PATCH({ json: async () => ({ status: "confirmed" }) } as any, { params: Promise.resolve({ id: "50" }) } as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.appointment.status).toBe("confirmed");
  });
});
