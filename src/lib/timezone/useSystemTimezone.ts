"use client";

import { useEffect, useState } from "react";
import { DEFAULT_TIMEZONE, isValidIanaTimezone } from "@/src/lib/timezone/client";

export function useSystemTimezone() {
  const [timeZone, setTimeZone] = useState<string>(DEFAULT_TIMEZONE);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/public/system-timezone", { credentials: "include" });
        const payload = await res.json();
        if (!active) return;
        const next = String(payload?.time_zone || "").trim();
        if (res.ok && isValidIanaTimezone(next)) {
          setTimeZone(next);
        }
      } catch {
        // Keep default timezone on network errors.
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return timeZone;
}
