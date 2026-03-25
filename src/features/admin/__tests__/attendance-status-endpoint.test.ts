import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAuthenticatedUserMock, getAttendanceRecordByUserCodeMock } = vi.hoisted(() => ({
  getAuthenticatedUserMock: vi.fn(),
  getAttendanceRecordByUserCodeMock: vi.fn(),
}));

const { MockAuthError } = vi.hoisted(() => {
  class HoistedAuthError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }

  return { MockAuthError: HoistedAuthError };
});

vi.mock("@/src/lib/server/auth", () => ({
  AuthError: MockAuthError,
  getAuthenticatedUser: getAuthenticatedUserMock,
}));

vi.mock("@/src/lib/server/attendance", () => ({
  getAttendanceRecordByUserCode: getAttendanceRecordByUserCodeMock,
}));

import { GET } from "@/src/app/api/attendance/me/status/route";

describe("attendance self status endpoint", () => {
  beforeEach(() => {
    getAuthenticatedUserMock.mockReset();
    getAttendanceRecordByUserCodeMock.mockReset();
  });

  it("returns ISO UTC check-in/check-out values", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ user_code: "STF006" });
    getAttendanceRecordByUserCodeMock.mockResolvedValue({
      attendance_id: "a1",
      check_in_time: "2026-03-25T06:04:29.004Z",
      check_out_time: null,
      status: "Present",
    });

    const response = await GET(new Request("http://localhost/api/attendance/me/status") as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.check_in_time).toBe("2026-03-25T06:04:29.004Z");
    expect(String(body.data.check_in_time)).toContain("Z");
  });

  it("returns auth error when unauthenticated", async () => {
    getAuthenticatedUserMock.mockRejectedValue(new MockAuthError("Not authenticated", 401));
    const response = await GET(new Request("http://localhost/api/attendance/me/status") as any);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Not authenticated");
  });
});
