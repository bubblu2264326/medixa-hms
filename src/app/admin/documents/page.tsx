"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { Dialog } from "@/src/components/ui/Dialog";
import { formatDateInTimezone, formatDateTimeInTimezone, getTimezoneNowDateInput } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

type StaffRow = {
  account_type?: "staff" | "doctor";
  staff_id: number;
  name: string;
  user_code: string;
  role?: string | null;
  employment_status?: string;
};

type DocumentType = {
  document_type_id: number;
  document_code: string;
  document_name: string;
  requires_expiry: boolean;
};

type DocumentRow = {
  document_id: number;
  account_type: "staff" | "doctor";
  person_id: number;
  employee_name: string;
  user_code: string;
  role?: string | null;
  document_type_id: number;
  document_name: string;
  document_title: string;
  review_status: string;
  visibility: string;
  current_version_no: number;
  file_url?: string | null;
  file_name?: string | null;
  expires_on?: string | null;
  required_by?: string | null;
  days_until_expiry?: number | null;
  reviewed_at?: string | null;
};

type DocumentSummary = {
  total: number;
  approved: number;
  in_progress: number;
  rejected: number;
  expired: number;
  expiring_soon: number;
  missing_required: number;
};

export default function DocumentsPage() {
  const systemTimezone = useSystemTimezone();
  const today = getTimezoneNowDateInput(systemTimezone);

  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [types, setTypes] = useState<DocumentType[]>([]);
  const [items, setItems] = useState<DocumentRow[]>([]);
  const [summary, setSummary] = useState<DocumentSummary>({
    total: 0,
    approved: 0,
    in_progress: 0,
    rejected: 0,
    expired: 0,
    expiring_soon: 0,
    missing_required: 0,
  });

  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // New-version upload modal (replaces back-to-back window.prompt calls, which
  // offered no validation, no cancel-after-first-field, and looked unbranded).
  const [versionModal, setVersionModal] = useState<{
    documentId: number;
    fileUrl: string;
    fileName: string;
  } | null>(null);

  const [form, setForm] = useState({
    person_key: "",
    document_type_id: "",
    document_title: "",
    document_description: "",
    visibility: "internal",
    expires_on: "",
    required_by: "",
    file_url: "",
    file_name: "",
    mime_type: "",
  });

  const statusClass = (status: string) => {
    if (status === "approved") return "bg-success/10 text-success";
    if (status === "rejected" || status === "expired") return "bg-destructive/10 text-destructive";
    if (status === "archived") return "bg-muted text-muted-foreground";
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

  const loadDocuments = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/staff/v2/documents?${params.toString()}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load documents");
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTypes(Array.isArray(data?.document_types) ? data.document_types : []);
      setSummary({
        total: Number(data?.summary?.total ?? 0),
        approved: Number(data?.summary?.approved ?? 0),
        in_progress: Number(data?.summary?.in_progress ?? 0),
        rejected: Number(data?.summary?.rejected ?? 0),
        expired: Number(data?.summary?.expired ?? 0),
        expiring_soon: Number(data?.summary?.expiring_soon ?? 0),
        missing_required: Number(data?.summary?.missing_required ?? 0),
      });
    } catch (e: any) {
      setError(e?.message || "Failed to load documents");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([loadDirectory(), loadDocuments()]).catch((e: any) =>
      setError(e?.message || "Failed to initialize document module")
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadDocuments();
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const createDocument = async () => {
    setSaving(true);
    setError("");
    try {
      const [accountType, personIdRaw] = form.person_key.split(":");
      const personId = Number(personIdRaw);
      if (!personId || !form.document_type_id || !form.document_title.trim()) {
        throw new Error("Select employee, document type, and document title.");
      }
      const res = await fetch("/api/admin/staff/v2/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          account_type: accountType === "doctor" ? "doctor" : "staff",
          person_id: personId,
          document_type_id: Number(form.document_type_id),
          document_title: form.document_title.trim(),
          document_description: form.document_description || null,
          visibility: form.visibility,
          expires_on: form.expires_on || null,
          required_by: form.required_by || null,
          file_url: form.file_url || null,
          file_name: form.file_name || null,
          mime_type: form.mime_type || null,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Failed to create document record");
      setForm({
        person_key: "",
        document_type_id: "",
        document_title: "",
        document_description: "",
        visibility: "internal",
        expires_on: "",
        required_by: "",
        file_url: "",
        file_name: "",
        mime_type: "",
      });
      await loadDocuments();
    } catch (e: any) {
      setError(e?.message || "Failed to create document record");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (documentId: number, action: string) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/staff/v2/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          document_id: documentId,
          action,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || `Failed to ${action} document`);
      await loadDocuments();
    } catch (e: any) {
      setError(e?.message || `Failed to ${action} document`);
    } finally {
      setSaving(false);
    }
  };

  const submitVersion = async () => {
    if (!versionModal) return;
    const fileUrl = versionModal.fileUrl.trim();
    if (!fileUrl) {
      setError("A file URL is required to add a new version.");
      return;
    }
    const fileName = versionModal.fileName.trim() || "document.pdf";
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/staff/v2/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          document_id: versionModal.documentId,
          action: "add_version",
          file_url: fileUrl,
          file_name: fileName,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Failed to add new version");
      setVersionModal(null);
      await loadDocuments();
    } catch (e: any) {
      setError(e?.message || "Failed to add new version");
    } finally {
      setSaving(false);
    }
  };

  const expiringToday = useMemo(
    () => items.filter((item) => item.expires_on === today).length,
    [items, today]
  );

  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Documents</h1>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          Controlled document lifecycle, version governance, review workflow, and requirement coverage.
        </p>
      </div>

      {error ? (
        <Card className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <Card className="rounded-lg p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</p><p className="text-xl font-semibold text-foreground font-mono tabular-nums">{summary.total}</p></Card>
        <Card className="rounded-lg p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Approved</p><p className="text-xl font-semibold text-success font-mono tabular-nums">{summary.approved}</p></Card>
        <Card className="rounded-lg p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">In Progress</p><p className="text-xl font-semibold text-warning-foreground font-mono tabular-nums">{summary.in_progress}</p></Card>
        <Card className="rounded-lg p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rejected</p><p className="text-xl font-semibold text-destructive font-mono tabular-nums">{summary.rejected}</p></Card>
        <Card className="rounded-lg p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expired</p><p className="text-xl font-semibold text-destructive font-mono tabular-nums">{summary.expired}</p></Card>
        <Card className="rounded-lg p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expiring Soon</p><p className="text-xl font-semibold text-warning-foreground font-mono tabular-nums">{summary.expiring_soon}</p></Card>
        <Card className="rounded-lg p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Missing Required</p><p className="text-xl font-semibold text-destructive font-mono tabular-nums">{summary.missing_required}</p></Card>
        <Card className="rounded-lg p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expiring Today</p><p className="text-xl font-semibold text-warning-foreground font-mono tabular-nums">{expiringToday}</p></Card>
      </div>

      <Card className="rounded-lg border border-border p-5 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Create Document Record</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <select className="h-10 rounded-md border border-input px-3 text-sm" value={form.person_key} onChange={(e) => setForm((p) => ({ ...p, person_key: e.target.value }))}>
            <option value="">Select Employee</option>
            {staff.map((s) => (
              <option key={`${s.account_type ?? "staff"}:${s.staff_id}`} value={`${s.account_type ?? "staff"}:${s.staff_id}`}>
                {s.name} ({s.user_code}) - {s.account_type === "doctor" ? "Doctor" : s.role || "Staff"}
              </option>
            ))}
          </select>
          <select className="h-10 rounded-md border border-input px-3 text-sm" value={form.document_type_id} onChange={(e) => setForm((p) => ({ ...p, document_type_id: e.target.value }))}>
            <option value="">Document Type</option>
            {types.map((t) => (
              <option key={t.document_type_id} value={t.document_type_id}>{t.document_name} ({t.document_code})</option>
            ))}
          </select>
          <input className="h-10 rounded-md border border-input px-3 text-sm" placeholder="Document title" value={form.document_title} onChange={(e) => setForm((p) => ({ ...p, document_title: e.target.value }))} />
          <select className="h-10 rounded-md border border-input px-3 text-sm" value={form.visibility} onChange={(e) => setForm((p) => ({ ...p, visibility: e.target.value }))}>
            <option value="internal">Internal</option>
            <option value="restricted">Restricted</option>
            <option value="confidential">Confidential</option>
          </select>
          <input className="h-10 rounded-md border border-input px-3 text-sm" placeholder="Description" value={form.document_description} onChange={(e) => setForm((p) => ({ ...p, document_description: e.target.value }))} />
          <input type="date" className="h-10 rounded-md border border-input px-3 text-sm" value={form.expires_on} onChange={(e) => setForm((p) => ({ ...p, expires_on: e.target.value }))} />
          <input type="date" className="h-10 rounded-md border border-input px-3 text-sm" value={form.required_by} onChange={(e) => setForm((p) => ({ ...p, required_by: e.target.value }))} />
          <input className="h-10 rounded-md border border-input px-3 text-sm" placeholder="File URL (optional)" value={form.file_url} onChange={(e) => setForm((p) => ({ ...p, file_url: e.target.value }))} />
          <input className="h-10 rounded-md border border-input px-3 text-sm" placeholder="File name (optional)" value={form.file_name} onChange={(e) => setForm((p) => ({ ...p, file_name: e.target.value }))} />
          <input className="h-10 rounded-md border border-input px-3 text-sm" placeholder="MIME type (optional)" value={form.mime_type} onChange={(e) => setForm((p) => ({ ...p, mime_type: e.target.value }))} />
        </div>
        <div className="flex items-center gap-2">
          <Button disabled={saving} onClick={createDocument} className="h-10 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4">Create Document</Button>
          <select className="h-10 rounded-md border border-input px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </Card>

      <Card className="rounded-lg border border-border p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px] text-left">
            <thead>
              <tr className="bg-muted">
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Employee</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Document</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Version</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expiry</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-8 text-sm font-medium text-muted-foreground">Loading documents…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-sm font-medium text-muted-foreground">No document records found.</td></tr>
              ) : items.map((item) => (
                <tr key={item.document_id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <p className="text-xs font-semibold text-foreground">{item.employee_name}</p>
                    <p className="text-[10px] text-muted-foreground font-medium font-mono tabular-nums">{item.user_code} - {item.account_type.toUpperCase()}</p>
                  </td>
                  <td className="px-3 py-2">
                    <p className="text-xs font-semibold text-foreground">{item.document_title}</p>
                    {item.file_url ? (
                      <a href={item.file_url} target="_blank" rel="noreferrer" className="text-[10px] font-medium text-info hover:underline">
                        {item.file_name || "Open file"}
                      </a>
                    ) : (
                      <p className="text-[10px] font-medium text-muted-foreground">No attachment</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs font-medium text-foreground">{item.document_name}</td>
                  <td className="px-3 py-2 text-xs font-medium text-foreground font-mono tabular-nums">v{item.current_version_no}</td>
                  <td className="px-3 py-2 text-xs font-medium text-foreground">
                    <p className="font-mono tabular-nums">{formatDateInTimezone(item.expires_on, systemTimezone)}</p>
                    <p className="text-[10px] text-muted-foreground font-mono tabular-nums">{item.days_until_expiry == null ? "-" : `${item.days_until_expiry} days`}</p>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide ${statusClass(item.review_status)}`}>
                      {item.review_status}
                    </span>
                    {item.reviewed_at ? (
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono tabular-nums">{formatDateTimeInTimezone(item.reviewed_at, systemTimezone)}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-1 flex-wrap justify-end">
                      <Button disabled={saving} onClick={() => { setError(""); setVersionModal({ documentId: item.document_id, fileUrl: "", fileName: "document.pdf" }); }} className="h-8 rounded-md bg-muted text-foreground hover:bg-accent text-[10px] font-semibold uppercase px-2">Add Version</Button>
                      {(item.review_status === "draft" || item.review_status === "rejected") ? (
                        <Button disabled={saving} onClick={() => changeStatus(item.document_id, "submit")} className="h-8 rounded-md bg-muted text-foreground hover:bg-accent text-[10px] font-semibold uppercase px-2">Submit</Button>
                      ) : null}
                      {item.review_status === "submitted" ? (
                        <Button disabled={saving} onClick={() => changeStatus(item.document_id, "under_review")} className="h-8 rounded-md bg-info text-white hover:bg-info/90 text-[10px] font-semibold uppercase px-2">Review</Button>
                      ) : null}
                      {(item.review_status === "submitted" || item.review_status === "under_review") ? (
                        <>
                          <Button disabled={saving} onClick={() => changeStatus(item.document_id, "approve")} className="h-8 rounded-md bg-success text-success-foreground hover:bg-success/90 text-[10px] font-semibold uppercase px-2">Approve</Button>
                          <Button disabled={saving} onClick={() => changeStatus(item.document_id, "reject")} className="h-8 rounded-md bg-destructive text-white hover:bg-destructive/90 text-[10px] font-semibold uppercase px-2">Reject</Button>
                        </>
                      ) : null}
                      {item.review_status !== "archived" ? (
                        <Button disabled={saving} onClick={() => changeStatus(item.document_id, "archive")} className="h-8 rounded-md bg-muted text-foreground hover:bg-accent text-[10px] font-semibold uppercase px-2">Archive</Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog
        open={versionModal !== null}
        onClose={() => setVersionModal(null)}
        title="Add new version"
        description="Attach the file for the next version of this document."
        footer={
          <>
            <Button onClick={() => setVersionModal(null)} className="h-9 rounded-md bg-muted text-foreground hover:bg-accent text-xs font-semibold px-4">Cancel</Button>
            <Button disabled={saving || !versionModal?.fileUrl.trim()} onClick={submitVersion} className="h-9 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4">{saving ? "Saving…" : "Add Version"}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">File URL</label>
            <input
              autoFocus
              className="h-10 w-full rounded-md border border-input px-3 text-sm"
              placeholder="https://…"
              value={versionModal?.fileUrl ?? ""}
              onChange={(e) => setVersionModal((p) => (p ? { ...p, fileUrl: e.target.value } : p))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">File name</label>
            <input
              className="h-10 w-full rounded-md border border-input px-3 text-sm"
              placeholder="document.pdf"
              value={versionModal?.fileName ?? ""}
              onChange={(e) => setVersionModal((p) => (p ? { ...p, fileName: e.target.value } : p))}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
