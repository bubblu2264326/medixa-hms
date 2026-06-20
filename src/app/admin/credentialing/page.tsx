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
    if (status === "verified") return "bg-success/10 text-success";
    if (status === "rejected" || status === "revoked" || status === "expired") return "bg-destructive/10 text-destructive";
    return "bg-warning/15 text-warning-foreground";
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
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Credentialing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enterprise-grade credential verification, renewal control, and compliance tracking for staff and doctors.
        </p>
      </div>

      {error ? (
        <Card className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
          <p className="text-sm font-semibold text-destructive">{error}</p>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <Card className="rounded-lg p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total</p><p className="text-xl font-semibold text-foreground font-mono tabular-nums">{summary.total}</p></Card>
        <Card className="rounded-lg p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Verified</p><p className="text-xl font-semibold text-success font-mono tabular-nums">{summary.verified}</p></Card>
        <Card className="rounded-lg p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">In Progress</p><p className="text-xl font-semibold text-warning-foreground font-mono tabular-nums">{summary.in_progress}</p></Card>
        <Card className="rounded-lg p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Rejected</p><p className="text-xl font-semibold text-destructive font-mono tabular-nums">{summary.rejected}</p></Card>
        <Card className="rounded-lg p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Revoked</p><p className="text-xl font-semibold text-destructive font-mono tabular-nums">{summary.revoked}</p></Card>
        <Card className="rounded-lg p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Expired</p><p className="text-xl font-semibold text-destructive font-mono tabular-nums">{summary.expired}</p></Card>
        <Card className="rounded-lg p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Expiring Soon</p><p className="text-xl font-semibold text-warning-foreground font-mono tabular-nums">{summary.expiring_soon}</p></Card>
        <Card className="rounded-lg p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">30-Day Alerts</p><p className="text-xl font-semibold text-warning-foreground font-mono tabular-nums">{expiringItems}</p></Card>
      </div>

      <Card className="rounded-lg border border-border p-5 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">New Credential Record</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <select
            className="h-10 rounded-md border border-input px-3 text-sm"
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
            className="h-10 rounded-md border border-input px-3 text-sm"
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
            className="h-10 rounded-md border border-input px-3 text-sm"
            placeholder="Credential Number"
            value={form.credential_number}
            onChange={(e) => setForm((p) => ({ ...p, credential_number: e.target.value }))}
          />
          <input
            className="h-10 rounded-md border border-input px-3 text-sm"
            placeholder="Credential Title"
            value={form.credential_title}
            onChange={(e) => setForm((p) => ({ ...p, credential_title: e.target.value }))}
          />
          <input type="date" className="h-10 rounded-md border border-input px-3 text-sm" value={form.issued_on} onChange={(e) => setForm((p) => ({ ...p, issued_on: e.target.value }))} />
          <input type="date" className="h-10 rounded-md border border-input px-3 text-sm" value={form.expires_on} onChange={(e) => setForm((p) => ({ ...p, expires_on: e.target.value }))} />
          <input
            className="h-10 rounded-md border border-input px-3 text-sm"
            placeholder="Issuing Authority"
            value={form.issuing_authority}
            onChange={(e) => setForm((p) => ({ ...p, issuing_authority: e.target.value }))}
          />
          <input
            className="h-10 rounded-md border border-input px-3 text-sm"
            placeholder="Issuing Country"
            value={form.issuing_country}
            onChange={(e) => setForm((p) => ({ ...p, issuing_country: e.target.value }))}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            disabled={saving}
            onClick={createCredential}
            className="h-10 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold uppercase tracking-wide px-4"
          >
            Create Credential
          </Button>
          <select
            className="h-10 rounded-md border border-input px-3 text-sm"
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

      <Card className="rounded-lg border border-border p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] text-left">
            <thead>
              <tr className="bg-muted">
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Employee</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Credential</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Number</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Issued</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Expires</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Days Left</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Verification</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Renewal</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-3 py-8 text-sm text-muted-foreground font-semibold">Loading credentials…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-8 text-sm text-muted-foreground font-semibold">No credential records found.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.credential_id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <p className="text-xs font-semibold text-foreground">{item.employee_name}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground font-mono tabular-nums">{item.user_code} - {item.account_type.toUpperCase()}</p>
                    </td>
                    <td className="px-3 py-2 text-xs font-semibold text-foreground">{item.credential_name}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-foreground font-mono tabular-nums">{item.credential_number}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-foreground font-mono tabular-nums">{formatDateInTimezone(item.issued_on, systemTimezone)}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-foreground font-mono tabular-nums">{formatDateInTimezone(item.expires_on, systemTimezone)}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-foreground font-mono tabular-nums">
                      {item.days_until_expiry == null ? "-" : item.days_until_expiry}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide ${statusBadge(item.verification_status)}`}>
                        {item.verification_status}
                      </span>
                      {item.reviewed_at ? (
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono tabular-nums">
                          {formatDateTimeInTimezone(item.reviewed_at, systemTimezone)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs font-semibold text-foreground">{item.renewal_status}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-1 flex-wrap justify-end">
                        {(item.verification_status === "draft" || item.verification_status === "rejected") ? (
                          <Button onClick={() => triggerAction(item.credential_id, "submit")} disabled={saving} className="h-8 rounded-md bg-muted text-foreground hover:bg-accent text-[10px] font-semibold uppercase px-2">Submit</Button>
                        ) : null}
                        {item.verification_status === "submitted" || item.verification_status === "under_review" ? (
                          <>
                            <Button onClick={() => triggerAction(item.credential_id, "verify")} disabled={saving} className="h-8 rounded-md bg-success text-success-foreground hover:bg-success/90 text-[10px] font-semibold uppercase px-2">Verify</Button>
                            <Button onClick={() => triggerAction(item.credential_id, "reject")} disabled={saving} className="h-8 rounded-md bg-destructive text-white hover:bg-destructive/90 text-[10px] font-semibold uppercase px-2">Reject</Button>
                          </>
                        ) : null}
                        <Button onClick={() => renewCredential(item.credential_id, item.expires_on)} disabled={saving} className="h-8 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-[10px] font-semibold uppercase px-2">Renew</Button>
                        {item.verification_status !== "revoked" ? (
                          <Button onClick={() => triggerAction(item.credential_id, "revoke")} disabled={saving} className="h-8 rounded-md bg-destructive text-white hover:bg-destructive/90 text-[10px] font-semibold uppercase px-2">Revoke</Button>
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
