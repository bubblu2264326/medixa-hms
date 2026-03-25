import { query } from "@/database/db";

const DEFAULT_TIMEZONE = "Asia/Karachi";
const CACHE_TTL_MS = 60_000;

let cachedTimezone: string | null = null;
let cachedAtMs = 0;

function isValidIanaTimezone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function parseSettingValue(raw: unknown): string | null {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return null;
}

export function invalidateSystemTimezoneCache() {
  cachedTimezone = null;
  cachedAtMs = 0;
}

export function setSystemTimezoneCache(timeZone: string) {
  if (!isValidIanaTimezone(timeZone)) return;
  cachedTimezone = timeZone;
  cachedAtMs = Date.now();
}

export async function getSystemTimezone() {
  const now = Date.now();
  if (cachedTimezone && now - cachedAtMs < CACHE_TTL_MS) {
    return cachedTimezone;
  }

  const result = await query(
    `
      SELECT setting_key, setting_value
      FROM system_settings
      WHERE setting_key = ANY($1::text[])
      ORDER BY CASE setting_key
        WHEN 'system_timezone' THEN 1
        WHEN 'attendance_timezone' THEN 2
        ELSE 99
      END
      LIMIT 1
    `,
    [["system_timezone", "attendance_timezone"]]
  );

  const row = result.rows[0];
  const rawValue = parseSettingValue(row?.setting_value);
  const resolved = rawValue && isValidIanaTimezone(rawValue) ? rawValue : DEFAULT_TIMEZONE;
  cachedTimezone = resolved;
  cachedAtMs = now;
  return resolved;
}

function getTimeZoneOffsetMs(utcDate: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(utcDate);
  const map = new Map(parts.map((part) => [part.type, part.value]));
  const year = Number(map.get("year") ?? "0");
  const month = Number(map.get("month") ?? "1");
  const day = Number(map.get("day") ?? "1");
  const hour = Number(map.get("hour") ?? "0");
  const minute = Number(map.get("minute") ?? "0");
  const second = Number(map.get("second") ?? "0");

  const asUtcTs = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUtcTs - utcDate.getTime();
}

function zonedDateTimeToUtc(params: {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
  millisecond?: number;
  timeZone: string;
}) {
  const {
    year,
    month,
    day,
    hour = 0,
    minute = 0,
    second = 0,
    millisecond = 0,
    timeZone,
  } = params;

  const utcGuessTs = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  const guessDate = new Date(utcGuessTs);
  const offset1 = getTimeZoneOffsetMs(guessDate, timeZone);
  let resolvedTs = utcGuessTs - offset1;
  const offset2 = getTimeZoneOffsetMs(new Date(resolvedTs), timeZone);
  if (offset1 !== offset2) {
    resolvedTs = utcGuessTs - offset2;
  }
  return new Date(resolvedTs);
}

function getZonedParts(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(map.get("year") ?? "0"),
    month: Number(map.get("month") ?? "1"),
    day: Number(map.get("day") ?? "1"),
    hour: Number(map.get("hour") ?? "0"),
    minute: Number(map.get("minute") ?? "0"),
    second: Number(map.get("second") ?? "0"),
  };
}

function ymdFromDate(date: Date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function ymdToString(ymd: { year: number; month: number; day: number }) {
  const month = String(ymd.month).padStart(2, "0");
  const day = String(ymd.day).padStart(2, "0");
  return `${ymd.year}-${month}-${day}`;
}

function subtractCalendarDays(ymd: { year: number; month: number; day: number }, days: number) {
  const dt = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day));
  dt.setUTCDate(dt.getUTCDate() - days);
  return ymdFromDate(dt);
}

export function getCurrentYmdInTimezone(timeZone: string, now: Date = new Date()) {
  const parts = getZonedParts(now, timeZone);
  return { year: parts.year, month: parts.month, day: parts.day };
}

export function getCurrentDateInTimezone(timeZone: string, now: Date = new Date()) {
  return ymdToString(getCurrentYmdInTimezone(timeZone, now));
}

export function getUtcDayRangeForTimezone(params: {
  timeZone: string;
  date?: string;
  now?: Date;
}) {
  const { timeZone, date, now = new Date() } = params;

  const ymd = date
    ? (() => {
        const [year, month, day] = date.split("-").map((part) => Number(part));
        return { year, month, day };
      })()
    : getCurrentYmdInTimezone(timeZone, now);

  const start = zonedDateTimeToUtc({ ...ymd, timeZone, hour: 0, minute: 0, second: 0, millisecond: 0 });
  const nextDayYmd = subtractCalendarDays(ymd, -1);
  const end = zonedDateTimeToUtc({
    ...nextDayYmd,
    timeZone,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  return {
    timeZone,
    localDate: ymdToString(ymd),
    startUtcIso: start.toISOString(),
    endUtcIso: end.toISOString(),
  };
}

export function getUtcRollingDayRangeForTimezone(params: {
  timeZone: string;
  days: number;
  now?: Date;
}) {
  const { timeZone, days, now = new Date() } = params;
  const safeDays = Number.isFinite(days) ? Math.max(1, Math.floor(days)) : 1;
  const todayYmd = getCurrentYmdInTimezone(timeZone, now);
  const startYmd = subtractCalendarDays(todayYmd, safeDays - 1);

  const start = zonedDateTimeToUtc({ ...startYmd, timeZone, hour: 0, minute: 0, second: 0, millisecond: 0 });
  const end = zonedDateTimeToUtc({
    ...subtractCalendarDays(todayYmd, -1),
    timeZone,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  return {
    timeZone,
    startUtcIso: start.toISOString(),
    endUtcIso: end.toISOString(),
    currentLocalDate: ymdToString(todayYmd),
  };
}

export function getUtcMonthRangeForTimezone(params: {
  timeZone: string;
  month?: string;
  now?: Date;
}) {
  const { timeZone, month, now = new Date() } = params;
  const current = getCurrentYmdInTimezone(timeZone, now);
  const target = month
    ? (() => {
        const [year, mm] = month.split("-").map((part) => Number(part));
        return { year, month: mm };
      })()
    : { year: current.year, month: current.month };

  const nextMonth = target.month === 12 ? { year: target.year + 1, month: 1 } : { year: target.year, month: target.month + 1 };

  const start = zonedDateTimeToUtc({
    year: target.year,
    month: target.month,
    day: 1,
    timeZone,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  const end = zonedDateTimeToUtc({
    year: nextMonth.year,
    month: nextMonth.month,
    day: 1,
    timeZone,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  return {
    timeZone,
    month: `${target.year}-${String(target.month).padStart(2, "0")}`,
    startUtcIso: start.toISOString(),
    endUtcIso: end.toISOString(),
  };
}

export function getReceiptDateStamp(now: Date, timeZone: string) {
  const ymd = getCurrentYmdInTimezone(timeZone, now);
  return `${ymd.year}${String(ymd.month).padStart(2, "0")}${String(ymd.day).padStart(2, "0")}`;
}

function normalizeDbTimestampInput(value: unknown) {
  if (value == null) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    // `timestamp without time zone` values can be returned by pg as Date objects
    // interpreted in local process timezone. Reinterpret wall-clock fields as UTC.
    const utcNaive = new Date(
      Date.UTC(
        value.getFullYear(),
        value.getMonth(),
        value.getDate(),
        value.getHours(),
        value.getMinutes(),
        value.getSeconds(),
        value.getMilliseconds()
      )
    );
    return Number.isNaN(utcNaive.getTime()) ? null : utcNaive.toISOString();
  }

  const raw = typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let normalized = trimmed.replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    normalized = `${normalized}T00:00:00`;
  }

  const hasTimezone = /(Z|z|[+-]\d{2}:?\d{2})$/.test(normalized);
  return hasTimezone ? normalized : `${normalized}Z`;
}

export function parseDbUtcNaiveTimestamp(value: unknown) {
  if (!value) return null;
  const normalized = normalizeDbTimestampInput(value);
  if (!normalized) return null;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeDbUtcNaiveTimestampToIso(value: unknown) {
  const parsed = parseDbUtcNaiveTimestamp(value);
  return parsed ? parsed.toISOString() : null;
}

export { DEFAULT_TIMEZONE, isValidIanaTimezone };
