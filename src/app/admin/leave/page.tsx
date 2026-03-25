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
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Leave Management</h1>
        <p className="text-sm text-slate-500 font-semibold mt-1">Create leave requests and track approval status.</p>
      </div>

      {error ? <Card className="border border-red-100 bg-red-50 p-4 rounded-2xl"><p className="text-sm font-semibold text-red-700">{error}</p></Card> : null}

      <Card className="rounded-2xl border border-slate-100 p-4 space-y-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">New Leave Request</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
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
          <select className="h-10 rounded-xl border border-slate-200 px-3 text-sm" value={form.leave_type_id} onChange={(e) => setForm((p) => ({ ...p, leave_type_id: e.target.value }))}>
            <option value="">Select Leave Type</option>
            {types.map((t) => <option key={t.leave_type_id} value={t.leave_type_id}>{t.leave_name} ({t.leave_code})</option>)}
          </select>
          <label className="text-xs font-semibold text-slate-600 flex items-center px-3 border border-slate-200 rounded-xl"><input className="mr-2" type="checkbox" checked={form.is_half_day} onChange={(e) => setForm((p) => ({ ...p, is_half_day: e.target.checked }))} />Half-day</label>
          <input type="date" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" value={form.from_date} onChange={(e) => setForm((p) => ({ ...p, from_date: e.target.value }))} />
          <input type="date" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" value={form.to_date} onChange={(e) => setForm((p) => ({ ...p, to_date: e.target.value }))} />
          <input className="h-10 rounded-xl border border-slate-200 px-3 text-sm" placeholder="Reason" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
        </div>
        <Button disabled={saving} onClick={createRequest} className="h-10 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-widest px-4">Submit Request</Button>
      </Card>

      <Card className="rounded-3xl border border-slate-100 p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/70">
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Requested At</th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Staff</th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Code</th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Department</th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Leave Type</th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">From</th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">To</th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-3 py-8 text-sm text-slate-500 font-semibold">Loading leave requests…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-8 text-sm text-slate-500 font-semibold">No leave requests found.</td></tr>
              ) : rows.map((r) => (
                <tr key={`${r.account_type}:${r.person_id}:${r.leave_request_id}`} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-xs font-semibold text-slate-700">{formatDateTimeInTimezone(r.requested_at, systemTimezone)}</td>
                  <td className="px-3 py-2 text-xs font-semibold text-slate-700">{r.staff_name}</td>
                  <td className="px-3 py-2 text-xs font-semibold text-slate-700">{r.user_code || "-"}</td>
                  <td className="px-3 py-2 text-xs font-semibold text-slate-700">{r.department || "-"}</td>
                  <td className="px-3 py-2 text-xs font-semibold text-slate-700">{r.leave_name}</td>
                  <td className="px-3 py-2 text-xs font-semibold text-slate-700">{r.from_date}</td>
                  <td className="px-3 py-2 text-xs font-semibold text-slate-700">{r.to_date}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                      r.request_status === "approved" ? "bg-emerald-50 text-emerald-700" :
                      r.request_status === "rejected" ? "bg-rose-50 text-rose-700" :
                      "bg-amber-50 text-amber-700"
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
