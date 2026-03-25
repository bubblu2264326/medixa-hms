import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock("@/database/db", () => ({
  query: queryMock,
}));

import {
  normalizeDbUtcNaiveTimestampToIso,
  parseDbUtcNaiveTimestamp,
} from "@/src/lib/server/systemTimezone";
import { getAttendanceRecordByUserCode } from "@/src/lib/server/attendance";

describe("attendance timestamp normalization", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("normalizes UTC-naive DB timestamps to ISO UTC", () => {
    expect(normalizeDbUtcNaiveTimestampToIso("2026-03-25 06:04:29.004")).toBe(
      "2026-03-25T06:04:29.004Z"
    );
    expect(normalizeDbUtcNaiveTimestampToIso("2026-03-25T06:04:29.004")).toBe(
      "2026-03-25T06:04:29.004Z"
    );
  });

  it("preserves already-zoned timestamps and rejects invalid values", () => {
    expect(normalizeDbUtcNaiveTimestampToIso("2026-03-25T06:04:29.004Z")).toBe(
      "2026-03-25T06:04:29.004Z"
    );
    expect(normalizeDbUtcNaiveTimestampToIso("2026-03-25T11:04:29.004+05:00")).toBe(
      "2026-03-25T06:04:29.004Z"
    );
    expect(normalizeDbUtcNaiveTimestampToIso("not-a-date")).toBeNull();
    expect(parseDbUtcNaiveTimestamp("not-a-date")).toBeNull();
  });

  it("returns ISO UTC fields for self attendance status payload source", async () => {
    queryMock.mockImplementation(async (sql: unknown) => {
      const text = String(sql);

      if (text.includes("FROM staff") && text.includes("WHERE user_code = $1")) {
        return {
          rows: [
            {
              person_id: 6,
              user_code: "STF006",
              name: "Bilal Raza",
              employment_status: "active",
            },
          ],
        };
      }

      if (text.includes("FROM system_settings")) {
        return {
          rows: [
            { setting_key: "system_timezone", setting_value: "Asia/Karachi" },
          ],
        };
      }

      if (
        text.includes("FROM staff_attendance") &&
        text.includes("attendance_id") &&
        text.includes("check_in_time") &&
        text.includes("check_out_time")
      ) {
        return {
          rows: [
            {
              attendance_id: "a-1",
              check_in_time: "2026-03-25 06:04:29.004",
              check_out_time: null,
              status: "Present",
            },
          ],
        };
      }

      return { rows: [] };
    });

    const record = await getAttendanceRecordByUserCode("STF006", new Date("2026-03-25T10:00:00.000Z"));

    expect(record).not.toBeNull();
    expect(record?.check_in_time).toBe("2026-03-25T06:04:29.004Z");
    expect(record?.check_out_time).toBeNull();
  });
});
