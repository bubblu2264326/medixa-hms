"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { Shield, Save } from "lucide-react";

type StaffLite = {
  staff_id: number;
  name: string;
  user_code: string;
  role: string;
};

type Policy = {
  policy_id?: number;
  module: string;
  action: "view" | "create" | "edit" | "delete" | "approve" | "export";
  allowed: boolean;
  scope_type: "global" | "facility" | "branch" | "department";
  scope_value?: string | null;
  staff_id?: number | null;
  expires_at?: string | null;
};

const modules = [
  "staff_directory",
  "access_roles",
  "security_sessions",
  "attendance",
  "roster",
  "leave",
  "approvals",
  "credentialing",
  "documents",
  "analytics",
  "inventory",
  "financials",
  "settings",
  "audit",
];

const actions: Array<Policy["action"]> = ["view", "create", "edit", "delete", "approve", "export"];

export default function StaffAccessRolesPage() {
  const [staff, setStaff] = useState<StaffLite[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Scoped (non-global) permission overrides — facility/branch/department with an
  // optional expiry. The matrix above only handles global grants; this surfaces
  // the backend's scoped-policy support.
  const [scopedForm, setScopedForm] = useState({
    module: modules[0],
    action: "view" as Policy["action"],
    scope_type: "facility" as "facility" | "branch" | "department",
    scope_value: "",
    allowed: true,
    expires_at: "",
  });
  const [savingScoped, setSavingScoped] = useState(false);

  const selectedStaff = useMemo(
    () => staff.find((s) => s.staff_id === selectedStaffId) ?? null,
    [staff, selectedStaffId]
  );

  const loadStaff = useCallback(async () => {
    const res = await fetch("/api/admin/staff/v2/directory", { credentials: "include" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load staff list");
    const rows: StaffLite[] = (Array.isArray(data) ? data : []).map((row: any) => ({
      staff_id: Number(row.staff_id),
      name: String(row.name ?? ""),
      user_code: String(row.user_code ?? ""),
      role: String(row.role ?? ""),
    }));
    setStaff(rows);
    if (!selectedStaffId && rows[0]) setSelectedStaffId(rows[0].staff_id);
  }, [selectedStaffId]);

  const loadPolicies = async (staffId: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/staff/v2/permissions?staff_id=${staffId}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load permissions");
      const rows = Array.isArray(data) ? (data as Policy[]) : [];
      setPolicies(rows);
    } catch (e: any) {
      setError(e?.message || "Failed to load permissions");
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff().catch((e) => setError(e?.message || "Failed to load staff list"));
  }, [loadStaff]);

  useEffect(() => {
    if (selectedStaffId) {
      loadPolicies(selectedStaffId);
    }
  }, [selectedStaffId]);

  const isAllowed = (moduleName: string, action: Policy["action"]) => {
    const found = policies.find(
      (p) =>
        p.module === moduleName &&
        p.action === action &&
        p.scope_type === "global" &&
        (p.scope_value == null || p.scope_value === "")
    );
    return Boolean(found?.allowed);
  };

  const toggle = (moduleName: string, action: Policy["action"]) => {
    const idx = policies.findIndex(
      (p) =>
        p.module === moduleName &&
        p.action === action &&
        p.scope_type === "global" &&
        (p.scope_value == null || p.scope_value === "")
    );

    if (idx === -1) {
      setPolicies((prev) => [
        ...prev,
        {
          module: moduleName,
          action,
          allowed: true,
          scope_type: "global",
          scope_value: null,
          staff_id: selectedStaffId,
        },
      ]);
      return;
    }

    const copy = [...policies];
    copy[idx] = { ...copy[idx], allowed: !copy[idx].allowed };
    setPolicies(copy);
  };

  const save = async () => {
    if (!selectedStaffId) return;
    setSaving(true);
    setError("");
    try {
      const payloadPolicies: Policy[] = [];
      for (const moduleName of modules) {
        for (const action of actions) {
          payloadPolicies.push({
            module: moduleName,
            action,
            allowed: isAllowed(moduleName, action),
            scope_type: "global",
            scope_value: null,
            staff_id: selectedStaffId,
          });
        }
      }

      const res = await fetch("/api/admin/staff/v2/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ policies: payloadPolicies }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save permission matrix");
      await loadPolicies(selectedStaffId);
    } catch (e: any) {
      setError(e?.message || "Failed to save permission matrix");
    } finally {
      setSaving(false);
    }
  };

  const scopedPolicies = useMemo(
    () => policies.filter((p) => p.scope_type !== "global"),
    [policies]
  );

  const saveScoped = async () => {
    if (!selectedStaffId) return;
    if (!scopedForm.scope_value.trim()) {
      setError("A scope value (e.g. facility/branch/department code) is required.");
      return;
    }
    setSavingScoped(true);
    setError("");
    try {
      const res = await fetch("/api/admin/staff/v2/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          policies: [
            {
              module: scopedForm.module,
              action: scopedForm.action,
              allowed: scopedForm.allowed,
              scope_type: scopedForm.scope_type,
              scope_value: scopedForm.scope_value.trim(),
              staff_id: selectedStaffId,
              expires_at: scopedForm.expires_at || null,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save scoped override");
      setScopedForm((p) => ({ ...p, scope_value: "", expires_at: "" }));
      await loadPolicies(selectedStaffId);
    } catch (e: any) {
      setError(e?.message || "Failed to save scoped override");
    } finally {
      setSavingScoped(false);
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Access & Roles</h1>
        <p className="text-sm text-muted-foreground mt-1">Action-level permission matrix by staff profile.</p>
      </div>

      {error ? (
        <Card className="border border-destructive/20 bg-destructive/10 p-4 rounded-lg">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </Card>
      ) : null}

      <Card className="rounded-lg border border-border p-5">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
          <div className="flex items-center gap-2 text-foreground">
            <Shield className="w-4 h-4" aria-hidden />
            <p className="text-sm font-medium">Permission Matrix</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="h-10 rounded-md border border-input px-3 text-sm"
              value={selectedStaffId ?? ""}
              onChange={(e) => setSelectedStaffId(Number(e.target.value))}
            >
              {staff.map((s) => (
                <option key={s.staff_id} value={s.staff_id}>
                  {s.name} ({s.user_code})
                </option>
              ))}
            </select>
            <Button onClick={save} disabled={saving || !selectedStaffId} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-md px-4 h-10 text-xs font-semibold">
              <Save className="w-4 h-4 mr-1" /> {saving ? "Saving" : "Save"}
            </Button>
          </div>
        </div>

        {selectedStaff ? (
          <p className="text-xs font-medium text-muted-foreground mb-3">
            Editing: <span className="text-foreground font-semibold">{selectedStaff.name}</span> ({selectedStaff.role})
          </p>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="bg-muted">
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Module</th>
                {actions.map((action) => (
                  <th key={action} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-center">
                    {action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={actions.length + 1} className="px-3 py-8 text-sm text-muted-foreground font-medium">Loading matrix…</td></tr>
              ) : (
                modules.map((moduleName) => (
                  <tr key={moduleName} className="border-t border-border">
                    <td className="px-3 py-2 text-sm font-semibold text-foreground">{moduleName}</td>
                    {actions.map((action) => {
                      const allowed = isAllowed(moduleName, action);
                      return (
                        <td key={`${moduleName}-${action}`} className="px-3 py-2 text-center">
                          <button
                            onClick={() => toggle(moduleName, action)}
                            className={`w-8 h-8 rounded-md border text-xs font-semibold ${allowed ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground border-border"}`}
                            aria-label={`Toggle ${action} for ${moduleName}`}
                          >
                            {allowed ? "Y" : "N"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="rounded-lg border border-border p-5">
        <div className="mb-4 flex items-center gap-2 text-foreground">
          <Shield className="w-4 h-4" aria-hidden />
          <p className="text-sm font-medium">Scoped Overrides</p>
          <span className="text-xs text-muted-foreground">— grant a permission only within a facility / branch / department, optionally time-boxed</span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <select className="h-10 rounded-md border border-input px-2 text-sm" value={scopedForm.module} onChange={(e) => setScopedForm((p) => ({ ...p, module: e.target.value }))}>
            {modules.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="h-10 rounded-md border border-input px-2 text-sm" value={scopedForm.action} onChange={(e) => setScopedForm((p) => ({ ...p, action: e.target.value as Policy["action"] }))}>
            {actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="h-10 rounded-md border border-input px-2 text-sm" value={scopedForm.scope_type} onChange={(e) => setScopedForm((p) => ({ ...p, scope_type: e.target.value as "facility" | "branch" | "department" }))}>
            <option value="facility">facility</option>
            <option value="branch">branch</option>
            <option value="department">department</option>
          </select>
          <input className="h-10 rounded-md border border-input px-3 text-sm" placeholder="scope value" value={scopedForm.scope_value} onChange={(e) => setScopedForm((p) => ({ ...p, scope_value: e.target.value }))} />
          <input type="date" className="h-10 rounded-md border border-input px-2 text-sm" value={scopedForm.expires_at} onChange={(e) => setScopedForm((p) => ({ ...p, expires_at: e.target.value }))} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setScopedForm((p) => ({ ...p, allowed: !p.allowed }))}
              className={`h-10 flex-1 rounded-md border text-xs font-semibold ${scopedForm.allowed ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}
            >
              {scopedForm.allowed ? "Allow" : "Deny"}
            </button>
            <Button onClick={saveScoped} disabled={savingScoped || !selectedStaffId} className="h-10 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground px-3 text-xs font-semibold">
              {savingScoped ? "…" : "Add"}
            </Button>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left min-w-[680px]">
            <thead>
              <tr className="bg-muted">
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Module</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Scope</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Effect</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Expires</th>
              </tr>
            </thead>
            <tbody>
              {scopedPolicies.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-4 text-sm font-medium text-muted-foreground">No scoped overrides — all grants are global.</td></tr>
              ) : (
                scopedPolicies.map((p) => (
                  <tr key={p.policy_id ?? `${p.module}-${p.action}-${p.scope_type}-${p.scope_value}`} className="border-t border-border">
                    <td className="px-3 py-2 text-xs font-semibold text-foreground">{p.module}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-foreground">{p.action}</td>
                    <td className="px-3 py-2 text-xs font-medium text-muted-foreground">{p.scope_type}: {p.scope_value || "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${p.allowed ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                        {p.allowed ? "Allow" : "Deny"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs font-medium text-muted-foreground font-mono tabular-nums">{p.expires_at ? String(p.expires_at).slice(0, 10) : "—"}</td>
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
