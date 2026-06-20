"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { formatDateTimeInTimezone, getTimezoneNowDateInput } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

type Staff = {
  account_type?: "staff" | "doctor";
  staff_id: number;
  name: string;
  user_code: string;
  role?: string;
  employment_status?: string;
  department?: string | null;
};
type LeaveType = { leave_type_id: number; leave_code: string; leave_name: string; is_paid: boolean };
type LeaveRow = {
  leave_request_id: number;
  account_type: "staff" | "doctor";
  person_id: number;
  staff_id: number;
  doctor_id?: number | null;
  user_code?: string | null;
  staff_name: string;
  department?: string | null;
  leave_name: string;
  from_date: string;
  to_date: string;
  request_status: string;
  requested_at: string;
  reason?: string | null;
};

export default function LeavePage() {
  const systemTimezone = useSystemTimezone();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const today = getTimezoneNowDateInput(systemTimezone);
  const [form, setForm] = useState({
    staff_id: "",
    account_type: "staff" as "staff" | "doctor",
    leave_type_id: "",
    from_date: today,
    to_date: today,
    reason: "",
    is_half_day: false,
  });

  const loadStaff = async () => {
    const res = await fetch("/api/admin/staff/v2/directory", { credentials: "include" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load staff list");
    const rows = (Array.isArray(data) ? data : []).filter((row: any) =>
      String(row?.employment_status ?? "active").toLowerCase() === "active"
    );
    setStaff(rows);
  };

  const loadTypes = async () => {
    const res = await fetch("/api/admin/staff/v2/leave/types", { credentials: "include" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load leave types");
    setTypes(Array.isArray(data) ? data : []);
  };

  const loadRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/staff/v2/leave", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load leave requests");
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setRows([]);
      setError(e?.message || "Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([loadStaff(), loadTypes(), loadRequests()]).catch((e: any) =>
      setError(e?.message || "Failed to initialize leave page")
    );
  }, []);

  const createRequest = async () => {
    setSaving(true);
    setError("");
    try {
      const personId = Number(form.staff_id);
      if (!personId || !form.leave_type_id) {
        throw new Error("Select employee and leave type.");
      }
      const payload = {
        account_type: form.account_type,
        person_id: personId,
        leave_type_id: Number(form.leave_type_id),
        from_date: form.from_date,
        to_date: form.to_date,
        is_half_day: form.is_half_day,
        reason: form.reason || null,
      };
      const res = await fetch("/api/admin/staff/v2/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create leave request");
      setForm({
        staff_id: "",
        account_type: "staff",
        leave_type_id: "",
        from_date: today,
        to_date: today,
        reason: "",
        is_half_day: false,
      });
      await loadRequests();
    } catch (e: any) {
      setError(e?.message || "Failed to create leave request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Leave Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Create leave requests and track approval status.</p>
      </div>

      {error ? <Card className="border border-destructive/20 bg-destructive/10 p-4 rounded-lg"><p className="text-sm font-medium text-destructive">{error}</p></Card> : null}

      <Card className="rounded-lg border border-border p-4 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">New Leave Request</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select
            className="h-10 rounded-md border border-input px-3 text-sm"
            value={form.staff_id ? `${form.account_type}:${form.staff_id}` : ""}
            onChange={(e) => {
              const [nextAccountType, nextPersonId] = e.target.value.split(":");
              setForm((p) => ({
                ...p,
                account_type: nextAccountType === "doctor" ? "doctor" : "staff",
                staff_id: nextPersonId || "",
              }));
            }}
          >
            <option value="">Select Staff</option>
            {staff.map((s) => (
              <option
                key={`${s.account_type ?? "staff"}:${s.staff_id}`}
                value={`${s.account_type ?? "staff"}:${s.staff_id}`}
              >
                {s.name} ({s.user_code}) - {s.account_type === "doctor" ? "Doctor" : (s.role || "Staff")}
              </option>
            ))}
          </select>
          <select className="h-10 rounded-md border border-input px-3 text-sm" value={form.leave_type_id} onChange={(e) => setForm((p) => ({ ...p, leave_type_id: e.target.value }))}>
            <option value="">Select Leave Type</option>
            {types.map((t) => <option key={t.leave_type_id} value={t.leave_type_id}>{t.leave_name} ({t.leave_code})</option>)}
          </select>
          <label className="text-xs font-medium text-muted-foreground flex items-center px-3 border border-input rounded-md"><input className="mr-2" type="checkbox" checked={form.is_half_day} onChange={(e) => setForm((p) => ({ ...p, is_half_day: e.target.checked }))} />Half-day</label>
          <input type="date" className="h-10 rounded-md border border-input px-3 text-sm" value={form.from_date} onChange={(e) => setForm((p) => ({ ...p, from_date: e.target.value }))} />
          <input type="date" className="h-10 rounded-md border border-input px-3 text-sm" value={form.to_date} onChange={(e) => setForm((p) => ({ ...p, to_date: e.target.value }))} />
          <input className="h-10 rounded-md border border-input px-3 text-sm" placeholder="Reason" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
        </div>
        <Button disabled={saving} onClick={createRequest} className="h-10 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4">Submit Request</Button>
      </Card>

      <Card className="rounded-lg border border-border p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="bg-muted">
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Requested At</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Staff</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Code</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Department</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Leave Type</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">From</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">To</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-3 py-8 text-sm text-muted-foreground font-medium">Loading leave requests…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-8 text-sm text-muted-foreground font-medium">No leave requests found.</td></tr>
              ) : rows.map((r) => (
                <tr key={`${r.account_type}:${r.person_id}:${r.leave_request_id}`} className="border-t border-border">
                  <td className="px-3 py-2 text-xs font-medium text-foreground font-mono tabular-nums">{formatDateTimeInTimezone(r.requested_at, systemTimezone)}</td>
                  <td className="px-3 py-2 text-xs font-medium text-foreground">{r.staff_name}</td>
                  <td className="px-3 py-2 text-xs font-medium text-foreground font-mono tabular-nums">{r.user_code || "-"}</td>
                  <td className="px-3 py-2 text-xs font-medium text-foreground">{r.department || "-"}</td>
                  <td className="px-3 py-2 text-xs font-medium text-foreground">{r.leave_name}</td>
                  <td className="px-3 py-2 text-xs font-medium text-foreground font-mono tabular-nums">{r.from_date}</td>
                  <td className="px-3 py-2 text-xs font-medium text-foreground font-mono tabular-nums">{r.to_date}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide ${
                      r.request_status === "approved" ? "bg-success/10 text-success" :
                      r.request_status === "rejected" ? "bg-destructive/10 text-destructive" :
                      "bg-warning/15 text-warning-foreground"
                    }`}>
                      {r.request_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
