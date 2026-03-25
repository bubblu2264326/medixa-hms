"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { formatDateInTimezone, formatDateTimeInTimezone, getTimezoneNowDateInput } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

type StaffRow = {
  account_type?: "staff" | "doctor";
  staff_id: number;
  name: string;
  user_code: string;
  role?: string | null;
};

type CredentialType = {
  credential_type_id: number;
  credential_code: string;
  credential_name: string;
};

type CredentialRow = {
  credential_id: number;
  account_type: "staff" | "doctor";
  person_id: number;
  credential_type_id: number;
  credential_name: string;
  credential_number: string;
  credential_title?: string | null;
  issued_on?: string | null;
  expires_on?: string | null;
  employee_name: string;
  user_code: string;
  role?: string | null;
  department?: string | null;
  verification_status: string;
  renewal_status: string;
  days_until_expiry?: number | null;
  reviewed_at?: string | null;
};

type CredentialSummary = {
  total: number;
  verified: number;
  in_progress: number;
  rejected: number;
  revoked: number;
  expired: number;
  expiring_soon: number;
};

export default function CredentialingPage() {
  const systemTimezone = useSystemTimezone();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [credentialTypes, setCredentialTypes] = useState<CredentialType[]>([]);
  const [items, setItems] = useState<CredentialRow[]>([]);
  const [summary, setSummary] = useState<CredentialSummary>({
    total: 0,
    verified: 0,
    in_progress: 0,
    rejected: 0,
    revoked: 0,
    expired: 0,
    expiring_soon: 0,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const today = getTimezoneNowDateInput(systemTimezone);

  const [form, setForm] = useState({
    person_key: "",
    credential_type_id: "",
    credential_number: "",
    credential_title: "",
    issued_on: today,
    expires_on: "",
    issuing_authority: "",
    issuing_country: "",
  });

  const statusBadge = (status: string) => {
    if (status === "verified") return "bg-emerald-50 text-emerald-700";
    if (status === "rejected" || status === "revoked" || status === "expired") return "bg-rose-50 text-rose-700";
    return "bg-amber-50 text-amber-700";
  };

  const loadDirectory = async () => {
    const res = await fetch("/api/admin/staff/v2/directory", { credentials: "include" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load employee directory");
    const rows = (Array.isArray(data) ? data : []).filter((row: any) => {
      const state = String(row?.employment_status ?? "active").toLowerCase();
      return state === "active" || row?.account_type === "doctor";
    });
    setStaff(rows);
  };

  const loadCredentialing = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/staff/v2/credentialing?${params.toString()}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load credentialing records");

      setItems(Array.isArray(data?.items) ? data.items : []);
      setCredentialTypes(Array.isArray(data?.credential_types) ? data.credential_types : []);
      setSummary({
        total: Number(data?.summary?.total ?? 0),
        verified: Number(data?.summary?.verified ?? 0),
        in_progress: Number(data?.summary?.in_progress ?? 0),
        rejected: Number(data?.summary?.rejected ?? 0),
        revoked: Number(data?.summary?.revoked ?? 0),
        expired: Number(data?.summary?.expired ?? 0),
        expiring_soon: Number(data?.summary?.expiring_soon ?? 0),
      });
    } catch (e: any) {
      setError(e?.message || "Failed to load credentialing records");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([loadDirectory(), loadCredentialing()]).catch((e: any) =>
      setError(e?.message || "Failed to initialize credentialing")
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadCredentialing();
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const createCredential = async () => {
    setSaving(true);
    setError("");
    try {
      const [accountType, personIdRaw] = form.person_key.split(":");
      const personId = Number(personIdRaw);
      if (!personId || !form.credential_type_id || !form.credential_number.trim()) {
        throw new Error("Select employee, credential type, and credential number.");
      }
      const res = await fetch("/api/admin/staff/v2/credentialing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          account_type: accountType === "doctor" ? "doctor" : "staff",
          person_id: personId,
          credential_type_id: Number(form.credential_type_id),
          credential_number: form.credential_number.trim(),
          credential_title: form.credential_title || null,
          issued_on: form.issued_on || null,
          expires_on: form.expires_on || null,
          issuing_authority: form.issuing_authority || null,
          issuing_country: form.issuing_country || null,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Failed to create credential");
      setForm({
        person_key: "",
        credential_type_id: "",
        credential_number: "",
        credential_title: "",
        issued_on: today,
        expires_on: "",
        issuing_authority: "",
        issuing_country: "",
      });
      await loadCredentialing();
    } catch (e: any) {
      setError(e?.message || "Failed to create credential");
    } finally {
      setSaving(false);
    }
  };

  const triggerAction = async (credentialId: number, action: string) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/staff/v2/credentialing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          credential_id: credentialId,
          action,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || `Failed to ${action} credential`);
      await loadCredentialing();
    } catch (e: any) {
      setError(e?.message || `Failed to ${action} credential`);
    } finally {
      setSaving(false);
    }
  };

  const renewCredential = async (credentialId: number, existingExpiry?: string | null) => {
    const issuedOn = window.prompt("Renewal issue date (YYYY-MM-DD)", today);
    if (!issuedOn) return;
    const proposedExpiry = window.prompt("Renewed expiry date (YYYY-MM-DD)", existingExpiry || "");
    if (!proposedExpiry) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/staff/v2/credentialing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          credential_id: credentialId,
          action: "renew",
          issued_on: issuedOn,
          expires_on: proposedExpiry,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Failed to renew credential");
      await loadCredentialing();
    } catch (e: any) {
      setError(e?.message || "Failed to renew credential");
    } finally {
      setSaving(false);
    }
  };

  const expiringItems = useMemo(
    () => items.filter((item) => typeof item.days_until_expiry === "number" && item.days_until_expiry >= 0 && item.days_until_expiry <= 30).length,
    [items]
  );

  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Credentialing</h1>
        <p className="text-sm text-slate-500 font-semibold mt-1">
          Enterprise-grade credential verification, renewal control, and compliance tracking for staff and doctors.
        </p>
      </div>

      {error ? (
        <Card className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <Card className="rounded-2xl p-3"><p className="text-[10px] font-black uppercase text-slate-400">Total</p><p className="text-xl font-black text-slate-800">{summary.total}</p></Card>
        <Card className="rounded-2xl p-3"><p className="text-[10px] font-black uppercase text-slate-400">Verified</p><p className="text-xl font-black text-emerald-700">{summary.verified}</p></Card>
        <Card className="rounded-2xl p-3"><p className="text-[10px] font-black uppercase text-slate-400">In Progress</p><p className="text-xl font-black text-amber-700">{summary.in_progress}</p></Card>
        <Card className="rounded-2xl p-3"><p className="text-[10px] font-black uppercase text-slate-400">Rejected</p><p className="text-xl font-black text-rose-700">{summary.rejected}</p></Card>
        <Card className="rounded-2xl p-3"><p className="text-[10px] font-black uppercase text-slate-400">Revoked</p><p className="text-xl font-black text-rose-700">{summary.revoked}</p></Card>
        <Card className="rounded-2xl p-3"><p className="text-[10px] font-black uppercase text-slate-400">Expired</p><p className="text-xl font-black text-rose-700">{summary.expired}</p></Card>
        <Card className="rounded-2xl p-3"><p className="text-[10px] font-black uppercase text-slate-400">Expiring Soon</p><p className="text-xl font-black text-amber-700">{summary.expiring_soon}</p></Card>
        <Card className="rounded-2xl p-3"><p className="text-[10px] font-black uppercase text-slate-400">30-Day Alerts</p><p className="text-xl font-black text-amber-700">{expiringItems}</p></Card>
      </div>

      <Card className="rounded-3xl border border-slate-100 p-5 space-y-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">New Credential Record</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <select
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            value={form.person_key}
            onChange={(e) => setForm((p) => ({ ...p, person_key: e.target.value }))}
          >
            <option value="">Select Employee</option>
            {staff.map((s) => (
              <option key={`${s.account_type ?? "staff"}:${s.staff_id}`} value={`${s.account_type ?? "staff"}:${s.staff_id}`}>
                {s.name} ({s.user_code}) - {s.account_type === "doctor" ? "Doctor" : s.role || "Staff"}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            value={form.credential_type_id}
            onChange={(e) => setForm((p) => ({ ...p, credential_type_id: e.target.value }))}
          >
            <option value="">Credential Type</option>
            {credentialTypes.map((ct) => (
              <option key={ct.credential_type_id} value={ct.credential_type_id}>
                {ct.credential_name} ({ct.credential_code})
              </option>
            ))}
          </select>
          <input
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            placeholder="Credential Number"
            value={form.credential_number}
            onChange={(e) => setForm((p) => ({ ...p, credential_number: e.target.value }))}
          />
          <input
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            placeholder="Credential Title"
            value={form.credential_title}
            onChange={(e) => setForm((p) => ({ ...p, credential_title: e.target.value }))}
          />
          <input type="date" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" value={form.issued_on} onChange={(e) => setForm((p) => ({ ...p, issued_on: e.target.value }))} />
          <input type="date" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" value={form.expires_on} onChange={(e) => setForm((p) => ({ ...p, expires_on: e.target.value }))} />
          <input
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            placeholder="Issuing Authority"
            value={form.issuing_authority}
            onChange={(e) => setForm((p) => ({ ...p, issuing_authority: e.target.value }))}
          />
          <input
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            placeholder="Issuing Country"
            value={form.issuing_country}
            onChange={(e) => setForm((p) => ({ ...p, issuing_country: e.target.value }))}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            disabled={saving}
            onClick={createCredential}
            className="h-10 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-widest px-4"
          >
            Create Credential
          </Button>
          <select
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>
      </Card>

      <Card className="rounded-3xl border border-slate-100 p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] text-left">
            <thead>
              <tr className="bg-slate-50/70">
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Employee</th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Credential</th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Number</th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Issued</th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Expires</th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Days Left</th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Verification</th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Renewal</th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-3 py-8 text-sm text-slate-500 font-semibold">Loading credentials…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-8 text-sm text-slate-500 font-semibold">No credential records found.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.credential_id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <p className="text-xs font-bold text-slate-800">{item.employee_name}</p>
                      <p className="text-[10px] font-semibold text-slate-500">{item.user_code} - {item.account_type.toUpperCase()}</p>
                    </td>
                    <td className="px-3 py-2 text-xs font-semibold text-slate-700">{item.credential_name}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-slate-700">{item.credential_number}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-slate-700">{formatDateInTimezone(item.issued_on, systemTimezone)}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-slate-700">{formatDateInTimezone(item.expires_on, systemTimezone)}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-slate-700">
                      {item.days_until_expiry == null ? "-" : item.days_until_expiry}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${statusBadge(item.verification_status)}`}>
                        {item.verification_status}
                      </span>
                      {item.reviewed_at ? (
                        <p className="text-[10px] text-slate-500 mt-1">
                          {formatDateTimeInTimezone(item.reviewed_at, systemTimezone)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs font-semibold text-slate-700">{item.renewal_status}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-1 flex-wrap justify-end">
                        {(item.verification_status === "draft" || item.verification_status === "rejected") ? (
                          <Button onClick={() => triggerAction(item.credential_id, "submit")} disabled={saving} className="h-8 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-[10px] font-black uppercase px-2">Submit</Button>
                        ) : null}
                        {item.verification_status === "submitted" || item.verification_status === "under_review" ? (
                          <>
                            <Button onClick={() => triggerAction(item.credential_id, "verify")} disabled={saving} className="h-8 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-black uppercase px-2">Verify</Button>
                            <Button onClick={() => triggerAction(item.credential_id, "reject")} disabled={saving} className="h-8 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-[10px] font-black uppercase px-2">Reject</Button>
                          </>
                        ) : null}
                        <Button onClick={() => renewCredential(item.credential_id, item.expires_on)} disabled={saving} className="h-8 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-[10px] font-black uppercase px-2">Renew</Button>
                        {item.verification_status !== "revoked" ? (
                          <Button onClick={() => triggerAction(item.credential_id, "revoke")} disabled={saving} className="h-8 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-[10px] font-black uppercase px-2">Revoke</Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
