import { query } from "@/database/db";
import {
  getCurrentDateInTimezone,
  normalizeDbUtcNaiveTimestampToIso,
  parseDbUtcNaiveTimestamp,
} from "@/src/lib/server/systemTimezone";

export type AttendancePolicy = {
  grace_minutes: number;
  half_day_minutes: number;
  overtime_minutes: number;
  early_leave_minutes: number;
  timezone: string;
  device_api_key: string;
};

type AttendanceStatusInput = string | null | undefined;
export type AttendanceAccountType = "staff" | "doctor";

type RosterContext = {
  roster_id: number | null;
  shift_code: string | null;
  shift_name: string | null;
  start_time: string | null;
  end_time: string | null;
  is_night_shift: boolean;
};

type AttendanceSubject = {
  accountType: AttendanceAccountType;
  personId: number;
  userCode: string;
  name: string;
  employmentStatus: string;
};

export type AttendanceEvaluation = {
  derived_status: string;
  is_unscheduled: boolean;
  is_on_time: boolean;
  late_minutes: number;
  early_leave_minutes: number;
  overtime_minutes: number;
  roster_id: number | null;
  shift_code: string | null;
  message: string;
};

export type MarkAttendanceResult = AttendanceEvaluation & {
  attendance_id: string;
  account_type: AttendanceAccountType;
  person_id: number;
  staff_id: number;
  user_code: string;
  staff_name: string;
  status: string;
  date: string;
  event: "check_in" | "check_out";
  source: "self" | "device" | "admin";
  check_in_time: string | null;
  check_out_time: string | null;
};

const DEFAULT_POLICY: AttendancePolicy = {
  grace_minutes: 15,
  half_day_minutes: 240,
  overtime_minutes: 30,
  early_leave_minutes: 30,
  timezone: "Asia/Karachi",
  device_api_key: "HMS_DEVICE_KEY_CHANGE_ME",
};

function minutesBetween(later: Date, earlier: Date) {
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / 60000));
}

function combineDateTime(date: string, hhmmss: string | null) {
  if (!hhmmss) return null;
  const normalized = hhmmss.length >= 8 ? hhmmss.slice(0, 8) : `${hhmmss}:00`;
  const parsed = new Date(`${date}T${normalized}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function normalizeStatus(status: AttendanceStatusInput) {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (normalized === "absent") return "absent";
  if (normalized === "leave") return "leave";
  if (normalized === "half-day" || normalized === "half_day") return "half_day";
  if (normalized === "present") return "present";
  return normalized || "present";
}

function parseNumberish(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return fallback;
}

function toIsoOrNull(value: unknown) {
  return normalizeDbUtcNaiveTimestampToIso(value);
}

function attendanceTableInfo(accountType: AttendanceAccountType) {
  if (accountType === "doctor") {
    return {
      tableName: "doctor_attendance",
      idColumn: "doctor_id",
      joinTable: "doctor",
      joinIdColumn: "doctor_id",
      joinNameColumn: "doctor_name",
    } as const;
  }

  return {
    tableName: "staff_attendance",
    idColumn: "staff_id",
    joinTable: "staff",
    joinIdColumn: "staff_id",
    joinNameColumn: "name",
  } as const;
}

async function resolveAttendanceSubject(userCodeInput: string): Promise<AttendanceSubject | null> {
  const userCode = String(userCodeInput ?? "").trim().toUpperCase();

  const staffResult = await query(
    `
      SELECT staff_id AS person_id, user_code, name, employment_status
      FROM staff
      WHERE user_code = $1
      LIMIT 1
    `,
    [userCode]
  );
  const staff = staffResult.rows[0];
  if (staff) {
    return {
      accountType: "staff",
      personId: Number(staff.person_id),
      userCode: String(staff.user_code),
      name: String(staff.name),
      employmentStatus: String(staff.employment_status ?? "active"),
    };
  }

  const doctorResult = await query(
    `
      SELECT doctor_id AS person_id, user_code, doctor_name AS name, employment_status
      FROM doctor
      WHERE user_code = $1
      LIMIT 1
    `,
    [userCode]
  );
  const doctor = doctorResult.rows[0];
  if (!doctor) return null;

  return {
    accountType: "doctor",
    personId: Number(doctor.person_id),
    userCode: String(doctor.user_code),
    name: String(doctor.name),
    employmentStatus: String(doctor.employment_status ?? "active"),
  };
}

export async function getAttendancePolicy(): Promise<AttendancePolicy> {
  const keys = [
    "attendance_grace_minutes",
    "attendance_half_day_minutes",
    "attendance_overtime_minutes",
    "attendance_early_leave_minutes",
    "system_timezone",
    "attendance_timezone",
    "attendance_device_api_key",
  ];
  const result = await query(
    `
      SELECT setting_key, setting_value
      FROM system_settings
      WHERE setting_key = ANY($1::text[])
    `,
    [keys]
  );
  const map = new Map<string, unknown>();
  for (const row of result.rows) {
    map.set(String(row.setting_key), row.setting_value);
  }

  return {
    grace_minutes: parseNumberish(map.get("attendance_grace_minutes"), DEFAULT_POLICY.grace_minutes),
    half_day_minutes: parseNumberish(map.get("attendance_half_day_minutes"), DEFAULT_POLICY.half_day_minutes),
    overtime_minutes: parseNumberish(map.get("attendance_overtime_minutes"), DEFAULT_POLICY.overtime_minutes),
    early_leave_minutes: parseNumberish(
      map.get("attendance_early_leave_minutes"),
      DEFAULT_POLICY.early_leave_minutes
    ),
    timezone:
      typeof map.get("system_timezone") === "string"
        ? String(map.get("system_timezone"))
        : typeof map.get("attendance_timezone") === "string"
          ? String(map.get("attendance_timezone"))
          : DEFAULT_POLICY.timezone,
    device_api_key:
      typeof map.get("attendance_device_api_key") === "string"
        ? String(map.get("attendance_device_api_key"))
        : DEFAULT_POLICY.device_api_key,
  };
}

async function getRosterForAttendance(accountType: AttendanceAccountType, personId: number, date: string): Promise<RosterContext | null> {
  const filterColumn = accountType === "doctor" ? "r.doctor_id" : "r.staff_id";

  const result = await query(
    `
      SELECT
        r.roster_id,
        st.shift_code,
        st.shift_name,
        st.start_time::text AS start_time,
        st.end_time::text AS end_time,
        st.is_night_shift
      FROM staff_roster_assignments r
      JOIN staff_shift_templates st ON st.shift_template_id = r.shift_template_id
      WHERE (
        (${filterColumn} = $1)
        OR (
          r.account_type = $3
          AND r.person_id = $1
        )
      )
        AND r.roster_date = $2::date
      LIMIT 1
    `,
    [personId, date, accountType]
  );
  return result.rows[0] ?? null;
}

export function evaluateAttendance(
  {
    date,
    checkInTime,
    checkOutTime,
    status,
    roster,
  }: {
    date: string;
    checkInTime: Date | null;
    checkOutTime: Date | null;
    status?: AttendanceStatusInput;
    roster: RosterContext | null;
  },
  policy: AttendancePolicy
): AttendanceEvaluation {
  const normalizedStatus = normalizeStatus(status);
  const isUnscheduled = !roster;

  if (normalizedStatus === "absent") {
    return {
      derived_status: "absent",
      is_unscheduled: isUnscheduled,
      is_on_time: false,
      late_minutes: 0,
      early_leave_minutes: 0,
      overtime_minutes: 0,
      roster_id: roster?.roster_id ?? null,
      shift_code: roster?.shift_code ?? null,
      message: "Absent marked.",
    };
  }

  if (normalizedStatus === "leave") {
    return {
      derived_status: "leave",
      is_unscheduled: isUnscheduled,
      is_on_time: false,
      late_minutes: 0,
      early_leave_minutes: 0,
      overtime_minutes: 0,
      roster_id: roster?.roster_id ?? null,
      shift_code: roster?.shift_code ?? null,
      message: "Leave marked.",
    };
  }

  if (!roster) {
    return {
      derived_status: "unscheduled",
      is_unscheduled: true,
      is_on_time: false,
      late_minutes: 0,
      early_leave_minutes: 0,
      overtime_minutes: 0,
      roster_id: null,
      shift_code: null,
      message: "Attendance captured as unscheduled (no roster assigned).",
    };
  }

  const start = combineDateTime(date, roster.start_time);
  let end = combineDateTime(date, roster.end_time);
  if (start && end && end.getTime() <= start.getTime()) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  }

  let lateMinutes = 0;
  let earlyLeaveMinutes = 0;
  let overtimeMinutes = 0;
  let isOnTime = false;

  if (checkInTime && start) {
    const graceEdge = new Date(start.getTime() + policy.grace_minutes * 60000);
    lateMinutes = checkInTime.getTime() > graceEdge.getTime() ? minutesBetween(checkInTime, graceEdge) : 0;
    isOnTime = lateMinutes === 0;
  }

  if (checkOutTime && end) {
    if (checkOutTime.getTime() < end.getTime()) {
      earlyLeaveMinutes = minutesBetween(end, checkOutTime);
    } else {
      overtimeMinutes = minutesBetween(checkOutTime, end);
    }
  }

  const workedMinutes =
    checkInTime && checkOutTime ? Math.max(0, minutesBetween(checkOutTime, checkInTime)) : 0;

  let derivedStatus = lateMinutes > 0 ? "late" : "on_time";
  if (normalizedStatus === "half_day") {
    derivedStatus = "half_day";
  } else if (workedMinutes > 0 && workedMinutes < policy.half_day_minutes) {
    derivedStatus = "half_day";
  } else if (earlyLeaveMinutes >= policy.early_leave_minutes && earlyLeaveMinutes > 0) {
    derivedStatus = "early_leave";
  } else if (overtimeMinutes >= policy.overtime_minutes && overtimeMinutes > 0) {
    derivedStatus = "overtime";
  }

  const message =
    derivedStatus === "late"
      ? `Late by ${lateMinutes} minute(s).`
      : derivedStatus === "half_day"
      ? "Half day based on policy threshold."
      : derivedStatus === "early_leave"
      ? `Left early by ${earlyLeaveMinutes} minute(s).`
      : derivedStatus === "overtime"
      ? `Overtime ${overtimeMinutes} minute(s).`
      : "On time.";

  return {
    derived_status: derivedStatus,
    is_unscheduled: false,
    is_on_time: isOnTime && derivedStatus === "on_time",
    late_minutes: lateMinutes,
    early_leave_minutes: earlyLeaveMinutes,
    overtime_minutes: overtimeMinutes,
    roster_id: roster.roster_id,
    shift_code: roster.shift_code,
    message,
  };
}

export async function recomputeAndPersistAttendance(
  attendanceId: string,
  policy: AttendancePolicy,
  accountType: AttendanceAccountType = "staff"
) {
  const info = attendanceTableInfo(accountType);
  const recordResult = await query(
    `
      SELECT
        attendance_id,
        ${info.idColumn} AS person_id,
        date::text AS date,
        check_in_time::text AS check_in_time,
        check_out_time::text AS check_out_time,
        status
      FROM ${info.tableName}
      WHERE attendance_id = $1
      LIMIT 1
    `,
    [attendanceId]
  );
  const record = recordResult.rows[0];
  if (!record) return null;

  const roster = await getRosterForAttendance(accountType, Number(record.person_id), String(record.date));
  const evaluated = evaluateAttendance(
    {
      date: String(record.date),
      checkInTime: parseDbUtcNaiveTimestamp(record.check_in_time),
      checkOutTime: parseDbUtcNaiveTimestamp(record.check_out_time),
      status: record.status,
      roster,
    },
    policy
  );

  await query(
    `
      UPDATE ${info.tableName}
      SET
        roster_id = $2,
        shift_code = $3,
        late_minutes = $4,
        early_leave_minutes = $5,
        overtime_minutes = $6,
        derived_status = $7,
        is_unscheduled = $8,
        is_on_time = $9,
        policy_snapshot = $10::jsonb
      WHERE attendance_id = $1
    `,
    [
      attendanceId,
      evaluated.roster_id,
      evaluated.shift_code,
      evaluated.late_minutes,
      evaluated.early_leave_minutes,
      evaluated.overtime_minutes,
      evaluated.derived_status,
      evaluated.is_unscheduled,
      evaluated.is_on_time,
      JSON.stringify({
        grace_minutes: policy.grace_minutes,
        half_day_minutes: policy.half_day_minutes,
        overtime_minutes: policy.overtime_minutes,
        early_leave_minutes: policy.early_leave_minutes,
        timezone: policy.timezone,
      }),
    ]
  );

  return evaluated;
}

export async function markAttendanceByUserCode(input: {
  userCode: string;
  source: "self" | "device" | "admin";
  markedBy: string;
  event: "check_in" | "check_out" | "auto";
  at?: Date;
}) {
  const policy = await getAttendancePolicy();
  const userCode = String(input.userCode ?? "").trim().toUpperCase();
  const at = input.at ?? new Date();
  const date = getCurrentDateInTimezone(policy.timezone, at);
  const subject = await resolveAttendanceSubject(userCode);

  if (!subject) {
    return { ok: false as const, status: 404, error: "Employee not found" };
  }

  if (String(subject.employmentStatus ?? "active").toLowerCase() !== "active") {
    return { ok: false as const, status: 403, error: "Employee is not active" };
  }

  const info = attendanceTableInfo(subject.accountType);

  const existingResult = await query(
    `
      SELECT *
      FROM ${info.tableName}
      WHERE ${info.idColumn} = $1
        AND date = $2::date
      LIMIT 1
    `,
    [subject.personId, date]
  );
  const existing = existingResult.rows[0] ?? null;

  const targetEvent =
    input.event === "auto"
      ? !existing || !existing.check_in_time
        ? "check_in"
        : "check_out"
      : input.event;

  if (targetEvent === "check_in" && existing?.check_in_time) {
    return { ok: false as const, status: 409, error: "Already checked in for this date" };
  }

  if (targetEvent === "check_out") {
    if (!existing || !existing.check_in_time) {
      return { ok: false as const, status: 409, error: "Cannot check out without check-in" };
    }
    if (existing.check_out_time) {
      return { ok: false as const, status: 409, error: "Already checked out for this date" };
    }
  }

  let attendanceId: string;
  if (!existing) {
    const insertResult = await query(
      `
        INSERT INTO ${info.tableName} (
          ${info.idColumn},
          date,
          check_in_time,
          status,
          marked_by,
          check_in_source
        ) VALUES ($1, $2::date, $3, 'Present', $4, $5)
        RETURNING attendance_id
      `,
      [subject.personId, date, targetEvent === "check_in" ? at.toISOString() : null, input.markedBy, input.source]
    );
    attendanceId = String(insertResult.rows[0].attendance_id);
  } else {
    const updateResult = await query(
      `
        UPDATE ${info.tableName}
        SET
          check_in_time = COALESCE(check_in_time, $2),
          check_out_time = CASE WHEN $3 THEN $4 ELSE check_out_time END,
          check_in_source = CASE WHEN check_in_time IS NULL THEN $5 ELSE check_in_source END,
          check_out_source = CASE WHEN $3 THEN $5 ELSE check_out_source END,
          marked_by = $6,
          status = COALESCE(status, 'Present')
        WHERE attendance_id = $1
        RETURNING attendance_id
      `,
      [
        existing.attendance_id,
        targetEvent === "check_in" ? at.toISOString() : null,
        targetEvent === "check_out",
        targetEvent === "check_out" ? at.toISOString() : null,
        input.source,
        input.markedBy,
      ]
    );
    attendanceId = String(updateResult.rows[0].attendance_id);
  }

  const evaluated = await recomputeAndPersistAttendance(attendanceId, policy, subject.accountType);
  const latestResult = await query(
    `
      SELECT
        a.attendance_id,
        a.${info.idColumn} AS person_id,
        a.check_in_time::text AS check_in_time,
        a.check_out_time::text AS check_out_time,
        a.status,
        p.user_code,
        p.${info.joinNameColumn} AS staff_name
      FROM ${info.tableName} a
      JOIN ${info.joinTable} p ON p.${info.joinIdColumn} = a.${info.idColumn}
      WHERE a.attendance_id = $1
      LIMIT 1
    `,
    [attendanceId]
  );
  const latest = latestResult.rows[0];
  const normalizedCheckIn = toIsoOrNull(latest?.check_in_time);
  const normalizedCheckOut = toIsoOrNull(latest?.check_out_time);
  console.info("[attendance/time-debug] markAttendanceByUserCode", {
    userCode: subject.userCode,
    accountType: subject.accountType,
    date,
    event: targetEvent,
    rawCheckIn: latest?.check_in_time ?? null,
    rawCheckInType: latest?.check_in_time == null ? "nullish" : typeof latest.check_in_time,
    rawCheckInCtor: latest?.check_in_time?.constructor?.name ?? null,
    normalizedCheckIn,
    rawCheckOut: latest?.check_out_time ?? null,
    rawCheckOutType: latest?.check_out_time == null ? "nullish" : typeof latest.check_out_time,
    rawCheckOutCtor: latest?.check_out_time?.constructor?.name ?? null,
    normalizedCheckOut,
    policyTimezone: policy.timezone,
  });

  return {
    ok: true as const,
    status: 200,
    data: {
      attendance_id: String(latest.attendance_id),
      account_type: subject.accountType,
      person_id: Number(latest.person_id),
      staff_id: Number(latest.person_id),
      user_code: String(latest.user_code),
      staff_name: String(latest.staff_name),
      status: String(latest.status ?? "Present"),
      date,
      event: targetEvent,
      source: input.source,
      check_in_time: normalizedCheckIn,
      check_out_time: normalizedCheckOut,
      ...(evaluated ?? {
        derived_status: "unscheduled",
        is_unscheduled: true,
        is_on_time: false,
        late_minutes: 0,
        early_leave_minutes: 0,
        overtime_minutes: 0,
        roster_id: null,
        shift_code: null,
        message: "Attendance updated.",
      }),
    } satisfies MarkAttendanceResult,
  };
}

export async function previewManualAttendance(input: {
  staffId?: number;
  personId?: number;
  accountType?: AttendanceAccountType;
  date: string;
  status?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
}) {
  const policy = await getAttendancePolicy();
  const accountType = input.accountType ?? "staff";
  const personId = Number(input.personId ?? input.staffId ?? 0);
  const roster = personId > 0 ? await getRosterForAttendance(accountType, personId, input.date) : null;

  return evaluateAttendance(
    {
      date: input.date,
      checkInTime: combineDateTime(input.date, input.checkInTime ?? null),
      checkOutTime: combineDateTime(input.date, input.checkOutTime ?? null),
      status: input.status ?? "Present",
      roster,
    },
    policy
  );
}

export async function getAttendanceRecordByUserCode(userCodeInput: string, dateObj: Date = new Date()) {
  const userCode = String(userCodeInput ?? "").trim().toUpperCase();
  const subject = await resolveAttendanceSubject(userCode);
  if (!subject) return null;

  const policy = await getAttendancePolicy();
  const info = attendanceTableInfo(subject.accountType);
  const dateStr = getCurrentDateInTimezone(policy.timezone, dateObj);

  const existingResult = await query(
    `
      SELECT
        attendance_id,
        check_in_time::text AS check_in_time,
        check_out_time::text AS check_out_time,
        status
      FROM ${info.tableName}
      WHERE ${info.idColumn} = $1
        AND date = $2::date
      LIMIT 1
    `,
    [subject.personId, dateStr]
  );

  const row = existingResult.rows[0];
  if (!row) return null;
  const normalizedCheckIn = toIsoOrNull(row.check_in_time);
  const normalizedCheckOut = toIsoOrNull(row.check_out_time);
  console.info("[attendance/time-debug] getAttendanceRecordByUserCode", {
    userCode: subject.userCode,
    accountType: subject.accountType,
    dateStr,
    rawCheckIn: row.check_in_time ?? null,
    rawCheckInType: row.check_in_time == null ? "nullish" : typeof row.check_in_time,
    rawCheckInCtor: row.check_in_time?.constructor?.name ?? null,
    normalizedCheckIn,
    rawCheckOut: row.check_out_time ?? null,
    rawCheckOutType: row.check_out_time == null ? "nullish" : typeof row.check_out_time,
    rawCheckOutCtor: row.check_out_time?.constructor?.name ?? null,
    normalizedCheckOut,
    policyTimezone: policy.timezone,
  });

  return {
    ...row,
    check_in_time: normalizedCheckIn,
    check_out_time: normalizedCheckOut,
  };
}
