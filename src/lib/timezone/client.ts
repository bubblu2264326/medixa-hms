export const DEFAULT_TIMEZONE = "Asia/Karachi";

export function isValidIanaTimezone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function getSupportedTimezones() {
  if (typeof Intl !== "undefined" && typeof (Intl as any).supportedValuesOf === "function") {
    return (Intl as any).supportedValuesOf("timeZone") as string[];
  }
  return [DEFAULT_TIMEZONE, "UTC", "Asia/Dubai", "Europe/London", "America/New_York", "America/Los_Angeles"];
}

export function formatDateTimeInTimezone(
  value: Date | string | number | null | undefined,
  timeZone: string,
  options?: Intl.DateTimeFormatOptions
) {
  if (value == null) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const safeTimeZone = isValidIanaTimezone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: options?.second ? "2-digit" : undefined,
    hour12: true,
    timeZone: safeTimeZone,
    ...options,
  }).format(date);
}

export function formatDateInTimezone(
  value: Date | string | number | null | undefined,
  timeZone: string,
  options?: Intl.DateTimeFormatOptions
) {
  if (value == null) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const safeTimeZone = isValidIanaTimezone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: safeTimeZone,
    ...options,
  }).format(date);
}

export function formatTimeInTimezone(
  value: Date | string | number | null | undefined,
  timeZone: string
) {
  return formatDateTimeInTimezone(value, timeZone, {
    hour: "2-digit",
    minute: "2-digit",
    day: undefined,
    month: undefined,
    year: undefined,
    hour12: true,
  });
}

export function getTimezoneNowDateInput(timeZone: string, now: Date = new Date()) {
  const safeTimeZone = isValidIanaTimezone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const map = new Map(parts.map((part) => [part.type, part.value]));
  return `${map.get("year")}-${map.get("month")}-${map.get("day")}`;
}

export function getTimezoneNowMonthInput(timeZone: string, now: Date = new Date()) {
  return getTimezoneNowDateInput(timeZone, now).slice(0, 7);
}

export function getDateInputInTimezone(
  value: Date | string | number | null | undefined,
  timeZone: string
) {
  if (value == null) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const safeTimeZone = isValidIanaTimezone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));
  return `${map.get("year")}-${map.get("month")}-${map.get("day")}`;
}
