import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  queryMock,
  requireAdminOrSuperAdminMock,
  logAuditEventMock,
  setSystemTimezoneCacheMock,
  invalidateSystemTimezoneCacheMock,
  isValidIanaTimezoneMock,
} = vi.hoisted(() => ({
  queryMock: vi.fn(),
  requireAdminOrSuperAdminMock: vi.fn(),
  logAuditEventMock: vi.fn(),
  setSystemTimezoneCacheMock: vi.fn(),
  invalidateSystemTimezoneCacheMock: vi.fn(),
  isValidIanaTimezoneMock: vi.fn(),
}));

vi.mock("@/database/db", () => ({
  query: queryMock,
}));

vi.mock("@/src/lib/server/auth", () => ({
  AuthError: class AuthError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  requireAdminOrSuperAdmin: requireAdminOrSuperAdminMock,
}));

vi.mock("@/src/lib/server/audit", () => ({
  logAuditEvent: logAuditEventMock,
}));

vi.mock("@/src/lib/server/systemTimezone", () => ({
  isValidIanaTimezone: isValidIanaTimezoneMock,
  setSystemTimezoneCache: setSystemTimezoneCacheMock,
  invalidateSystemTimezoneCache: invalidateSystemTimezoneCacheMock,
}));

import { PUT } from "@/src/app/api/admin/settings/route";

describe("admin settings system timezone", () => {
  beforeEach(() => {
    queryMock.mockReset();
    requireAdminOrSuperAdminMock.mockReset();
    logAuditEventMock.mockReset();
    setSystemTimezoneCacheMock.mockReset();
    invalidateSystemTimezoneCacheMock.mockReset();
    isValidIanaTimezoneMock.mockReset();

    requireAdminOrSuperAdminMock.mockResolvedValue({
      user_code: "SADM001",
      role: "Super Admin",
    });
    queryMock.mockResolvedValue({ rows: [{ staff_id: 1 }] });
    isValidIanaTimezoneMock.mockReturnValue(true);
  });

  it("rejects invalid system timezone", async () => {
    isValidIanaTimezoneMock.mockReturnValue(false);

    const req = new Request("http://localhost/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({
        settings: [{ key: "system_timezone", value: "Invalid/Timezone" }],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(req as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Invalid IANA timezone");
    expect(setSystemTimezoneCacheMock).not.toHaveBeenCalled();
  });

  it("accepts valid system timezone and updates cache", async () => {
    const req = new Request("http://localhost/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({
        settings: [{ key: "system_timezone", value: "Asia/Karachi" }],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(req as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toContain("updated");
    expect(setSystemTimezoneCacheMock).toHaveBeenCalledWith("Asia/Karachi");

    const sqlText = queryMock.mock.calls.map((call) => String(call[0])).join("\n");
    expect(sqlText).toContain("INSERT INTO system_settings");
  });
});
