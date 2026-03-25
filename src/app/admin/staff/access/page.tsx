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

  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Access & Roles</h1>
        <p className="text-sm text-slate-500 font-semibold mt-1">Action-level permission matrix by staff profile.</p>
      </div>

      {error ? (
        <Card className="border border-red-100 bg-red-50 p-4 rounded-2xl">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </Card>
      ) : null}

      <Card className="rounded-3xl border border-slate-100 p-5">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-700">
            <Shield className="w-4 h-4" />
            <p className="text-sm font-semibold">Permission Matrix</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
              value={selectedStaffId ?? ""}
              onChange={(e) => setSelectedStaffId(Number(e.target.value))}
            >
              {staff.map((s) => (
                <option key={s.staff_id} value={s.staff_id}>
                  {s.name} ({s.user_code})
                </option>
              ))}
            </select>
            <Button onClick={save} disabled={saving || !selectedStaffId} className="bg-slate-900 hover:bg-black text-white rounded-xl px-4 h-10 text-xs font-black uppercase tracking-widest">
              <Save className="w-4 h-4 mr-1" /> {saving ? "Saving" : "Save"}
            </Button>
          </div>
        </div>

        {selectedStaff ? (
          <p className="text-xs font-semibold text-slate-500 mb-3">
            Editing: <span className="text-slate-700 font-bold">{selectedStaff.name}</span> ({selectedStaff.role})
          </p>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/70">
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Module</th>
                {actions.map((action) => (
                  <th key={action} className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                    {action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={actions.length + 1} className="px-3 py-8 text-sm text-slate-500 font-semibold">Loading matrix…</td></tr>
              ) : (
                modules.map((moduleName) => (
                  <tr key={moduleName} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-sm font-bold text-slate-700">{moduleName}</td>
                    {actions.map((action) => {
                      const allowed = isAllowed(moduleName, action);
                      return (
                        <td key={`${moduleName}-${action}`} className="px-3 py-2 text-center">
                          <button
                            onClick={() => toggle(moduleName, action)}
                            className={`w-8 h-8 rounded-lg border text-xs font-black ${allowed ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}
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
    </div>
  );
}
