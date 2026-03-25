import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAuthenticatedUserMock, markAttendanceByUserCodeMock, logAuditEventMock } = vi.hoisted(() => ({
    getAuthenticatedUserMock: vi.fn(),
    markAttendanceByUserCodeMock: vi.fn(),
    logAuditEventMock: vi.fn(),
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
    markAttendanceByUserCode: markAttendanceByUserCodeMock,
}));

vi.mock("@/src/lib/server/audit", () => ({
    logAuditEvent: logAuditEventMock,
}));

import { POST } from "@/src/app/api/attendance/me/check-in/route";

describe("self attendance check-in endpoint", () => {
    beforeEach(() => {
        getAuthenticatedUserMock.mockReset();
        markAttendanceByUserCodeMock.mockReset();
        logAuditEventMock.mockReset();
    });

    it("returns auth error when unauthenticated", async () => {
        getAuthenticatedUserMock.mockRejectedValue(new MockAuthError("Not authenticated", 401));
        const response = await POST(
            new Request("http://localhost/api/attendance/me/check-in", { method: "POST" }) as any
        );
        const body = await response.json();
        expect(response.status).toBe(401);
        expect(body.error).toBe("Not authenticated");
    });

    it("creates self check-in entry when authenticated", async () => {
        getAuthenticatedUserMock.mockResolvedValue({
            user_code: "STF001",
            role: "Receptionist",
            name: "Sara Ahmed",
            account_type: "staff",
        });
        markAttendanceByUserCodeMock.mockResolvedValue({
            ok: true,
            status: 200,
            data: {
                attendance_id: "a1",
                staff_id: 1,
                user_code: "STF001",
                staff_name: "Sara Ahmed",
                status: "Present",
                date: "2026-03-24",
                event: "check_in",
                source: "self",
                check_in_time: "2026-03-24T04:00:00.000Z",
                check_out_time: null,
                derived_status: "on_time",
                is_unscheduled: false,
                is_on_time: true,
                late_minutes: 0,
                early_leave_minutes: 0,
                overtime_minutes: 0,
                roster_id: 1,
                shift_code: "GEN",
                message: "On time.",
            },
        });

        const response = await POST(
            new Request("http://localhost/api/attendance/me/check-in", { method: "POST" }) as any
        );
        const body = await response.json();
        expect(response.status).toBe(200);
        expect(body.data.event).toBe("check_in");
        expect(logAuditEventMock).toHaveBeenCalledTimes(1);
    });
});
