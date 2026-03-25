"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Search, UserPlus, Users, Eye, EyeOff } from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";

type StaffRow = {
  account_type: "staff" | "doctor";
  staff_id: number;
  user_code: string;
  name: string;
  role: string;
  employment_status: "active" | "inactive" | "suspended" | "resigned";
  department?: string | null;
  designation?: string | null;
  facility_code?: string | null;
  branch_code?: string | null;
  contact_number?: string | null;
  email?: string | null;
};

const roleOptions = [
  "Receptionist",
  "Lab_Technician",
  "Admin",
  "Super Admin",
  "Cashier",
  "Pharmacist",
  "Nurse",
  "Doctor",
  "Front_Desk",
  "Billing",
  "Technician",
  "Housekeeping",
];

const roleDefaults: Record<string, { department: string; designation: string; codePrefix: string }> = {
  Receptionist: { department: "Front Desk", designation: "Receptionist", codePrefix: "RCP" },
  Lab_Technician: { department: "Laboratory", designation: "Lab Technician", codePrefix: "LAB" },
  Admin: { department: "Administration", designation: "Admin Officer", codePrefix: "ADM" },
  "Super Admin": { department: "Administration", designation: "System Administrator", codePrefix: "SAD" },
  Cashier: { department: "Billing", designation: "Cashier", codePrefix: "CSH" },
  Pharmacist: { department: "Pharmacy", designation: "Pharmacist", codePrefix: "PHA" },
  Nurse: { department: "Nursing", designation: "Staff Nurse", codePrefix: "NRS" },
  Doctor: { department: "Clinical", designation: "Medical Officer", codePrefix: "DOC" },
  Front_Desk: { department: "Front Desk", designation: "Front Desk Executive", codePrefix: "FDK" },
  Billing: { department: "Billing", designation: "Billing Executive", codePrefix: "BLG" },
  Technician: { department: "Technical", designation: "Technician", codePrefix: "TEC" },
  Housekeeping: { department: "Operations", designation: "Housekeeping Staff", codePrefix: "HKP" },
};

function normalizeName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-zA-Z\s]/g, "");
}

function generateTempPassword() {
  const random = Math.random().toString(36).slice(-6).toUpperCase();
  return `HMS@${random}`;
}

export default function StaffDirectoryPage() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [editingAccountType, setEditingAccountType] = useState<"staff" | "doctor">("staff");

  const [form, setForm] = useState({
    name: "",
    user_code: "",
    role: "Receptionist",
    password: "",
    contact_number: "",
    email: "",
    employment_status: "active",
    department: "",
    designation: "",
    facility_code: "",
    branch_code: "",
  });

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/staff/v2/directory?${params.toString()}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load staff directory");
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load staff directory");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadRows();
    }, 350);
    return () => clearTimeout(t);
  }, [loadRows]);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.employment_status === "active").length;
    const suspended = rows.filter((r) => r.employment_status === "suspended").length;
    const resigned = rows.filter((r) => r.employment_status === "resigned").length;
    return { total, active, suspended, resigned };
  }, [rows]);

  const uniqueDepartments = useMemo(() => {
    const fromRoles = roleOptions.map((role) => roleDefaults[role]?.department).filter(Boolean) as string[];
    const fromRows = rows.map((r) => r.department).filter(Boolean) as string[];
    return Array.from(new Set([...fromRoles, ...fromRows])).sort();
  }, [rows]);
  const uniqueDesignations = useMemo(() => {
    const fromRoles = roleOptions.map((role) => roleDefaults[role]?.designation).filter(Boolean) as string[];
    const fromRows = rows.map((r) => r.designation).filter(Boolean) as string[];
    return Array.from(new Set([...fromRoles, ...fromRows])).sort();
  }, [rows]);
  const uniqueFacilities = useMemo(
    () => Array.from(new Set(rows.map((r) => r.facility_code).filter(Boolean) as string[])).sort(),
    [rows]
  );
  const uniqueBranches = useMemo(
    () => Array.from(new Set(rows.map((r) => r.branch_code).filter(Boolean) as string[])).sort(),
    [rows]
  );

  const predictedDepartment = useMemo(() => roleDefaults[form.role]?.department ?? "", [form.role]);
  const predictedDesignation = useMemo(() => roleDefaults[form.role]?.designation ?? "", [form.role]);

  const predictedUserCode = useMemo(() => {
    const prefix = roleDefaults[form.role]?.codePrefix ?? "STF";
    const existing = rows
      .map((r) => r.user_code)
      .filter((code) => code.startsWith(prefix))
      .map((code) => {
        const match = code.match(new RegExp(`^${prefix}(\\d+)$`));
        return match ? Number(match[1]) : NaN;
      })
      .filter((num) => Number.isFinite(num));
    const next = (existing.length ? Math.max(...existing) : 0) + 1;
    return `${prefix}${String(next).padStart(3, "0")}`;
  }, [form.role, rows]);

  const predictedEmail = useMemo(() => {
    const name = normalizeName(form.name).toLowerCase();
    if (!name) return "";
    const slug = name.replace(/\s+/g, ".");
    return `${slug}@clinic.local`;
  }, [form.name]);

  useEffect(() => {
    if (!predictedEmail) return;
    setForm((prev) => {
      if (prev.email.trim()) return prev;
      return { ...prev, email: predictedEmail };
    });
  }, [predictedEmail]);

  const isEditMode = editingStaffId !== null;
  const isDoctorEdit = isEditMode && editingAccountType === "doctor";

  const formErrors = useMemo(() => {
    const result: Record<string, string> = {};
    if (!normalizeName(form.name)) result.name = "Name is required.";
    if (!form.user_code.trim()) result.user_code = "User code is required.";
    if (!/^[A-Z]{3}\d{3}$/.test(form.user_code.trim())) {
      result.user_code = "Format must be 3 letters + 3 digits (e.g., RCP007).";
    }
    if (!isEditMode && (!form.password.trim() || form.password.trim().length < 8)) {
      result.password = "Minimum 8 characters required.";
    }
    if (isEditMode && form.password.trim() && form.password.trim().length < 8) {
      result.password = "If provided, password must be at least 8 characters.";
    }
    if (form.contact_number && !/^[0-9+\-\s()]{7,20}$/.test(form.contact_number)) {
      result.contact_number = "Invalid phone number format.";
    }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      result.email = "Invalid email format.";
    }
    return result;
  }, [form, isEditMode]);

  const canSave = useMemo(() => Object.keys(formErrors).length === 0, [formErrors]);

  const saveStaff = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");
    setResultMessage("");
    try {
      const payload = {
        ...form,
        user_code: form.user_code.toUpperCase().trim(),
        name: normalizeName(form.name),
      };
      const res = await fetch("/api/admin/staff/v2/directory", {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...payload,
          staff_id: editingStaffId,
          account_type: isEditMode ? editingAccountType : "staff",
          password: payload.password?.trim() || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Failed to ${isEditMode ? "update" : "create"} staff profile`);

      setShowCreate(false);
      setEditingStaffId(null);
      setForm({
        name: "",
        user_code: "",
        role: "Receptionist",
        password: "",
        contact_number: "",
        email: "",
        employment_status: "active",
        department: "",
        designation: "",
        facility_code: "",
        branch_code: "",
      });
      await loadRows();
      setResultMessage(isEditMode ? "Staff updated successfully." : "Staff created successfully.");
    } catch (e: any) {
      setError(e?.message || `Failed to ${isEditMode ? "update" : "create"} staff profile`);
    } finally {
      setSaving(false);
    }
  };

  const openEditForm = (row: StaffRow) => {
    setResultMessage("");
    setError("");
    setEditingStaffId(row.staff_id);
    setEditingAccountType(row.account_type === "doctor" ? "doctor" : "staff");
    setForm({
      name: row.name ?? "",
      user_code: row.user_code ?? "",
      role: row.role ?? "Receptionist",
      password: "",
      contact_number: row.contact_number ?? "",
      email: row.email ?? "",
      employment_status: row.employment_status ?? "active",
      department: row.department ?? "",
      designation: row.designation ?? "",
      facility_code: row.facility_code ?? "",
      branch_code: row.branch_code ?? "",
    });
    setShowCreatePassword(false);
    setShowCreate(true);
  };

  const openCreateForm = () => {
    setResultMessage("");
    setError("");
    setEditingStaffId(null);
    setEditingAccountType("staff");
    setShowCreate(true);
    setForm((p) => ({
      ...p,
      role: p.role || "Receptionist",
      user_code: predictedUserCode,
      department: predictedDepartment,
      designation: predictedDesignation,
      password: generateTempPassword(),
    }));
    setShowCreatePassword(false);
  };

  const closeFormModal = () => {
    setShowCreate(false);
    setEditingStaffId(null);
    setEditingAccountType("staff");
    setForm({
      name: "",
      user_code: "",
      role: "Receptionist",
      password: "",
      contact_number: "",
      email: "",
      employment_status: "active",
      department: "",
      designation: "",
      facility_code: "",
      branch_code: "",
    });
  };

  return (
    <div className="space-y-6 py-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Staff Directory</h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">Master records for workforce identity, role and status.</p>
        </div>
        <Button
          onClick={openCreateForm}
          className="bg-none bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-11 px-5 text-xs font-black uppercase tracking-widest shadow-md shadow-emerald-900/20"
        >
          <UserPlus className="w-4 h-4 mr-2" /> Add Staff
        </Button>
      </div>

      {error ? (
        <Card className="border border-red-100 bg-red-50 p-4 rounded-2xl">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </Card>
      ) : null}
      {resultMessage ? (
        <Card className="border border-emerald-100 bg-emerald-50 p-4 rounded-2xl">
          <p className="text-sm font-semibold text-emerald-700">{resultMessage}</p>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 rounded-2xl border border-slate-100"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</p><p className="text-2xl font-black text-slate-800 mt-1">{stats.total}</p></Card>
        <Card className="p-4 rounded-2xl border border-slate-100"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active</p><p className="text-2xl font-black text-emerald-700 mt-1">{stats.active}</p></Card>
        <Card className="p-4 rounded-2xl border border-slate-100"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Suspended</p><p className="text-2xl font-black text-amber-700 mt-1">{stats.suspended}</p></Card>
        <Card className="p-4 rounded-2xl border border-slate-100"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resigned</p><p className="text-2xl font-black text-slate-600 mt-1">{stats.resigned}</p></Card>
      </div>

      <Card className="rounded-3xl border border-slate-100 p-5">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl w-full md:w-[430px]">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, code, designation"
              className="w-full bg-transparent border-none outline-none text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="resigned">Resigned</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/70">
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Staff</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Department</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Facility</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-sm text-slate-500 font-semibold">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-sm text-slate-500 font-semibold">No staff found.</td></tr>
              ) : rows.map((row) => (
                <tr key={`${row.account_type}:${row.staff_id}`} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-slate-800">{row.name}</p>
                    <p className="text-[11px] font-semibold text-slate-500">{row.user_code}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700">{row.role}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700">{row.department || "-"}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700">{row.facility_code || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                      row.employment_status === "active" ? "bg-emerald-50 text-emerald-700" :
                      row.employment_status === "suspended" ? "bg-amber-50 text-amber-700" :
                      row.employment_status === "resigned" ? "bg-slate-100 text-slate-700" :
                      "bg-rose-50 text-rose-700"
                    }`}>
                      {row.employment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      onClick={() => openEditForm(row)}
                      className="h-8 rounded-xl bg-none bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest px-3 shadow-md shadow-emerald-900/20"
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showCreate ? (
        <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl rounded-3xl border border-slate-200 p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/40">
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">{isEditMode ? "Edit Staff" : "Onboard Staff"}</h2>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  {isEditMode
                    ? isDoctorEdit
                      ? "Update doctor information and optionally change password."
                      : "Update staff information and optionally change password."
                    : "Role-based values are auto-assigned."}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">Full Name</label>
                  <input
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm w-full"
                    placeholder="Full Name"
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  />
                  {formErrors.name ? <p className="mt-1 text-[11px] text-rose-600 font-semibold">{formErrors.name}</p> : null}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">User Code</label>
                  <input
                    className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm w-full cursor-not-allowed"
                    placeholder="User Code"
                    autoComplete="off"
                    value={form.user_code}
                    readOnly
                  />
                  {formErrors.user_code ? <p className="mt-1 text-[11px] text-rose-600 font-semibold">{formErrors.user_code}</p> : null}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">Role</label>
                  <select
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm w-full"
                    value={form.role}
                    disabled={isDoctorEdit}
                    onChange={(e) => {
                      const nextRole = e.target.value;
                      if (isEditMode) {
                        setForm((p) => ({
                          ...p,
                          role: nextRole,
                          department: roleDefaults[nextRole]?.department || p.department,
                          designation: roleDefaults[nextRole]?.designation || p.designation,
                        }));
                        return;
                      }
                      const prefix = roleDefaults[nextRole]?.codePrefix ?? "STF";
                      const existing = rows
                        .map((r) => r.user_code)
                        .filter((code) => code.startsWith(prefix))
                        .map((code) => {
                          const match = code.match(new RegExp(`^${prefix}(\\d+)$`));
                          return match ? Number(match[1]) : NaN;
                        })
                        .filter((num) => Number.isFinite(num));
                      const next = (existing.length ? Math.max(...existing) : 0) + 1;
                      const nextCode = `${prefix}${String(next).padStart(3, "0")}`;

                      setForm((p) => ({
                        ...p,
                        role: nextRole,
                        department: roleDefaults[nextRole]?.department || "",
                        designation: roleDefaults[nextRole]?.designation || "",
                        user_code: nextCode,
                      }));
                    }}
                  >
                    {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                    {isEditMode ? "New Password (Optional)" : "Temporary Password"}
                  </label>
                  <div className="relative">
                    <input
                      className="h-11 rounded-xl border border-slate-200 px-3 pr-11 text-sm w-full"
                      type={showCreatePassword ? "text" : "password"}
                      placeholder={isEditMode ? "Leave blank to keep current password" : "Temporary Password"}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      aria-label={showCreatePassword ? "Hide password" : "Show password"}
                    >
                      {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formErrors.password ? <p className="mt-1 text-[11px] text-rose-600 font-semibold">{formErrors.password}</p> : null}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">Department</label>
                  <select
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm w-full"
                    value={form.department}
                    onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                  >
                    {!form.department ? <option value="">Select Department</option> : null}
                    {[...new Set([form.department, ...uniqueDepartments].filter(Boolean))].map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">Designation</label>
                  <select
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm w-full"
                    value={form.designation}
                    onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))}
                  >
                    {!form.designation ? <option value="">Select Designation</option> : null}
                    {[...new Set([form.designation, ...uniqueDesignations].filter(Boolean))].map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">Facility Code</label>
                  <input
                    list="facility-suggestions"
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm w-full"
                    placeholder="Facility Code"
                    autoComplete="off"
                    value={form.facility_code}
                    onChange={(e) => setForm((p) => ({ ...p, facility_code: e.target.value.toUpperCase() }))}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">Branch Code</label>
                  <input
                    list="branch-suggestions"
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm w-full"
                    placeholder="Branch Code"
                    autoComplete="off"
                    value={form.branch_code}
                    onChange={(e) => setForm((p) => ({ ...p, branch_code: e.target.value.toUpperCase() }))}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">Contact Number</label>
                  <input
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm w-full"
                    placeholder="Contact Number"
                    autoComplete="tel"
                    value={form.contact_number}
                    onChange={(e) => setForm((p) => ({ ...p, contact_number: e.target.value }))}
                  />
                  {formErrors.contact_number ? <p className="mt-1 text-[11px] text-rose-600 font-semibold">{formErrors.contact_number}</p> : null}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">Email</label>
                  <input
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm w-full"
                    placeholder="Email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  />
                  {formErrors.email ? <p className="mt-1 text-[11px] text-rose-600 font-semibold">{formErrors.email}</p> : null}
                </div>
              </div>

              <datalist id="facility-suggestions">
                {uniqueFacilities.map((value) => <option key={value} value={value} />)}
              </datalist>
              <datalist id="branch-suggestions">
                {uniqueBranches.map((value) => <option key={value} value={value} />)}
              </datalist>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <Button onClick={closeFormModal} className="bg-slate-200 text-slate-800 hover:bg-slate-300 rounded-xl px-4">Cancel</Button>
              <Button
                disabled={saving || !canSave}
                onClick={saveStaff}
                className="bg-none bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl px-4 shadow-md shadow-emerald-900/20"
              >
                {saving ? "Saving..." : isEditMode ? "Save Changes" : "Create Staff"}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      <Card className="rounded-2xl border border-slate-100 p-4 bg-slate-50">
        <div className="flex items-start gap-3 text-slate-600">
          <Users className="w-4 h-4 mt-0.5" />
          <p className="text-xs font-semibold">
            Onboarding modal now supports smart prediction and auto-complete based on existing directory data.
          </p>
        </div>
      </Card>
    </div>
  );
}
