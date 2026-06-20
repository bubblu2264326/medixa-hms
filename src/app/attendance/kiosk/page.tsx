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
    <main className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto w-full max-w-3xl rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Fingerprint className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Attendance Kiosk</h1>
            <p className="text-sm font-medium text-muted-foreground">Punch attendance for staff and doctors.</p>
          </div>
        </div>

        <form onSubmit={handlePunch} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Device Key</span>
              <div className="flex items-center gap-2 rounded-md border border-input bg-muted px-3 py-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter device key"
                  className="w-full bg-transparent text-sm font-medium text-foreground outline-none"
                />
              </div>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Device ID</span>
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm font-medium text-foreground outline-none"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Employee Code</span>
              <div className="flex items-center gap-2 rounded-md border border-input bg-muted px-3 py-2">
                <UserRound className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value.toUpperCase())}
                  placeholder="e.g. STF001 / DOC001"
                  className="w-full bg-transparent text-sm font-semibold text-foreground uppercase outline-none"
                />
              </div>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Punch Type</span>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as PunchEvent)}
                className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm font-semibold text-foreground outline-none"
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
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold uppercase tracking-wide text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {eventType === "check_out" ? <LogOut className="mr-2 h-4 w-4" /> : <LogIn className="mr-2 h-4 w-4" />}
            {submitting ? "Submitting..." : "Mark Attendance"}
          </button>
        </form>

        <div className="mt-6">
          {result?.success ? (
            <div className="rounded-lg border border-success/30 bg-success/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <p className="text-sm font-semibold uppercase tracking-wide">Attendance Marked</p>
              </div>
              <p className="text-sm font-medium text-foreground">
                {result.employee?.name} ({result.employee?.user_code})
              </p>
              <p className="mt-1 text-sm font-medium text-muted-foreground">{result.outcome?.message}</p>
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                Status: {result.outcome?.status} | Late: {result.outcome?.late_minutes ?? 0} min | Early Leave: {result.outcome?.early_leave_minutes ?? 0} min | Overtime: {result.outcome?.overtime_minutes ?? 0} min
              </p>
            </div>
          ) : null}

          {result?.success === false ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <div className="mb-1 flex items-center gap-2 text-destructive">
                <ShieldAlert className="h-5 w-5" />
                <p className="text-sm font-semibold uppercase tracking-wide">Unable To Mark</p>
              </div>
              <p className="text-sm font-medium text-destructive">{result.error}</p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
