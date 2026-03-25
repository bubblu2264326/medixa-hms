import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAttendancePolicyMock, markAttendanceByUserCodeMock, logAuditEventMock } = vi.hoisted(() => ({
    getAttendancePolicyMock: vi.fn(),
    markAttendanceByUserCodeMock: vi.fn(),
    logAuditEventMock: vi.fn(),
}));

vi.mock("@/src/lib/server/attendance", () => ({
    getAttendancePolicy: getAttendancePolicyMock,
    markAttendanceByUserCode: markAttendanceByUserCodeMock,
}));

vi.mock("@/src/lib/server/audit", () => ({
    logAuditEvent: logAuditEventMock,
}));

import { POST } from "@/src/app/api/integrations/attendance/events/route";

describe("attendance device ingestion endpoint", () => {
    beforeEach(() => {
        getAttendancePolicyMock.mockReset();
        markAttendanceByUserCodeMock.mockReset();
        logAuditEventMock.mockReset();
        getAttendancePolicyMock.mockResolvedValue({
            grace_minutes: 15,
            half_day_minutes: 240,
            overtime_minutes: 30,
            early_leave_minutes: 30,
            timezone: "Asia/Karachi",
            device_api_key: "DEVICE_KEY",
        });
    });

    it("rejects request when device key is missing/invalid", async () => {
        const req = new Request("http://localhost/api/integrations/attendance/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_code: "STF001", event: "check_in" }),
        });

        const response = await POST(req as any);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error).toContain("Invalid device API key");
    });

    it("accepts valid check-in and returns kiosk confirmation payload", async () => {
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
                source: "device",
                check_in_time: "2026-03-24T04:00:00.000Z",
                check_out_time: null,
                derived_status: "on_time",
                is_unscheduled: false,
                is_on_time: true,
                late_minutes: 0,
                early_leave_minutes: 0,
                overtime_minutes: 0,
                roster_id: 10,
                shift_code: "GEN",
                message: "On time.",
            },
        });

        const req = new Request("http://localhost/api/integrations/attendance/events", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-attendance-device-key": "DEVICE_KEY",
            },
            body: JSON.stringify({ user_code: "stf001", event: "check_in", device_id: "KIOSK-1" }),
        });

        const response = await POST(req as any);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.employee.user_code).toBe("STF001");
        expect(body.outcome.status).toBe("on_time");
        expect(logAuditEventMock).toHaveBeenCalledTimes(1);
    });
});
