import { describe, expect, it } from "vitest";
import { vi } from "vitest";

vi.mock("@/database/db", () => ({
    query: vi.fn(),
}));
import { evaluateAttendance } from "@/src/lib/server/attendance";

const POLICY = {
    grace_minutes: 15,
    half_day_minutes: 240,
    overtime_minutes: 30,
    early_leave_minutes: 30,
    timezone: "Asia/Karachi",
    device_api_key: "key",
};

describe("attendance policy derivation", () => {
    it("marks unscheduled when no roster is assigned", () => {
        const result = evaluateAttendance(
            {
                date: "2026-03-24",
                checkInTime: new Date("2026-03-24T09:00:00"),
                checkOutTime: new Date("2026-03-24T17:00:00"),
                status: "Present",
                roster: null,
            },
            POLICY
        );

        expect(result.derived_status).toBe("unscheduled");
        expect(result.is_unscheduled).toBe(true);
    });

    it("marks late when check-in is beyond grace", () => {
        const result = evaluateAttendance(
            {
                date: "2026-03-24",
                checkInTime: new Date("2026-03-24T09:25:00"),
                checkOutTime: new Date("2026-03-24T17:00:00"),
                status: "Present",
                roster: {
                    roster_id: 1,
                    shift_code: "GEN",
                    shift_name: "General",
                    start_time: "09:00:00",
                    end_time: "17:00:00",
                    is_night_shift: false,
                },
            },
            POLICY
        );

        expect(result.derived_status).toBe("late");
        expect(result.late_minutes).toBe(10);
    });

    it("marks half day when worked minutes are below policy threshold", () => {
        const result = evaluateAttendance(
            {
                date: "2026-03-24",
                checkInTime: new Date("2026-03-24T09:00:00"),
                checkOutTime: new Date("2026-03-24T12:00:00"),
                status: "Present",
                roster: {
                    roster_id: 1,
                    shift_code: "GEN",
                    shift_name: "General",
                    start_time: "09:00:00",
                    end_time: "17:00:00",
                    is_night_shift: false,
                },
            },
            POLICY
        );

        expect(result.derived_status).toBe("half_day");
    });
});
