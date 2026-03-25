"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { getTimezoneNowMonthInput } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

type PayrollRun = {
  payroll_run_id: number;
  period_month: string;
  status: "draft" | "finalized" | "void";
  line_count?: number;
  total_net_amount?: number | string;
  generated_at?: string;
};

type PayrollLine = {
  payroll_line_id: number;
  account_type: "staff" | "doctor";
  user_code?: string | null;
  person_name?: string | null;
  salary_model: "fixed_monthly" | "per_patient_seen";
  base_amount: number | string;
  allowance_total: number | string;
  deduction_total: number | string;
  adjustment_total: number | string;
  net_amount: number | string;
  patient_count?: number | null;
};

export default function PayrollRunsPage() {
  const systemTimezone = useSystemTimezone();
  const monthValue = useMemo(() => getTimezoneNowMonthInput(systemTimezone), [systemTimezone]);
  const [month, setMonth] = useState(monthValue);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [lines, setLines] = useState<PayrollLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, line) => {
        acc.base += Number(line.base_amount ?? 0);
        acc.allowance += Number(line.allowance_total ?? 0);
        acc.deduction += Number(line.deduction_total ?? 0);
        acc.adjustment += Number(line.adjustment_total ?? 0);
        acc.net += Number(line.net_amount ?? 0);
        return acc;
      },
      { base: 0, allowance: 0, deduction: 0, adjustment: 0, net: 0 }
    );
  }, [lines]);

  const loadRuns = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/payroll/runs", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load payroll runs");
      const nextRuns = Array.isArray(data) ? data : [];
      setRuns(nextRuns);
      if (!selectedRunId && nextRuns[0]?.payroll_run_id) {
        setSelectedRunId(Number(nextRuns[0].payroll_run_id));
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load payroll runs");
      setRuns([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRunDetail = async (runId: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/payroll/runs/${runId}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load payroll run");
      setSelectedRun(data?.run ?? null);
      setLines(Array.isArray(data?.lines) ? data.lines : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load payroll run");
      setSelectedRun(null);
      setLines([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  useEffect(() => {
    setMonth(monthValue);
  }, [monthValue]);

  useEffect(() => {
    if (selectedRunId) loadRunDetail(selectedRunId);
  }, [selectedRunId]);

  const generateRun = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/payroll/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ month }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to generate payroll");
      await loadRuns();
      if (data?.payroll_run_id) setSelectedRunId(Number(data.payroll_run_id));
    } catch (e: any) {
      setError(e?.message || "Failed to generate payroll");
    } finally {
      setBusy(false);
    }
  };

  const updateRun = async (action: "finalize" | "void") => {
    if (!selectedRunId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/payroll/runs/${selectedRunId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Failed to ${action} payroll run`);
      setSelectedRun(data);
      await loadRuns();
    } catch (e: any) {
      setError(e?.message || `Failed to ${action} payroll run`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Payroll Runs</h1>
        <p className="text-sm text-slate-500 font-semibold mt-1">
          Generate month-wise payroll, review lines, and finalize after validation.
        </p>
      </div>

      {error ? (
        <Card className="border border-red-100 bg-red-50 p-4 rounded-2xl">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </Card>
      ) : null}

      <Card className="rounded-3xl border border-slate-100 p-5 space-y-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Generate Payroll</h2>
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
          />
          <Button
            onClick={generateRun}
            disabled={busy}
            className="h-10 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-widest px-4"
          >
            {busy ? "Generating..." : "Generate / Regenerate"}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <Card className="lg:col-span-2 rounded-3xl border border-slate-100 p-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-3">Runs</h2>
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {loading && runs.length === 0 ? (
              <p className="text-sm text-slate-500 font-semibold">Loading runs...</p>
            ) : runs.length === 0 ? (
              <p className="text-sm text-slate-500 font-semibold">No payroll runs available.</p>
            ) : (
              runs.map((run) => {
                const active = selectedRunId === Number(run.payroll_run_id);
                return (
                  <button
                    key={run.payroll_run_id}
                    onClick={() => setSelectedRunId(Number(run.payroll_run_id))}
                    className={`w-full text-left rounded-2xl border p-3 transition ${
                      active ? "border-slate-900 bg-slate-50" : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <p className="text-xs font-black text-slate-700">
                      {String(run.period_month).slice(0, 7)} · {run.status.toUpperCase()}
                    </p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      Lines: {Number(run.line_count ?? 0)} · Net: PKR {Number(run.total_net_amount ?? 0).toLocaleString()}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card className="lg:col-span-3 rounded-3xl border border-slate-100 p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Run Details</h2>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                {selectedRun ? `Status: ${selectedRun.status}` : "Select a run to view line items"}
              </p>
            </div>
            {selectedRun ? (
              <div className="flex gap-2">
                <Button
                  onClick={() => updateRun("finalize")}
                  disabled={busy || selectedRun.status !== "draft"}
                  className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest px-3"
                >
                  Finalize
                </Button>
                <Button
                  onClick={() => updateRun("void")}
                  disabled={busy || selectedRun.status === "void"}
                  className="h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest px-3"
                >
                  Void
                </Button>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div className="rounded-xl border border-slate-100 p-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Base</p>
              <p className="text-sm font-black text-slate-800">PKR {totals.base.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-slate-100 p-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Allowance</p>
              <p className="text-sm font-black text-slate-800">PKR {totals.allowance.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-slate-100 p-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Deduction</p>
              <p className="text-sm font-black text-slate-800">PKR {totals.deduction.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-slate-100 p-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Adjustment</p>
              <p className="text-sm font-black text-slate-800">PKR {totals.adjustment.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-slate-900 bg-slate-900 p-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Net</p>
              <p className="text-sm font-black text-white">PKR {totals.net.toLocaleString()}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[860px]">
              <thead>
                <tr className="bg-slate-50/70">
                  <th className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Employee</th>
                  <th className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Model</th>
                  <th className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Patients</th>
                  <th className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Base</th>
                  <th className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Allowance</th>
                  <th className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Deduction</th>
                  <th className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Adjust</th>
                  <th className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Net</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-2 py-6 text-sm text-slate-500 font-semibold">
                      No line items for this run.
                    </td>
                  </tr>
                ) : (
                  lines.map((line) => (
                    <tr key={line.payroll_line_id} className="border-t border-slate-100">
                      <td className="px-2 py-2 text-xs font-semibold text-slate-700">
                        {line.person_name || "Unknown"} ({line.user_code || "-"})
                      </td>
                      <td className="px-2 py-2 text-xs font-semibold text-slate-700">{line.salary_model}</td>
                      <td className="px-2 py-2 text-xs font-semibold text-slate-700">{Number(line.patient_count ?? 0)}</td>
                      <td className="px-2 py-2 text-xs font-semibold text-slate-700">{Number(line.base_amount).toLocaleString()}</td>
                      <td className="px-2 py-2 text-xs font-semibold text-slate-700">{Number(line.allowance_total).toLocaleString()}</td>
                      <td className="px-2 py-2 text-xs font-semibold text-slate-700">{Number(line.deduction_total).toLocaleString()}</td>
                      <td className="px-2 py-2 text-xs font-semibold text-slate-700">{Number(line.adjustment_total).toLocaleString()}</td>
                      <td className="px-2 py-2 text-xs font-black text-slate-800">{Number(line.net_amount).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
