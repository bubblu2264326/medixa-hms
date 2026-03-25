"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";
import { formatDateInTimezone, getTimezoneNowDateInput } from "@/src/lib/timezone/client";
import { BarRankingSvg } from "@/src/components/admin/analytics/BarRankingSvg";
import { DonutSvg } from "@/src/components/admin/analytics/DonutSvg";
import { LineChartSvg } from "@/src/components/admin/analytics/LineChartSvg";
import { StackedBarSvg } from "@/src/components/admin/analytics/StackedBarSvg";

type DirectoryRow = {
  account_type?: "staff" | "doctor";
  staff_id: number;
  name: string;
  user_code: string;
  role?: string;
  employment_status?: string;
};

type EmployeeScoreRow = {
  account_type: "staff" | "doctor";
  person_id: number;
  user_code: string;
  name: string;
  role: string;
  department: string | null;
  attendance_marks: number;
  attendance_present_like: number;
  leave_pending: number;
  payroll_net_total: number;
  score: number;
  score_breakdown: Record<string, number>;
};

type AnalyticsPayload = {
  filters: Record<string, any>;
  overview: {
    kpis: Record<string, number>;
    role_mix: Array<{ label: string; value: number }>;
    alerts: Array<{ id: string; severity: string; title: string; count: number; description: string }>;
    trend_snapshots: {
      attendance: Array<{ bucket: string; marks: number; present_like: number; rate_percent: number; on_time: number; late: number; absent: number }>;
      leave: Array<{ bucket: string; total: number; pending: number; approved: number; rejected: number }>;
    };
  };
  performance: {
    score_distribution: Array<{ label: string; value: number }>;
    top_performers: EmployeeScoreRow[];
    bottom_performers: EmployeeScoreRow[];
    punctuality_breakdown: Array<{ label: string; value: number }>;
  };
  finance: {
    totals: Record<string, number>;
    payroll_trend: Array<{ bucket: string; net_total: number; gross_total: number }>;
    compensation_distribution: Array<{ label: string; value: number }>;
    salary_model_mix: Array<{ label: string; value: number }>;
  } | null;
  employee_explorer: {
    selected_employee: EmployeeScoreRow | null;
    selected_insights?: {
      attendance_rate_percent: number;
      punctuality_percent: number;
      absence_percent: number;
      compliance_risk_count: number;
    } | null;
    selected_attendance_trend: Array<{ bucket: string; marks: number; present_like: number; rate_percent: number }>;
    selected_leave_trend: Array<{ bucket: string; total: number; pending: number; approved: number; rejected: number }>;
  };
};

type EmployeeListPayload = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  items: EmployeeScoreRow[];
};

type ScoreConfigResponse = {
  config: {
    version: number;
    factors: {
      attendance_reliability: { weight: number; enabled: boolean };
      punctuality: { weight: number; enabled: boolean };
      leave_discipline: { weight: number; enabled: boolean };
      correction_burden: { weight: number; enabled: boolean };
      compliance_hygiene: { weight: number; enabled: boolean };
    };
  };
  defaults?: {
    version: number;
    factors: {
      attendance_reliability: { weight: number; enabled: boolean };
      punctuality: { weight: number; enabled: boolean };
      leave_discipline: { weight: number; enabled: boolean };
      correction_burden: { weight: number; enabled: boolean };
      compliance_hygiene: { weight: number; enabled: boolean };
    };
  };
};

function numberValue(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function StaffAnalyticsPage() {
  const systemTimezone = useSystemTimezone();
  const today = getTimezoneNowDateInput(systemTimezone);
  const defaultFrom = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(today);
  const [accountType, setAccountType] = useState<"all" | "staff" | "doctor">("all");
  const [roleLens, setRoleLens] = useState<"all" | "staff" | "doctor">("all");
  const [bucket, setBucket] = useState<"day" | "week" | "month">("week");
  const [department, setDepartment] = useState("");
  const [facilityCode, setFacilityCode] = useState("");

  const [directory, setDirectory] = useState<DirectoryRow[]>([]);
  const [employeeKey, setEmployeeKey] = useState("");

  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeePage, setEmployeePage] = useState(1);
  const [employeeSortBy, setEmployeeSortBy] = useState("score");
  const [employeeSortDir, setEmployeeSortDir] = useState<"asc" | "desc">("desc");

  const [payload, setPayload] = useState<AnalyticsPayload | null>(null);
  const [employeeRows, setEmployeeRows] = useState<EmployeeListPayload | null>(null);
  const [scoreConfig, setScoreConfig] = useState<ScoreConfigResponse["config"] | null>(null);
  const [defaultScoreConfig, setDefaultScoreConfig] = useState<ScoreConfigResponse["defaults"] | null>(null);
  const [savingScoreConfig, setSavingScoreConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [error, setError] = useState("");
  const [debouncedEmployeeSearch, setDebouncedEmployeeSearch] = useState("");

  const selectedEmployee = useMemo(
    () => directory.find((row) => `${row.account_type ?? "staff"}:${row.staff_id}` === employeeKey) ?? null,
    [directory, employeeKey]
  );

  const employeeFilter = useMemo(() => {
    if (!employeeKey) return { accountType: null as "staff" | "doctor" | null, personId: null as number | null };
    const [acc, idRaw] = employeeKey.split(":");
    const id = Number(idRaw);
    if ((acc === "staff" || acc === "doctor") && Number.isFinite(id) && id > 0) {
      return { accountType: acc, personId: id };
    }
    return { accountType: null as "staff" | "doctor" | null, personId: null as number | null };
  }, [employeeKey]);

  const buildBaseParams = () => {
    const params = new URLSearchParams({
      from: fromDate,
      to: toDate,
      account_type: accountType,
      role_lens: roleLens,
      bucket,
      include_finance: "true",
    });
    if (department.trim()) params.set("department", department.trim());
    if (facilityCode.trim()) params.set("facility_code", facilityCode.trim());
    if (employeeFilter.accountType && employeeFilter.personId) {
      params.set("employee_account_type", employeeFilter.accountType);
      params.set("employee_person_id", String(employeeFilter.personId));
    }
    return params;
  };

  const loadDirectory = async () => {
    const res = await fetch("/api/admin/staff/v2/directory", { credentials: "include" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load employee directory");

    const rows = (Array.isArray(data) ? data : []).filter((row: any) => {
      if (!row?.staff_id) return false;
      const state = String(row?.employment_status ?? "").toLowerCase();
      return state === "active" || row?.account_type === "doctor";
    });

    setDirectory(rows);
  };

  const loadScoreConfig = async () => {
    const res = await fetch("/api/admin/staff/v2/analytics/config", { credentials: "include" });
    const data: any = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load score configuration");
    setScoreConfig(data?.config ?? null);
    setDefaultScoreConfig(data?.defaults ?? null);
  };

  const saveScoreConfig = async () => {
    if (!scoreConfig) return;
    setSavingScoreConfig(true);
    try {
      const res = await fetch("/api/admin/staff/v2/analytics/config", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: scoreConfig }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update score configuration");
      setScoreConfig(data?.config ?? scoreConfig);
      await loadDashboard();
      await loadEmployeeRows();
    } catch (e: any) {
      setError(e?.message || "Failed to update score configuration");
    } finally {
      setSavingScoreConfig(false);
    }
  };

  const exportExplorerCsv = () => {
    const rows = employeeRows?.items ?? [];
    const headers = [
      "account_type",
      "person_id",
      "user_code",
      "name",
      "role",
      "department",
      "attendance_marks",
      "attendance_present_like",
      "leave_pending",
      "payroll_net_total",
      "score",
    ];
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        [
          row.account_type,
          row.person_id,
          row.user_code,
          `"${String(row.name ?? "").replace(/"/g, '""')}"`,
          `"${String(row.role ?? "").replace(/"/g, '""')}"`,
          `"${String(row.department ?? "").replace(/"/g, '""')}"`,
          row.attendance_marks,
          row.attendance_present_like,
          row.leave_pending,
          row.payroll_net_total,
          row.score,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workforce-analytics-explorer-${fromDate}-to-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExplorerPdf = () => {
    const rows = employeeRows?.items ?? [];
    const dateText = `${fromDate} to ${toDate}`;
    const filterText = `Account: ${accountType.toUpperCase()} | Role Lens: ${roleLens.toUpperCase()} | Bucket: ${bucket.toUpperCase()}`;

    const bodyRows = rows
      .map(
        (row) => `
          <tr>
            <td>${row.name} (${row.user_code})</td>
            <td>${row.account_type.toUpperCase()}</td>
            <td>${row.department ?? row.role}</td>
            <td>${row.attendance_present_like}/${row.attendance_marks}</td>
            <td>${row.leave_pending}</td>
            <td>${numberValue(row.payroll_net_total).toLocaleString()}</td>
            <td>${numberValue(row.score).toFixed(2)}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <html>
      <head>
        <title>Workforce Explorer Export</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; }
          h1 { margin: 0 0 8px; font-size: 20px; }
          p { margin: 2px 0; color: #475569; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          th { background: #f1f5f9; font-weight: 700; }
        </style>
      </head>
      <body>
        <h1>Workforce Analytics - Employee Explorer</h1>
        <p>Date Range: ${dateText}</p>
        <p>${filterText}</p>
        <p>Total Rows: ${rows.length}</p>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Type</th>
              <th>Department</th>
              <th>Attendance</th>
              <th>Leave Pending</th>
              <th>Payroll Net</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            ${bodyRows || `<tr><td colspan="7">No rows in current explorer page.</td></tr>`}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=1100,height=800");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const params = buildBaseParams();
      params.set("view", "overview");
      params.set("page", String(employeePage));
      params.set("page_size", "20");
      params.set("sort_by", employeeSortBy);
      params.set("sort_dir", employeeSortDir);
      if (debouncedEmployeeSearch) params.set("employee_search", debouncedEmployeeSearch);

      const res = await fetch(`/api/admin/staff/v2/analytics?${params.toString()}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load workforce analytics");
      setPayload(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load workforce analytics");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeRows = async () => {
    setLoadingEmployees(true);
    try {
      const params = buildBaseParams();
      params.set("page", String(employeePage));
      params.set("page_size", "12");
      params.set("sort_by", employeeSortBy);
      params.set("sort_dir", employeeSortDir);
      if (debouncedEmployeeSearch) params.set("employee_search", debouncedEmployeeSearch);

      const res = await fetch(`/api/admin/staff/v2/analytics/employees?${params.toString()}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load employee analytics list");
      setEmployeeRows(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load employee analytics list");
      setEmployeeRows(null);
    } finally {
      setLoadingEmployees(false);
    }
  };

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedEmployeeSearch(employeeSearch.trim()), 300);
    return () => clearTimeout(handle);
  }, [employeeSearch]);

  useEffect(() => {
    loadDirectory().catch((e: any) => setError(e?.message || "Failed to load employee directory"));
    loadScoreConfig().catch((e: any) => setError(e?.message || "Failed to load score configuration"));
  }, []);

  useEffect(() => {
    loadDashboard();
    loadEmployeeRows();
  }, [fromDate, toDate, accountType, roleLens, bucket, department, facilityCode, employeeKey, employeePage, employeeSortBy, employeeSortDir, debouncedEmployeeSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const attendancePoints = useMemo(
    () => (payload?.overview?.trend_snapshots?.attendance ?? []).map((row) => ({
      label: formatDateInTimezone(row.bucket, systemTimezone),
      marks: numberValue(row.marks),
      present_like: numberValue(row.present_like),
      rate_percent: numberValue(row.rate_percent),
    })),
    [payload, systemTimezone]
  );

  const leavePoints = useMemo(
    () => (payload?.overview?.trend_snapshots?.leave ?? []).map((row) => ({
      label: formatDateInTimezone(row.bucket, systemTimezone),
      total: numberValue(row.total),
      approved: numberValue(row.approved),
      pending: numberValue(row.pending),
      rejected: numberValue(row.rejected),
    })),
    [payload, systemTimezone]
  );

  const financePoints = useMemo(
    () => (payload?.finance?.payroll_trend ?? []).map((row) => ({
      label: formatDateInTimezone(row.bucket, systemTimezone),
      net: numberValue(row.net_total),
      gross: numberValue(row.gross_total),
    })),
    [payload, systemTimezone]
  );

  const kpis = payload?.overview?.kpis ?? {};
  const factorKeys = scoreConfig ? Object.keys(scoreConfig.factors) : [];

  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Workforce Analytics Studio</h1>
        <p className="text-sm text-slate-500 font-semibold mt-1">
          Hybrid operational + executive analytics across attendance, performance, compliance, and finance.
        </p>
      </div>

      {error ? (
        <Card className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </Card>
      ) : null}

      <Card className="rounded-3xl border border-slate-100 p-5">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-3">Global Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-2">
          <input type="date" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <input type="date" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />

          <select className="h-10 rounded-xl border border-slate-200 px-3 text-sm" value={accountType} onChange={(e) => setAccountType(e.target.value as "all" | "staff" | "doctor") }>
            <option value="all">Account: Staff + Doctor</option>
            <option value="staff">Account: Staff Only</option>
            <option value="doctor">Account: Doctor Only</option>
          </select>

          <select className="h-10 rounded-xl border border-slate-200 px-3 text-sm" value={roleLens} onChange={(e) => setRoleLens(e.target.value as "all" | "staff" | "doctor") }>
            <option value="all">Role lens: Combined</option>
            <option value="staff">Role lens: Staff</option>
            <option value="doctor">Role lens: Doctor</option>
          </select>

          <select className="h-10 rounded-xl border border-slate-200 px-3 text-sm" value={bucket} onChange={(e) => setBucket(e.target.value as "day" | "week" | "month") }>
            <option value="week">Bucket: Weekly</option>
            <option value="day">Bucket: Daily</option>
            <option value="month">Bucket: Monthly</option>
          </select>

          <select
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            value={employeeKey}
            onChange={(e) => {
              const next = e.target.value;
              setEmployeeKey(next);
              if (next) {
                const [acc] = next.split(":");
                if (acc === "staff" || acc === "doctor") {
                  setAccountType(acc);
                  setRoleLens(acc);
                }
              }
            }}
          >
            <option value="">Any employee</option>
            {directory.map((row) => (
              <option key={`${row.account_type ?? "staff"}:${row.staff_id}`} value={`${row.account_type ?? "staff"}:${row.staff_id}`}>
                {row.name} ({row.user_code}) - {row.account_type === "doctor" ? "Doctor" : row.role || "Staff"}
              </option>
            ))}
          </select>

          <input className="h-10 rounded-xl border border-slate-200 px-3 text-sm" placeholder="Department (optional)" value={department} onChange={(e) => setDepartment(e.target.value)} />
          <input className="h-10 rounded-xl border border-slate-200 px-3 text-sm" placeholder="Facility code (optional)" value={facilityCode} onChange={(e) => setFacilityCode(e.target.value)} />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button disabled={loading} onClick={loadDashboard} className="h-10 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-widest px-4">
            {loading ? "Refreshing..." : "Refresh Dashboard"}
          </Button>
          {selectedEmployee ? (
            <p className="text-xs font-semibold text-slate-500">
              Selected: {selectedEmployee.name} ({selectedEmployee.user_code})
            </p>
          ) : null}
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
          <Card className="rounded-2xl p-3"><p className="text-[10px] font-black uppercase text-slate-400">Employees</p><p className="text-xl font-black text-slate-800">{numberValue(kpis.total_employees)}</p></Card>
          <Card className="rounded-2xl p-3"><p className="text-[10px] font-black uppercase text-slate-400">Attendance %</p><p className="text-xl font-black text-emerald-700">{numberValue(kpis.attendance_rate_percent)}</p></Card>
          <Card className="rounded-2xl p-3"><p className="text-[10px] font-black uppercase text-slate-400">Pending Leave</p><p className="text-xl font-black text-amber-700">{numberValue(kpis.leave_pending)}</p></Card>
          <Card className="rounded-2xl p-3"><p className="text-[10px] font-black uppercase text-slate-400">Active Sessions</p><p className="text-xl font-black text-slate-800">{numberValue(kpis.active_sessions)}</p></Card>
          <Card className="rounded-2xl p-3"><p className="text-[10px] font-black uppercase text-slate-400">Expired Cred</p><p className="text-xl font-black text-rose-700">{numberValue(kpis.expired_credentials)}</p></Card>
          <Card className="rounded-2xl p-3"><p className="text-[10px] font-black uppercase text-slate-400">Expired Docs</p><p className="text-xl font-black text-rose-700">{numberValue(kpis.expired_documents)}</p></Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <LineChartSvg
            title="Attendance Trend"
            points={attendancePoints}
            series={[
              { key: "marks", label: "Marks", color: "#334155" },
              { key: "present_like", label: "Present-Like", color: "#0f766e" },
            ]}
          />

          <LineChartSvg
            title="Leave Trend"
            points={leavePoints}
            series={[
              { key: "total", label: "Total", color: "#334155" },
              { key: "approved", label: "Approved", color: "#16a34a" },
              { key: "pending", label: "Pending", color: "#d97706" },
            ]}
          />

          <DonutSvg
            title="Role Composition"
            segments={(payload?.overview?.role_mix ?? []).map((item, i) => ({
              label: item.label,
              value: numberValue(item.value),
              color: i === 0 ? "#0f766e" : "#1d4ed8",
            }))}
          />
        </div>

        <Card className="rounded-2xl border border-slate-100 p-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Operational Alerts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
            {(payload?.overview?.alerts ?? []).map((alert) => (
              <div key={alert.id} className="rounded-xl border border-slate-100 p-3 bg-slate-50/70">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{alert.title}</p>
                <p className="text-lg font-black text-slate-800">{alert.count}</p>
                <p className="text-[11px] font-semibold text-slate-500">{alert.description}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Performance</h2>
        <Card className="rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Scorecard Weights</h3>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => {
                  if (defaultScoreConfig) {
                    setScoreConfig(defaultScoreConfig);
                  }
                }}
                disabled={!defaultScoreConfig || savingScoreConfig}
                className="h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-black uppercase tracking-wide px-3 disabled:opacity-50"
              >
                Reset Defaults
              </Button>
              <Button
                type="button"
                onClick={saveScoreConfig}
                disabled={!scoreConfig || savingScoreConfig}
                className="h-8 rounded-lg bg-slate-900 hover:bg-black text-white text-[11px] font-black uppercase tracking-wide px-3 disabled:opacity-50"
              >
                {savingScoreConfig ? "Saving..." : "Save Weights"}
              </Button>
            </div>
          </div>
          {scoreConfig ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              {factorKeys.map((factorKey) => {
                const factor = scoreConfig.factors[factorKey as keyof typeof scoreConfig.factors];
                const label = factorKey.replaceAll("_", " ");
                return (
                  <div key={factorKey} className="rounded-xl border border-slate-100 p-3 bg-slate-50/60">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">{label}</p>
                    <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600 mb-2">
                      <input
                        type="checkbox"
                        checked={factor.enabled}
                        onChange={(e) =>
                          setScoreConfig((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  factors: {
                                    ...prev.factors,
                                    [factorKey]: { ...prev.factors[factorKey as keyof typeof prev.factors], enabled: e.target.checked },
                                  },
                                }
                              : prev
                          )
                        }
                      />
                      Enabled
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={factor.weight}
                      disabled={!factor.enabled}
                      onChange={(e) =>
                        setScoreConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                factors: {
                                  ...prev.factors,
                                  [factorKey]: {
                                    ...prev.factors[factorKey as keyof typeof prev.factors],
                                    weight: Number(e.target.value),
                                  },
                                },
                              }
                            : prev
                        )
                      }
                      className="w-full"
                    />
                    <p className="text-[11px] font-black text-slate-700 mt-1">{factor.weight}%</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs font-semibold text-slate-500">Loading score configuration...</p>
          )}
        </Card>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <StackedBarSvg
            title="Score Distribution"
            rows={[{ label: "Score bands", ...(payload?.performance?.score_distribution ?? []).reduce((acc: any, row) => ({ ...acc, [row.label]: row.value }), {}) }]}
            segments={(payload?.performance?.score_distribution ?? []).map((row, index) => ({
              key: row.label,
              label: row.label,
              color: ["#16a34a", "#0ea5e9", "#f59e0b", "#ef4444"][index % 4],
            }))}
            maxRows={1}
          />

          <BarRankingSvg
            title="Top Performers"
            rows={(payload?.performance?.top_performers ?? []).map((row) => ({
              label: `${row.name} (${row.user_code})`,
              value: numberValue(row.score),
              meta: `${row.account_type.toUpperCase()} • ${row.department ?? row.role}`,
            }))}
            color="#15803d"
          />

          <BarRankingSvg
            title="Bottom Performers"
            rows={(payload?.performance?.bottom_performers ?? []).map((row) => ({
              label: `${row.name} (${row.user_code})`,
              value: numberValue(row.score),
              meta: `${row.account_type.toUpperCase()} • ${row.department ?? row.role}`,
            }))}
            color="#dc2626"
          />
        </div>

        <DonutSvg
          title="Punctuality Breakdown"
          segments={(payload?.performance?.punctuality_breakdown ?? []).map((row, i) => ({
            label: row.label,
            value: numberValue(row.value),
            color: ["#16a34a", "#f59e0b", "#ef4444"][i % 3],
          }))}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Finance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="rounded-2xl p-3"><p className="text-[10px] font-black uppercase text-slate-400">Payroll Net</p><p className="text-lg font-black text-slate-800">{numberValue(payload?.finance?.totals?.payroll_net_total).toLocaleString()}</p></Card>
          <Card className="rounded-2xl p-3"><p className="text-[10px] font-black uppercase text-slate-400">Payroll Gross</p><p className="text-lg font-black text-slate-800">{numberValue(payload?.finance?.totals?.payroll_gross_total).toLocaleString()}</p></Card>
          <Card className="rounded-2xl p-3"><p className="text-[10px] font-black uppercase text-slate-400">Avg Net / Employee</p><p className="text-lg font-black text-slate-800">{numberValue(payload?.finance?.totals?.avg_net_pay_per_employee).toLocaleString()}</p></Card>
          <Card className="rounded-2xl p-3"><p className="text-[10px] font-black uppercase text-slate-400">Cost / Attendance Mark</p><p className="text-lg font-black text-slate-800">{numberValue(kpis.cost_per_attendance_mark).toLocaleString()}</p></Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <LineChartSvg
            title="Payroll Trend"
            points={financePoints}
            series={[
              { key: "net", label: "Net", color: "#0f766e" },
              { key: "gross", label: "Gross", color: "#1d4ed8" },
            ]}
          />

          <DonutSvg
            title="Compensation Distribution"
            segments={(payload?.finance?.compensation_distribution ?? []).map((row, i) => ({
              label: row.label,
              value: numberValue(row.value),
              color: ["#0f766e", "#0284c7", "#d97706", "#dc2626"][i % 4],
            }))}
          />

          <DonutSvg
            title="Salary Model Mix"
            segments={(payload?.finance?.salary_model_mix ?? []).map((row, i) => ({
              label: row.label,
              value: numberValue(row.value),
              color: i === 0 ? "#0f766e" : "#7c3aed",
            }))}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Employee Explorer</h2>

        <Card className="rounded-2xl border border-slate-100 p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <input
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
              placeholder="Search name or code"
              value={employeeSearch}
              onChange={(e) => {
                setEmployeeSearch(e.target.value);
                setEmployeePage(1);
              }}
            />
            <select className="h-10 rounded-xl border border-slate-200 px-3 text-sm" value={employeeSortBy} onChange={(e) => setEmployeeSortBy(e.target.value)}>
              <option value="score">Sort by score</option>
              <option value="attendance_marks">Sort by attendance marks</option>
              <option value="leave_pending">Sort by pending leave</option>
              <option value="payroll_net_total">Sort by payroll net</option>
              <option value="name">Sort by name</option>
            </select>
            <select className="h-10 rounded-xl border border-slate-200 px-3 text-sm" value={employeeSortDir} onChange={(e) => setEmployeeSortDir(e.target.value as "asc" | "desc") }>
              <option value="desc">High to low</option>
              <option value="asc">Low to high</option>
            </select>
            <Button onClick={() => { loadEmployeeRows(); loadDashboard(); }} className="h-10 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-widest px-4" disabled={loadingEmployees}>
              {loadingEmployees ? "Loading..." : "Refresh Explorer"}
            </Button>
            <Button
              type="button"
              onClick={exportExplorerCsv}
              className="h-10 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-black uppercase tracking-widest px-4"
            >
              Export CSV
            </Button>
            <Button
              type="button"
              onClick={exportExplorerPdf}
              className="h-10 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-black uppercase tracking-widest px-4"
            >
              Export PDF
            </Button>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="bg-slate-50/70">
                  <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Employee</th>
                  <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                  <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Department</th>
                  <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Attendance</th>
                  <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Leave Pending</th>
                  <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Payroll Net</th>
                  <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Score</th>
                  <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {(employeeRows?.items ?? []).length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-8 text-sm font-semibold text-slate-500">No employees found for current filters.</td></tr>
                ) : (
                  (employeeRows?.items ?? []).map((row) => (
                    <tr key={`${row.account_type}:${row.person_id}`} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-xs font-semibold text-slate-700">{row.name} ({row.user_code})</td>
                      <td className="px-3 py-2 text-xs font-semibold text-slate-700 uppercase">{row.account_type}</td>
                      <td className="px-3 py-2 text-xs font-semibold text-slate-700">{row.department ?? row.role}</td>
                      <td className="px-3 py-2 text-xs font-semibold text-slate-700">{row.attendance_present_like}/{row.attendance_marks}</td>
                      <td className="px-3 py-2 text-xs font-semibold text-amber-700">{row.leave_pending}</td>
                      <td className="px-3 py-2 text-xs font-semibold text-slate-700">{numberValue(row.payroll_net_total).toLocaleString()}</td>
                      <td className="px-3 py-2 text-xs font-black text-emerald-700">{numberValue(row.score).toFixed(2)}</td>
                      <td className="px-3 py-2 text-xs font-semibold text-slate-700">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 px-2 py-1 hover:bg-slate-50"
                          onClick={() => {
                            setEmployeeKey(`${row.account_type}:${row.person_id}`);
                            setAccountType(row.account_type);
                            setRoleLens(row.account_type);
                          }}
                        >
                          Drill in
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">
              Page {employeeRows?.page ?? 1} of {employeeRows?.total_pages ?? 1} ({employeeRows?.total ?? 0} records)
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                disabled={(employeeRows?.page ?? 1) <= 1}
                onClick={() => setEmployeePage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button
                type="button"
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                disabled={(employeeRows?.page ?? 1) >= (employeeRows?.total_pages ?? 1)}
                onClick={() => setEmployeePage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>

        {payload?.employee_explorer?.selected_employee ? (
          <Card className="rounded-2xl border border-slate-100 p-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Selected Employee Drill-Down</h3>
            <p className="text-sm font-semibold text-slate-700 mb-3">
              {payload.employee_explorer.selected_employee.name} ({payload.employee_explorer.selected_employee.user_code}) • Score {numberValue(payload.employee_explorer.selected_employee.score).toFixed(2)}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              <div className="rounded-xl border border-slate-100 p-2 bg-slate-50/70">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Attendance %</p>
                <p className="text-sm font-black text-emerald-700">{numberValue(payload.employee_explorer.selected_insights?.attendance_rate_percent).toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 p-2 bg-slate-50/70">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Punctuality %</p>
                <p className="text-sm font-black text-emerald-700">{numberValue(payload.employee_explorer.selected_insights?.punctuality_percent).toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 p-2 bg-slate-50/70">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Absence %</p>
                <p className="text-sm font-black text-rose-700">{numberValue(payload.employee_explorer.selected_insights?.absence_percent).toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 p-2 bg-slate-50/70">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Compliance Risk</p>
                <p className="text-sm font-black text-amber-700">{numberValue(payload.employee_explorer.selected_insights?.compliance_risk_count)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <LineChartSvg
                title="Selected Attendance Trend"
                points={(payload.employee_explorer.selected_attendance_trend ?? []).map((row) => ({
                  label: formatDateInTimezone(row.bucket, systemTimezone),
                  marks: numberValue(row.marks),
                  present_like: numberValue(row.present_like),
                }))}
                series={[
                  { key: "marks", label: "Marks", color: "#334155" },
                  { key: "present_like", label: "Present-Like", color: "#0f766e" },
                ]}
              />
              <LineChartSvg
                title="Selected Leave Trend"
                points={(payload.employee_explorer.selected_leave_trend ?? []).map((row) => ({
                  label: formatDateInTimezone(row.bucket, systemTimezone),
                  total: numberValue(row.total),
                  approved: numberValue(row.approved),
                  pending: numberValue(row.pending),
                }))}
                series={[
                  { key: "total", label: "Total", color: "#334155" },
                  { key: "approved", label: "Approved", color: "#16a34a" },
                  { key: "pending", label: "Pending", color: "#d97706" },
                ]}
              />
            </div>
          </Card>
        ) : null}
      </section>

      <details className="rounded-2xl border border-slate-100 bg-white p-4">
        <summary className="cursor-pointer text-xs font-black uppercase tracking-wider text-slate-500">Show Raw Trend Tables</summary>
        <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card className="rounded-2xl border border-slate-100 p-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Attendance Trend Rows</h3>
            <div className="overflow-auto max-h-72">
              <table className="w-full text-left min-w-[520px]">
                <thead>
                  <tr className="bg-slate-50/70">
                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Bucket</th>
                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Marks</th>
                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Present</th>
                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {attendancePoints.map((row) => (
                    <tr key={`att-${row.label}`} className="border-t border-slate-100">
                      <td className="px-2 py-1 text-xs font-semibold text-slate-700">{row.label}</td>
                      <td className="px-2 py-1 text-xs font-semibold text-slate-700">{numberValue(row.marks)}</td>
                      <td className="px-2 py-1 text-xs font-semibold text-slate-700">{numberValue(row.present_like)}</td>
                      <td className="px-2 py-1 text-xs font-semibold text-slate-700">{numberValue(row.rate_percent).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="rounded-2xl border border-slate-100 p-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Leave Trend Rows</h3>
            <div className="overflow-auto max-h-72">
              <table className="w-full text-left min-w-[520px]">
                <thead>
                  <tr className="bg-slate-50/70">
                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Bucket</th>
                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Total</th>
                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Pending</th>
                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Approved</th>
                  </tr>
                </thead>
                <tbody>
                  {leavePoints.map((row) => (
                    <tr key={`leave-${row.label}`} className="border-t border-slate-100">
                      <td className="px-2 py-1 text-xs font-semibold text-slate-700">{row.label}</td>
                      <td className="px-2 py-1 text-xs font-semibold text-slate-700">{numberValue(row.total)}</td>
                      <td className="px-2 py-1 text-xs font-semibold text-slate-700">{numberValue(row.pending)}</td>
                      <td className="px-2 py-1 text-xs font-semibold text-slate-700">{numberValue(row.approved)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </details>
    </div>
  );
}
