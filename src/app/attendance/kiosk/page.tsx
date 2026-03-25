"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, Fingerprint, KeyRound, LogIn, LogOut, ShieldAlert, UserRound } from "lucide-react";

type PunchEvent = "auto" | "check_in" | "check_out";

type KioskResult = {
  success: boolean;
  employee?: {
    staff_id: number;
    user_code: string;
    name: string;
  };
  punch?: {
    event: "check_in" | "check_out";
    at: string | null;
    source: string;
  };
  outcome?: {
    status: string;
    message: string;
    late_minutes: number;
    overtime_minutes: number;
    early_leave_minutes: number;
    unscheduled: boolean;
  };
  error?: string;
};

export default function AttendanceKioskPage() {
  const [apiKey, setApiKey] = useState("");
  const [deviceId, setDeviceId] = useState("KIOSK-1");
  const [userCode, setUserCode] = useState("");
  const [eventType, setEventType] = useState<PunchEvent>("auto");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<KioskResult | null>(null);

  const canSubmit = useMemo(() => apiKey.trim().length > 0 && userCode.trim().length > 0 && !submitting, [apiKey, submitting, userCode]);

  async function handlePunch(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/integrations/attendance/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-attendance-device-key": apiKey.trim(),
        },
        body: JSON.stringify({
          user_code: userCode.trim().toUpperCase(),
          event: eventType,
          device_id: deviceId.trim() || "KIOSK-1",
        }),
      });

      const data = (await res.json()) as KioskResult;
      if (!res.ok) {
        setResult({ success: false, error: data?.error || "Failed to mark attendance" });
        return;
      }

      setResult(data);
      setUserCode("");
    } catch {
      setResult({ success: false, error: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-white">
            <Fingerprint className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-800">Attendance Kiosk</h1>
            <p className="text-sm font-semibold text-slate-500">Punch attendance for staff and doctors.</p>
          </div>
        </div>

        <form onSubmit={handlePunch} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Device Key</span>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <KeyRound className="h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter device key"
                  className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
                />
              </div>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Device ID</span>
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Employee Code</span>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <UserRound className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value.toUpperCase())}
                  placeholder="e.g. STF001 / DOC001"
                  className="w-full bg-transparent text-sm font-semibold text-slate-700 uppercase outline-none"
                />
              </div>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Punch Type</span>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as PunchEvent)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none"
              >
                <option value="auto">Auto (check-in/check-out)</option>
                <option value="check_in">Check-in</option>
                <option value="check_out">Check-out</option>
              </select>
            </label>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-6 text-sm font-black uppercase tracking-wider text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {eventType === "check_out" ? <LogOut className="mr-2 h-4 w-4" /> : <LogIn className="mr-2 h-4 w-4" />}
            {submitting ? "Submitting..." : "Mark Attendance"}
          </button>
        </form>

        <div className="mt-6">
          {result?.success ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="h-5 w-5" />
                <p className="text-sm font-black uppercase tracking-wide">Attendance Marked</p>
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {result.employee?.name} ({result.employee?.user_code})
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-600">{result.outcome?.message}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                Status: {result.outcome?.status} | Late: {result.outcome?.late_minutes ?? 0} min | Early Leave: {result.outcome?.early_leave_minutes ?? 0} min | Overtime: {result.outcome?.overtime_minutes ?? 0} min
              </p>
            </div>
          ) : null}

          {result?.success === false ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <div className="mb-1 flex items-center gap-2 text-rose-700">
                <ShieldAlert className="h-5 w-5" />
                <p className="text-sm font-black uppercase tracking-wide">Unable To Mark</p>
              </div>
              <p className="text-sm font-semibold text-rose-700">{result.error}</p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
