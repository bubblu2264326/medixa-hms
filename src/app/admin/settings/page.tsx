"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Clock3, Save, Settings2, TimerReset, TimerOff, Timer, Globe2 } from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import {
  DEFAULT_TIMEZONE,
  formatTimeInTimezone,
  getSupportedTimezones,
  isValidIanaTimezone,
} from "@/src/lib/timezone/client";

type AttendancePolicy = {
  grace_minutes: number;
  half_day_minutes: number;
  overtime_minutes: number;
  early_leave_minutes: number;
};

const DEFAULT_POLICY: AttendancePolicy = {
  grace_minutes: 15,
  half_day_minutes: 240,
  overtime_minutes: 30,
  early_leave_minutes: 30,
};

export default function SettingsPage() {
  const [policy, setPolicy] = useState<AttendancePolicy>(DEFAULT_POLICY);
  const [initialPolicy, setInitialPolicy] = useState<AttendancePolicy>(DEFAULT_POLICY);
  const [systemTimezone, setSystemTimezone] = useState<string>(DEFAULT_TIMEZONE);
  const [initialTimezone, setInitialTimezone] = useState<string>(DEFAULT_TIMEZONE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const dirty = useMemo(
    () => JSON.stringify(policy) !== JSON.stringify(initialPolicy) || systemTimezone !== initialTimezone,
    [initialPolicy, initialTimezone, policy, systemTimezone]
  );
  const timezones = useMemo(() => getSupportedTimezones(), []);

  async function fetchSettings() {
    setLoading(true);
    setError(null);
    try {
      const [policyRes, settingsRes] = await Promise.all([
        fetch("/api/admin/settings/attendance-policy"),
        fetch("/api/admin/settings"),
      ]);
      const policyData = await policyRes.json();
      const settingsData = await settingsRes.json();

      if (!policyRes.ok) {
        throw new Error(policyData?.error || "Failed to load attendance policy");
      }
      if (!settingsRes.ok) {
        throw new Error(settingsData?.error || "Failed to load system settings");
      }

      const nextPolicy: AttendancePolicy = {
        grace_minutes: Number(policyData?.policy?.grace_minutes ?? DEFAULT_POLICY.grace_minutes),
        half_day_minutes: Number(policyData?.policy?.half_day_minutes ?? DEFAULT_POLICY.half_day_minutes),
        overtime_minutes: Number(policyData?.policy?.overtime_minutes ?? DEFAULT_POLICY.overtime_minutes),
        early_leave_minutes: Number(policyData?.policy?.early_leave_minutes ?? DEFAULT_POLICY.early_leave_minutes),
      };

      const timezoneSetting = Array.isArray(settingsData)
        ? settingsData.find((item) => item?.setting_key === "system_timezone")?.setting_value
        : null;
      const nextTimezone =
        typeof timezoneSetting === "string" && isValidIanaTimezone(timezoneSetting)
          ? timezoneSetting
          : DEFAULT_TIMEZONE;

      setPolicy(nextPolicy);
      setInitialPolicy(nextPolicy);
      setSystemTimezone(nextTimezone);
      setInitialTimezone(nextTimezone);
    } catch (e: any) {
      setError(String(e?.message || "Unable to load settings"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  async function saveAll() {
    if (!isValidIanaTimezone(systemTimezone)) {
      setError("Please select a valid IANA timezone (e.g. Asia/Karachi).");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const [policyRes, timezoneRes] = await Promise.all([
        fetch("/api/admin/settings/attendance-policy", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(policy),
        }),
        fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            settings: [{ key: "system_timezone", value: systemTimezone }],
          }),
        }),
      ]);

      const policyData = await policyRes.json();
      const timezoneData = await timezoneRes.json();

      if (!policyRes.ok) {
        throw new Error(policyData?.error || "Failed to save attendance policy");
      }
      if (!timezoneRes.ok) {
        throw new Error(timezoneData?.error || "Failed to save system timezone");
      }

      setInitialPolicy(policy);
      setInitialTimezone(systemTimezone);
      setSavedAt(formatTimeInTimezone(new Date(), systemTimezone));
    } catch (e: any) {
      setError(String(e?.message || "Unable to save settings"));
    } finally {
      setSaving(false);
    }
  }

  const numberField = (
    label: string,
    icon: React.ReactNode,
    value: number,
    onChange: (next: number) => void,
    helper: string
  ) => (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <span className="text-emerald-700">{icon}</span>
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Number(e.target.value || 0))}
          className="w-full bg-transparent text-sm font-semibold text-slate-700 focus:outline-none"
        />
        <span className="text-xs font-semibold text-slate-400">min</span>
      </div>
      <p className="text-xs text-slate-400">{helper}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">System Settings</h1>
          <p className="text-sm text-slate-500">Global timezone and attendance policy controls for whole HMS.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-2xl" onClick={fetchSettings} disabled={loading || saving}>
            <Settings2 className="mr-2 h-4 w-4" />
            Reload
          </Button>
          <Button
            className="rounded-2xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-60"
            onClick={saveAll}
            disabled={loading || saving}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>
      ) : null}

      <Card className="rounded-[2rem] border border-slate-100 bg-slate-50/60 p-6 shadow-sm space-y-6">
        {loading ? (
          <div className="py-16 text-center text-sm font-semibold text-slate-400">Loading settings...</div>
        ) : (
          <>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm font-semibold text-emerald-800">
              Scope: <span className="font-black">Global clinic</span>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Timezone</label>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <Globe2 className="h-4 w-4 text-emerald-700" />
                <input
                  list="system-timezone-options"
                  value={systemTimezone}
                  onChange={(e) => setSystemTimezone(e.target.value.trim())}
                  placeholder="Search timezone e.g. Asia/Karachi"
                  className="w-full bg-transparent text-sm font-semibold text-slate-700 focus:outline-none"
                />
              </div>
              <datalist id="system-timezone-options">
                {timezones.map((tz) => (
                  <option key={tz} value={tz} />
                ))}
              </datalist>
              <p className="text-xs text-slate-400">All business-day boundaries and date-time displays follow this timezone.</p>
            </div>

            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">Attendance Policy</h2>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {numberField(
                  "Grace Minutes",
                  <Clock3 className="h-4 w-4" />,
                  policy.grace_minutes,
                  (next) => setPolicy((prev) => ({ ...prev, grace_minutes: next })),
                  "Minutes after shift start before late status begins."
                )}
                {numberField(
                  "Half Day Minutes",
                  <TimerReset className="h-4 w-4" />,
                  policy.half_day_minutes,
                  (next) => setPolicy((prev) => ({ ...prev, half_day_minutes: next })),
                  "If worked minutes fall below this threshold, mark as half day."
                )}
                {numberField(
                  "Overtime Minutes",
                  <Timer className="h-4 w-4" />,
                  policy.overtime_minutes,
                  (next) => setPolicy((prev) => ({ ...prev, overtime_minutes: next })),
                  "Minimum overtime minutes required to mark overtime."
                )}
                {numberField(
                  "Early Leave Minutes",
                  <TimerOff className="h-4 w-4" />,
                  policy.early_leave_minutes,
                  (next) => setPolicy((prev) => ({ ...prev, early_leave_minutes: next })),
                  "Minimum early exit minutes required to mark early leave."
                )}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-500">
              <span>Supabase system settings are the single source of truth.</span>
              <span>{savedAt ? `Last saved at ${savedAt}` : dirty ? "Unsaved changes" : "No changes"}</span>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
