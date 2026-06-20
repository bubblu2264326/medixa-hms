"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";

type Staff = {
  account_type?: "staff" | "doctor";
  staff_id: number;
  name: string;
  user_code: string;
  role?: string;
  employment_status?: string;
  department?: string | null;
};

type ShiftTemplate = {
  shift_template_id: number;
  shift_code: string;
  shift_name: string;
  start_time: string;
  end_time: string;
};

type RosterRow = {
  roster_id: number;
  roster_date: string;
  account_type: "staff" | "doctor";
  person_id: number;
  staff_id: number;
  doctor_id?: number | null;
  user_code?: string | null;
  staff_name: string;
  role: string;
  department?: string | null;
  shift_code: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  on_call: boolean;
  standby: boolean;
};

const WEEK_DAYS: Array<{ label: string; value: number }> = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

type DurationOption = "1d" | "7d" | "1m" | "1y" | "custom";

function parseYmd(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function toYmdUTC(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getEndDateByDuration(start: Date, duration: DurationOption) {
  const end = new Date(start.getTime());
  if (duration === "1d") return end;
  if (duration === "7d") {
    end.setUTCDate(end.getUTCDate() + 6);
    return end;
  }
  if (duration === "1m") {
    end.setUTCMonth(end.getUTCMonth() + 1);
    end.setUTCDate(end.getUTCDate() - 1);
    return end;
  }
  if (duration === "1y") {
    end.setUTCFullYear(end.getUTCFullYear() + 1);
    end.setUTCDate(end.getUTCDate() - 1);
    return end;
  }
  return end;
}

export default function RosterPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [resultMessage, setResultMessage] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const [newTemplate, setNewTemplate] = useState({
    shift_code: "",
    shift_name: "",
    start_time: "09:00",
    end_time: "17:00",
    department: "",
  });

  const [newAssign, setNewAssign] = useState({
    staff_id: "",
    account_type: "staff" as "staff" | "doctor",
    shift_template_id: "",
    fromDate: today,
    toDate: today,
    recurringDays: [1, 2, 3, 4, 5] as number[],
    department: "",
    ward: "",
    unit: "",
    on_call: false,
    standby: false,
  });
  const [durationOption, setDurationOption] = useState<DurationOption>("custom");

  const selectedWeekDaysLabel = useMemo(() => {
    if (newAssign.recurringDays.length === 7) return "Every day";
    if (newAssign.recurringDays.length === 0) return "No days selected";
    return WEEK_DAYS.filter((d) => newAssign.recurringDays.includes(d.value))
      .map((d) => d.label)
      .join(", ");
  }, [newAssign.recurringDays]);

  const loadStaff = async () => {
    const res = await fetch("/api/admin/staff/v2/directory", { credentials: "include" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load staff");
    const activeRows = (Array.isArray(data) ? data : []).filter(
      (row: any) => String(row?.employment_status ?? "active").toLowerCase() === "active"
    );
    setStaff(activeRows);
  };

  const loadTemplates = async () => {
    const res = await fetch("/api/admin/staff/v2/roster/templates", { credentials: "include" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load shift templates");
    setTemplates(Array.isArray(data) ? data : []);
  };

  const loadRoster = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ from: fromDate, to: toDate });
      const res = await fetch(`/api/admin/staff/v2/roster?${params.toString()}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load roster");
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load roster");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    Promise.all([loadStaff(), loadTemplates(), loadRoster()]).catch((e: any) =>
      setError(e?.message || "Failed to initialize roster page")
    );
  }, [loadRoster]);

  const createTemplate = async () => {
    setSaving(true);
    setError("");
    setResultMessage("");
    try {
      const res = await fetch("/api/admin/staff/v2/roster/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newTemplate),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create shift template");
      setNewTemplate({ shift_code: "", shift_name: "", start_time: "09:00", end_time: "17:00", department: "" });
      setIsTemplateModalOpen(false);
      setResultMessage("Shift template created successfully.");
      await loadTemplates();
    } catch (e: any) {
      setError(e?.message || "Failed to create shift template");
    } finally {
      setSaving(false);
    }
  };

  const assignShift = async () => {
    setSaving(true);
    setError("");
    setResultMessage("");
    try {
      const selectedPersonId = Number(newAssign.staff_id);
      if (!selectedPersonId || !newAssign.shift_template_id) {
        throw new Error("Select employee and shift template before assigning.");
      }
      if (!newAssign.fromDate || !newAssign.toDate) {
        throw new Error("Select both from and to dates.");
      }
      if (newAssign.recurringDays.length === 0) {
        throw new Error("Select at least one day of week.");
      }

      const start = parseYmd(newAssign.fromDate);
      const resolvedEndDate = durationOption === "custom"
        ? newAssign.toDate
        : (start ? toYmdUTC(getEndDateByDuration(start, durationOption)) : "");
      const end = parseYmd(resolvedEndDate);
      if (!start || !end || !resolvedEndDate) {
        throw new Error("Invalid date range.");
      }
      if (start.getTime() > end.getTime()) {
        throw new Error("To Date cannot be before From Date.");
      }

      const daySpan = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      if (daySpan > 366) {
        throw new Error("Date range cannot exceed 1 year.");
      }

      const recurringSet = new Set(newAssign.recurringDays);
      const assignments: Array<Record<string, unknown>> = [];

      for (
        let cursor = new Date(start.getTime());
        cursor.getTime() <= end.getTime();
        cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
      ) {
        const weekDay = cursor.getUTCDay();
        if (!recurringSet.has(weekDay)) continue;

        assignments.push({
          account_type: newAssign.account_type,
          person_id: selectedPersonId,
          shift_template_id: Number(newAssign.shift_template_id),
          roster_date: toYmdUTC(cursor),
          department: newAssign.department || null,
          ward: newAssign.ward || null,
          unit: newAssign.unit || null,
          on_call: newAssign.on_call,
          standby: newAssign.standby,
        });
      }

      if (assignments.length === 0) {
        throw new Error("No dates matched the selected day(s) in this range.");
      }

      const res = await fetch("/api/admin/staff/v2/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ assignments }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to assign shift");
      const affectedCount = Number(data?.count);
      const resolvedCount = Number.isFinite(affectedCount) && affectedCount > 0 ? affectedCount : assignments.length;
      const firstDate = typeof data?.first_date === "string" ? data.first_date : newAssign.fromDate;
      const lastDate = typeof data?.last_date === "string" ? data.last_date : resolvedEndDate;

      setNewAssign((prev) => ({
        ...prev,
        shift_template_id: "",
        staff_id: "",
      }));
      setResultMessage(`Assigned ${resolvedCount} shift day(s) successfully (${firstDate} to ${lastDate}).`);
      await loadRoster();
    } catch (e: any) {
      setError(e?.message || "Failed to assign shift");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Shift Roster</h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">Shift templates and daily assignments by staff.</p>
        </div>
        <Button
          onClick={() => setIsTemplateModalOpen(true)}
          className="h-10 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4"
        >
          <Plus className="w-4 h-4 mr-2" /> Create Template
        </Button>
      </div>

      {error ? (
        <Card className="border border-destructive/20 bg-destructive/10 p-4 rounded-lg">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </Card>
      ) : null}

      {resultMessage ? (
        <Card className="border border-success/20 bg-success/10 p-4 rounded-lg">
          <p className="text-sm font-medium text-success">{resultMessage}</p>
        </Card>
      ) : null}

      <Card className="rounded-lg border border-border p-4 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assign Shift</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          <select
            className="h-10 rounded-md border border-input px-3 text-sm"
            value={newAssign.staff_id ? `${newAssign.account_type}:${newAssign.staff_id}` : ""}
            onChange={(e) => {
              const [nextAccountType, nextPersonId] = e.target.value.split(":");
              const selected = staff.find((row) => `${row.account_type ?? "staff"}:${row.staff_id}` === e.target.value);
              setNewAssign((p) => ({
                ...p,
                account_type: nextAccountType === "doctor" ? "doctor" : "staff",
                staff_id: nextPersonId || "",
                department: selected?.department ?? p.department,
              }));
            }}
          >
            <option value="">Select Staff</option>
            {staff.map((s) => (
              <option key={`${s.account_type ?? "staff"}:${s.staff_id}`} value={`${s.account_type ?? "staff"}:${s.staff_id}`}>
                {s.name} ({s.user_code}) - {s.account_type === "doctor" ? "Doctor" : s.role || "Staff"}
              </option>
            ))}
          </select>

          <select
            className="h-10 rounded-md border border-input px-3 text-sm"
            value={newAssign.shift_template_id}
            onChange={(e) => setNewAssign((p) => ({ ...p, shift_template_id: e.target.value }))}
          >
            <option value="">Select Template</option>
            {templates.map((t) => (
              <option key={t.shift_template_id} value={t.shift_template_id}>
                {t.shift_name} ({t.shift_code})
              </option>
            ))}
          </select>

          <input
            type="date"
            className="h-10 rounded-md border border-input px-3 text-sm"
            value={newAssign.fromDate}
            onChange={(e) => {
              const nextFrom = e.target.value;
              setNewAssign((p) => {
                if (durationOption === "custom") {
                  return { ...p, fromDate: nextFrom };
                }
                const parsed = parseYmd(nextFrom);
                const nextTo = parsed ? toYmdUTC(getEndDateByDuration(parsed, durationOption)) : p.toDate;
                return { ...p, fromDate: nextFrom, toDate: nextTo };
              });
            }}
          />

          <select
            className="h-10 rounded-md border border-input px-3 text-sm"
            value={durationOption}
            onChange={(e) => {
              const next = e.target.value as DurationOption;
              setDurationOption(next);
              if (next !== "custom") {
                setNewAssign((p) => {
                  const parsed = parseYmd(p.fromDate);
                  const nextTo = parsed ? toYmdUTC(getEndDateByDuration(parsed, next)) : p.toDate;
                  return { ...p, toDate: nextTo };
                });
              }
            }}
          >
            <option value="1d">1 day</option>
            <option value="7d">7 days</option>
            <option value="1m">1 month</option>
            <option value="1y">1 year</option>
            <option value="custom">Custom</option>
          </select>

          {durationOption === "custom" ? (
            <input
              type="date"
              className="h-10 rounded-md border border-input px-3 text-sm"
              value={newAssign.toDate}
              onChange={(e) => setNewAssign((p) => ({ ...p, toDate: e.target.value }))}
            />
          ) : (
            <input
              type="date"
              className="h-10 rounded-md border border-input bg-muted px-3 text-sm cursor-not-allowed"
              value={newAssign.toDate}
              readOnly
            />
          )}

          <input
            className="h-10 rounded-md border border-input px-3 text-sm xl:col-span-2"
            placeholder="Department"
            value={newAssign.department}
            onChange={(e) => setNewAssign((p) => ({ ...p, department: e.target.value }))}
          />

          <input
            className="h-10 rounded-md border border-input px-3 text-sm"
            placeholder="Ward (optional)"
            value={newAssign.ward}
            onChange={(e) => setNewAssign((p) => ({ ...p, ward: e.target.value }))}
          />

          <input
            className="h-10 rounded-md border border-input px-3 text-sm"
            placeholder="Unit (optional)"
            value={newAssign.unit}
            onChange={(e) => setNewAssign((p) => ({ ...p, unit: e.target.value }))}
          />
        </div>

        <div className="rounded-md border border-border bg-muted p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Recurring Days</p>
          <div className="flex flex-wrap gap-2">
            {WEEK_DAYS.map((day) => {
              const active = newAssign.recurringDays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() =>
                    setNewAssign((prev) => ({
                      ...prev,
                      recurringDays: active
                        ? prev.recurringDays.filter((d) => d !== day.value)
                        : [...prev.recurringDays, day.value].sort((a, b) => a - b),
                    }))
                  }
                  className={`h-8 min-w-12 rounded-md px-3 text-xs font-semibold uppercase tracking-wide border transition ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-input hover:bg-accent"
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs font-medium text-muted-foreground mt-2">Selected: {selectedWeekDaysLabel}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <label className="text-xs font-medium text-foreground">
            <input
              type="checkbox"
              checked={newAssign.on_call}
              onChange={(e) => setNewAssign((p) => ({ ...p, on_call: e.target.checked }))}
              className="mr-2"
            />
            On-call
          </label>
          <label className="text-xs font-medium text-foreground">
            <input
              type="checkbox"
              checked={newAssign.standby}
              onChange={(e) => setNewAssign((p) => ({ ...p, standby: e.target.checked }))}
              className="mr-2"
            />
            Standby
          </label>
        </div>

        <Button
          disabled={saving}
          onClick={assignShift}
          className="h-10 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4"
        >
          {saving ? "Assigning..." : "Assign Shift"}
        </Button>
      </Card>

      <Card className="rounded-lg border border-border p-5">
        <div className="flex gap-2 mb-3">
          <input
            type="date"
            className="h-10 rounded-md border border-input px-3 text-sm"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <input
            type="date"
            className="h-10 rounded-md border border-input px-3 text-sm"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="bg-muted">
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Staff</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Code</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Department</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shift</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Window</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Flags</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-sm text-muted-foreground font-medium">Loading roster...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-sm text-muted-foreground font-medium">No assignments found for selected range.</td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={`${r.account_type}:${r.person_id}:${r.roster_id}`} className="border-t border-border">
                    <td className="px-3 py-2 text-xs font-medium text-foreground font-mono tabular-nums">{r.roster_date}</td>
                    <td className="px-3 py-2 text-xs font-medium text-foreground">{r.staff_name}</td>
                    <td className="px-3 py-2 text-xs font-medium text-foreground font-mono tabular-nums">{r.user_code || "-"}</td>
                    <td className="px-3 py-2 text-xs font-medium text-foreground">{r.role}</td>
                    <td className="px-3 py-2 text-xs font-medium text-foreground">{r.department || "-"}</td>
                    <td className="px-3 py-2 text-xs font-medium text-foreground">{r.shift_name} ({r.shift_code})</td>
                    <td className="px-3 py-2 text-xs font-medium text-foreground font-mono tabular-nums">
                      {String(r.start_time).slice(0, 5)} - {String(r.end_time).slice(0, 5)}
                    </td>
                    <td className="px-3 py-2 text-xs font-medium text-foreground">
                      {r.on_call ? "On-call " : ""}
                      {r.standby ? "Standby" : ""}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {isTemplateModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsTemplateModalOpen(false);
          }}
        >
          <Card className="w-full max-w-2xl rounded-lg border border-border p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Create Shift Template</h2>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Close template modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  className="h-10 rounded-md border border-input px-3 text-sm"
                  placeholder="Shift Code"
                  value={newTemplate.shift_code}
                  onChange={(e) => setNewTemplate((p) => ({ ...p, shift_code: e.target.value.toUpperCase() }))}
                />
                <input
                  className="h-10 rounded-md border border-input px-3 text-sm"
                  placeholder="Shift Name"
                  value={newTemplate.shift_name}
                  onChange={(e) => setNewTemplate((p) => ({ ...p, shift_name: e.target.value }))}
                />
                <input
                  type="time"
                  className="h-10 rounded-md border border-input px-3 text-sm"
                  value={newTemplate.start_time}
                  onChange={(e) => setNewTemplate((p) => ({ ...p, start_time: e.target.value }))}
                />
                <input
                  type="time"
                  className="h-10 rounded-md border border-input px-3 text-sm"
                  value={newTemplate.end_time}
                  onChange={(e) => setNewTemplate((p) => ({ ...p, end_time: e.target.value }))}
                />
                <input
                  className="h-10 rounded-md border border-input px-3 text-sm md:col-span-2"
                  placeholder="Department (optional)"
                  value={newTemplate.department}
                  onChange={(e) => setNewTemplate((p) => ({ ...p, department: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border bg-muted px-5 py-3">
              <Button
                onClick={() => setIsTemplateModalOpen(false)}
                className="h-10 rounded-md bg-muted text-foreground hover:bg-accent"
              >
                Cancel
              </Button>
              <Button
                disabled={saving}
                onClick={createTemplate}
                className="h-10 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4"
              >
                {saving ? "Saving..." : "Add Template"}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
