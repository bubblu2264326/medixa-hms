"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";

type DirectoryRow = {
  account_type?: "staff" | "doctor";
  staff_id: number;
  name: string;
  user_code: string;
  role?: string | null;
};

type AllowanceTypeMaster = {
  code: string;
  label: string;
  taxable: boolean;
};

type AllowanceRow = {
  allowance_id: number;
  allowance_code: string;
  allowance_name: string;
  amount: number | string;
  allowance_mode: "recurring" | "one_time";
  taxable: boolean;
  is_active: boolean;
};

type LeaveType = {
  leave_type_id: number;
  leave_name: string;
  leave_code: string;
};

type LeavePolicyPayload = {
  role_quotas: Array<{
    role_name: string;
    leave_type_id: number;
    annual_quota: number;
  }>;
  employee_overrides: Array<{
    leave_type_id: number;
    annual_quota: number;
  }>;
};

export default function EmployeeSettingsPage() {
  const primaryBtnClass =
    "h-10 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black uppercase tracking-widest px-4";
  const surfaceClass = "rounded-3xl border border-slate-200 bg-white p-6";
  const fieldLabelClass = "text-[11px] font-black uppercase tracking-widest text-slate-500";
  const inputClass = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm";

  const [directory, setDirectory] = useState<DirectoryRow[]>([]);
  const [allowanceTypes, setAllowanceTypes] = useState<AllowanceTypeMaster[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [comp, setComp] = useState({
    salary_model: "fixed_monthly" as "fixed_monthly" | "per_patient_seen",
    base_monthly_salary: 0,
    per_patient_fee: 0,
  });
  const [allowances, setAllowances] = useState<AllowanceRow[]>([]);
  const [allowanceForm, setAllowanceForm] = useState({
    allowance_code: "",
    allowance_name: "",
    amount: 0,
    allowance_mode: "recurring" as "recurring" | "one_time",
    taxable: false,
  });
  const [policy, setPolicy] = useState<LeavePolicyPayload>({ role_quotas: [], employee_overrides: [] });
  const [policyForm, setPolicyForm] = useState({
    leave_type_id: "",
    role_quota: 0,
    employee_quota: 0,
  });

  const selected = useMemo(() => {
    if (!selectedKey) return null;
    const [accountType, id] = selectedKey.split(":");
    return {
      accountType: accountType === "doctor" ? "doctor" : "staff",
      personId: Number(id),
      row: directory.find((d) => `${d.account_type ?? "staff"}:${d.staff_id}` === selectedKey) ?? null,
    };
  }, [selectedKey, directory]);

  const loadMasters = async () => {
    const [directoryRes, mastersRes, leaveTypeRes] = await Promise.all([
      fetch("/api/admin/staff/v2/directory", { credentials: "include" }),
      fetch("/api/admin/finance/masters", { credentials: "include" }),
      fetch("/api/admin/staff/v2/leave/types", { credentials: "include" }),
    ]);

    const directoryData = await directoryRes.json();
    const mastersData = await mastersRes.json();
    const leaveTypeData = await leaveTypeRes.json();

    if (!directoryRes.ok) throw new Error(directoryData?.error || "Failed to load directory");
    if (!mastersRes.ok) throw new Error(mastersData?.error || "Failed to load finance masters");
    if (!leaveTypeRes.ok) throw new Error(leaveTypeData?.error || "Failed to load leave types");

    const people = (Array.isArray(directoryData) ? directoryData : []).filter((r: any) => r?.staff_id);
    setDirectory(people);
    setAllowanceTypes(Array.isArray(mastersData?.allowance_types) ? mastersData.allowance_types : []);
    setLeaveTypes(Array.isArray(leaveTypeData) ? leaveTypeData : []);

    if (!selectedKey && people[0]) {
      setSelectedKey(`${people[0].account_type ?? "staff"}:${people[0].staff_id}`);
    }
  };

  const loadSelected = async () => {
    if (!selected) return;
    setLoading(true);
    setError("");
    try {
      const base = `account_type=${selected.accountType}&person_id=${selected.personId}`;
      const [compRes, allowanceRes, policyRes] = await Promise.all([
        fetch(`/api/admin/staff/v2/compensation?${base}`, { credentials: "include" }),
        fetch(`/api/admin/staff/v2/allowances?${base}`, { credentials: "include" }),
        fetch(`/api/admin/staff/v2/leave/policies?${base}&role=${encodeURIComponent(selected.row?.role || "")}`, {
          credentials: "include",
        }),
      ]);

      const compData = await compRes.json();
      const allowanceData = await allowanceRes.json();
      const policyData = await policyRes.json();

      if (!compRes.ok) throw new Error(compData?.error || "Failed to load compensation profile");
      if (!allowanceRes.ok) throw new Error(allowanceData?.error || "Failed to load allowances");
      if (!policyRes.ok) throw new Error(policyData?.error || "Failed to load leave policy");

      const profile = Array.isArray(compData) ? compData[0] : null;
      setComp({
        salary_model: profile?.salary_model === "per_patient_seen" ? "per_patient_seen" : "fixed_monthly",
        base_monthly_salary: Number(profile?.base_monthly_salary ?? 0),
        per_patient_fee: Number(profile?.per_patient_fee ?? 0),
      });
      setAllowances(Array.isArray(allowanceData) ? allowanceData : []);
      setPolicy({
        role_quotas: Array.isArray(policyData?.role_quotas) ? policyData.role_quotas : [],
        employee_overrides: Array.isArray(policyData?.employee_overrides) ? policyData.employee_overrides : [],
      });
    } catch (e: any) {
      setError(e?.message || "Failed to load employee settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasters().catch((e: any) => setError(e?.message || "Failed to initialize employee settings"));
  }, []);

  useEffect(() => {
    loadSelected();
  }, [selectedKey]);

  const saveCompensation = async () => {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/staff/v2/compensation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          account_type: selected.accountType,
          person_id: selected.personId,
          salary_model: comp.salary_model,
          base_monthly_salary: Number(comp.base_monthly_salary),
          per_patient_fee: comp.salary_model === "per_patient_seen" ? Number(comp.per_patient_fee) : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save compensation profile");
      await loadSelected();
    } catch (e: any) {
      setError(e?.message || "Failed to save compensation profile");
    } finally {
      setSaving(false);
    }
  };

  const addAllowance = async () => {
    if (!selected || !allowanceForm.allowance_code || !allowanceForm.allowance_name) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/staff/v2/allowances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          account_type: selected.accountType,
          person_id: selected.personId,
          ...allowanceForm,
          amount: Number(allowanceForm.amount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to add allowance");
      setAllowanceForm({
        allowance_code: "",
        allowance_name: "",
        amount: 0,
        allowance_mode: "recurring",
        taxable: false,
      });
      await loadSelected();
    } catch (e: any) {
      setError(e?.message || "Failed to add allowance");
    } finally {
      setSaving(false);
    }
  };

  const deactivateAllowance = async (allowanceId: number) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/staff/v2/allowances?allowance_id=${allowanceId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to deactivate allowance");
      await loadSelected();
    } catch (e: any) {
      setError(e?.message || "Failed to deactivate allowance");
    } finally {
      setSaving(false);
    }
  };

  const saveLeavePolicy = async (scope: "role" | "employee") => {
    if (!selected || !policyForm.leave_type_id) return;
    setSaving(true);
    setError("");
    try {
      const payload =
        scope === "role"
          ? {
              scope: "role",
              role_name: selected.row?.role || "General",
              leave_type_id: Number(policyForm.leave_type_id),
              annual_quota: Number(policyForm.role_quota),
            }
          : {
              account_type: selected.accountType,
              person_id: selected.personId,
              leave_type_id: Number(policyForm.leave_type_id),
              annual_quota: Number(policyForm.employee_quota),
            };

      const res = await fetch("/api/admin/staff/v2/leave/policies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save leave policy");
      await loadSelected();
    } catch (e: any) {
      setError(e?.message || "Failed to save leave policy");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Employee Settings</h1>
        <p className="text-sm text-slate-500 font-semibold mt-1">
          Manage compensation model, allowances, and leave quota policy at role and employee level.
        </p>
      </div>

      {error ? (
        <Card className="border border-red-100 bg-red-50 p-4 rounded-2xl">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </Card>
      ) : null}

      <Card className={surfaceClass}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:items-center">
          <div className="md:col-span-1 space-y-1">
            <label htmlFor="employee-select" className={fieldLabelClass}>
              Select Employee
            </label>
            <select
              id="employee-select"
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className={inputClass}
            >
              {directory.map((row) => (
                <option key={`${row.account_type ?? "staff"}:${row.staff_id}`} value={`${row.account_type ?? "staff"}:${row.staff_id}`}>
                  {row.name} ({row.user_code}) · {row.account_type === "doctor" ? "Doctor" : row.role || "Staff"}
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs font-semibold text-slate-500 md:col-span-2">
            {selected?.row ? (
              <>
                Selected: <span className="font-black text-slate-700">{selected.row.name}</span> ·{" "}
                {selected.row.account_type === "doctor" ? "Doctor" : selected.row.role || "Staff"}
              </>
            ) : (
              "Select an employee to configure."
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className={`${surfaceClass} space-y-4`}>
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Compensation Profile</h2>
          <p className="text-xs text-slate-500">Set how this employee is paid each month.</p>
          {loading ? <p className="text-sm font-semibold text-slate-500">Loading compensation...</p> : null}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="space-y-1">
              <label htmlFor="salary-model" className={fieldLabelClass}>
                Salary Model
              </label>
              <select
                id="salary-model"
                value={comp.salary_model}
                onChange={(e) => setComp((p) => ({ ...p, salary_model: e.target.value === "per_patient_seen" ? "per_patient_seen" : "fixed_monthly" }))}
                className={inputClass}
              >
                <option value="fixed_monthly">Fixed Monthly</option>
                <option value="per_patient_seen">Per Patient Seen</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="base-salary" className={fieldLabelClass}>
                Base Monthly Salary
              </label>
              <input
                id="base-salary"
                type="number"
                min={0}
                value={comp.base_monthly_salary}
                onChange={(e) => setComp((p) => ({ ...p, base_monthly_salary: Number(e.target.value || 0) }))}
                className={inputClass}
                placeholder="e.g. 50000"
              />
            </div>
            {comp.salary_model === "per_patient_seen" ? (
              <div className="space-y-1">
                <label htmlFor="patient-fee" className={fieldLabelClass}>
                  Per Patient Fee
                </label>
                <input
                  id="patient-fee"
                  type="number"
                  min={0}
                  value={comp.per_patient_fee}
                  onChange={(e) => setComp((p) => ({ ...p, per_patient_fee: Number(e.target.value || 0) }))}
                  className={inputClass}
                  placeholder="e.g. 1500"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Per Patient Fee
                </label>
                <div className="h-10 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm text-slate-500 flex items-center">
                  Not used in Fixed Monthly mode
                </div>
              </div>
            )}
          </div>
          <Button
            onClick={saveCompensation}
            disabled={!selected || saving}
            className={primaryBtnClass}
          >
            Save Compensation
          </Button>
        </Card>

        <Card className={`${surfaceClass} space-y-4`}>
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Allowances</h2>
          <p className="text-xs text-slate-500">Add recurring or one-time allowances for this employee.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="space-y-1">
              <label htmlFor="allowance-type" className={fieldLabelClass}>
                Allowance Type
              </label>
              <select
                id="allowance-type"
                value={allowanceForm.allowance_code}
                onChange={(e) => {
                  const next = allowanceTypes.find((a) => a.code === e.target.value);
                  setAllowanceForm((p) => ({
                    ...p,
                    allowance_code: e.target.value,
                    allowance_name: next?.label || "",
                    taxable: next?.taxable ?? false,
                  }));
                }}
                className={inputClass}
              >
                <option value="">Select type</option>
                {allowanceTypes.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="allowance-name" className={fieldLabelClass}>
                Allowance Name
              </label>
              <input
                id="allowance-name"
                className={inputClass}
                placeholder="e.g. Travel Allowance"
                value={allowanceForm.allowance_name}
                onChange={(e) => setAllowanceForm((p) => ({ ...p, allowance_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="allowance-amount" className={fieldLabelClass}>
                Amount
              </label>
              <input
                id="allowance-amount"
                type="number"
                min={0}
                className={inputClass}
                placeholder="e.g. 3000"
                value={allowanceForm.amount}
                onChange={(e) => setAllowanceForm((p) => ({ ...p, amount: Number(e.target.value || 0) }))}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="allowance-mode" className={fieldLabelClass}>
                Frequency
              </label>
              <select
                id="allowance-mode"
                className={inputClass}
                value={allowanceForm.allowance_mode}
                onChange={(e) => setAllowanceForm((p) => ({ ...p, allowance_mode: e.target.value === "one_time" ? "one_time" : "recurring" }))}
              >
                <option value="recurring">Recurring</option>
                <option value="one_time">One Time</option>
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <div className="h-[16px]" />
              <Button
                onClick={addAllowance}
                disabled={!selected || saving || !allowanceForm.allowance_name || !allowanceForm.allowance_code}
                className={`${primaryBtnClass} w-full md:w-auto`}
              >
                Add Allowance
              </Button>
            </div>
          </div>

          <div className="pt-1 overflow-x-auto">
            <table className="w-full text-left min-w-[680px]">
              <thead>
                <tr className="bg-slate-50/70">
                  <th className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Code</th>
                  <th className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Name</th>
                  <th className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Mode</th>
                  <th className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                  <th className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {allowances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-4 text-sm font-semibold text-slate-500">
                      No allowances configured.
                    </td>
                  </tr>
                ) : (
                  allowances.map((a) => (
                    <tr key={a.allowance_id} className="border-t border-slate-100">
                      <td className="px-2 py-2 text-xs font-semibold text-slate-700">{a.allowance_code}</td>
                      <td className="px-2 py-2 text-xs font-semibold text-slate-700">{a.allowance_name}</td>
                      <td className="px-2 py-2 text-xs font-semibold text-slate-700">{a.allowance_mode}</td>
                      <td className="px-2 py-2 text-xs font-semibold text-slate-700">PKR {Number(a.amount).toLocaleString()}</td>
                      <td className="px-2 py-2 text-xs font-semibold text-slate-700">{a.is_active ? "Active" : "Inactive"}</td>
                      <td className="px-2 py-2">
                        {a.is_active ? (
                          <Button
                            onClick={() => deactivateAllowance(a.allowance_id)}
                            disabled={saving}
                            className="h-8 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-black uppercase tracking-widest px-3"
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Archived</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card className={`${surfaceClass} space-y-4`}>
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Leave Quota Policy</h2>
        <p className="text-xs text-slate-500">Define annual leave days by role default and by employee override.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="space-y-1">
            <label htmlFor="leave-type" className={fieldLabelClass}>
              Leave Type
            </label>
            <select
              id="leave-type"
              value={policyForm.leave_type_id}
              onChange={(e) => setPolicyForm((p) => ({ ...p, leave_type_id: e.target.value }))}
              className={inputClass}
            >
              <option value="">Select leave type</option>
              {leaveTypes.map((lt) => (
                <option key={lt.leave_type_id} value={lt.leave_type_id}>
                  {lt.leave_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="role-quota" className={fieldLabelClass}>
              Role Annual Quota (Days)
            </label>
            <input
              id="role-quota"
              type="number"
              min={0}
              value={policyForm.role_quota}
              onChange={(e) => setPolicyForm((p) => ({ ...p, role_quota: Number(e.target.value || 0) }))}
              className={inputClass}
              placeholder="e.g. 20"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="employee-quota" className={fieldLabelClass}>
              Employee Override Quota (Days)
            </label>
            <input
              id="employee-quota"
              type="number"
              min={0}
              value={policyForm.employee_quota}
              onChange={(e) => setPolicyForm((p) => ({ ...p, employee_quota: Number(e.target.value || 0) }))}
              className={inputClass}
              placeholder="e.g. 25"
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => saveLeavePolicy("role")}
            disabled={!selected || saving || !policyForm.leave_type_id}
            className={primaryBtnClass}
          >
            Save Role Quota
          </Button>
          <Button
            onClick={() => saveLeavePolicy("employee")}
            disabled={!selected || saving || !policyForm.leave_type_id}
            className={primaryBtnClass}
          >
            Save Employee Override
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Role Defaults ({selected?.row?.role || "N/A"})</p>
            <div className="space-y-1">
              {policy.role_quotas.length === 0 ? (
                <p className="text-xs font-semibold text-slate-500">No role quota configured.</p>
              ) : (
                policy.role_quotas.map((r, idx) => (
                  <p key={`${r.leave_type_id}-${idx}`} className="text-xs font-semibold text-slate-700">
                    Leave Type #{r.leave_type_id}: {Number(r.annual_quota)} days
                  </p>
                ))
              )}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Employee Overrides</p>
            <div className="space-y-1">
              {policy.employee_overrides.length === 0 ? (
                <p className="text-xs font-semibold text-slate-500">No employee override configured.</p>
              ) : (
                policy.employee_overrides.map((r, idx) => (
                  <p key={`${r.leave_type_id}-${idx}`} className="text-xs font-semibold text-slate-700">
                    Leave Type #{r.leave_type_id}: {Number(r.annual_quota)} days
                  </p>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
