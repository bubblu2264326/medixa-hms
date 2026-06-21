"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { Dialog } from "@/src/components/ui/Dialog";
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
  // Per-line manual adjustment (+/- to net). Only on a draft run; the backend
  // also rejects adjustments on finalized runs (the finalized-run lock).
  const [adjustModal, setAdjustModal] = useState<{ lineId: number; personName: string; amount: string } | null>(null);

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

  const activeRun = useMemo(
    () => runs.find((r) => r.payroll_run_id === selectedRunId) ?? selectedRun,
    [runs, selectedRunId, selectedRun]
  );
  const canAdjust = activeRun?.status === "draft";

  const applyAdjustment = async () => {
    if (!selectedRunId || !adjustModal) return;
    const amount = Number(adjustModal.amount);
    if (!Number.isFinite(amount) || amount === 0) {
      setError("Enter a non-zero adjustment amount (use a negative value to deduct).");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/payroll/runs/${selectedRunId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ adjustment: { payroll_line_id: adjustModal.lineId, amount } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to adjust payroll line");
      setAdjustModal(null);
      await loadRunDetail(selectedRunId);
    } catch (e: any) {
      setError(e?.message || "Failed to adjust payroll line");
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
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Payroll Runs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate month-wise payroll, review lines, and finalize after validation.
        </p>
      </div>

      {error ? (
        <Card className="border border-destructive/20 bg-destructive/10 p-4 rounded-lg">
          <p className="text-sm font-semibold text-destructive">{error}</p>
        </Card>
      ) : null}

      <Card className="rounded-lg border border-border p-5 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Generate Payroll</h2>
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-10 rounded-md border border-input px-3 text-sm"
          />
          <Button
            onClick={generateRun}
            disabled={busy}
            className="h-10 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold uppercase tracking-wide px-4"
          >
            {busy ? "Generating..." : "Generate / Regenerate"}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <Card className="lg:col-span-2 rounded-lg border border-border p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Runs</h2>
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {loading && runs.length === 0 ? (
              <p className="text-sm text-muted-foreground font-semibold">Loading runs...</p>
            ) : runs.length === 0 ? (
              <p className="text-sm text-muted-foreground font-semibold">No payroll runs available.</p>
            ) : (
              runs.map((run) => {
                const active = selectedRunId === Number(run.payroll_run_id);
                return (
                  <button
                    key={run.payroll_run_id}
                    onClick={() => setSelectedRunId(Number(run.payroll_run_id))}
                    className={`w-full text-left rounded-md border p-3 transition ${
                      active ? "border-primary bg-accent" : "border-border hover:border-input"
                    }`}
                  >
                    <p className="text-xs font-semibold text-foreground">
                      {String(run.period_month).slice(0, 7)} · {run.status.toUpperCase()}
                    </p>
                    <p className="text-xs font-semibold text-muted-foreground mt-1">
                      Lines: <span className="font-mono tabular-nums">{Number(run.line_count ?? 0)}</span> · Net: PKR <span className="font-mono tabular-nums">{Number(run.total_net_amount ?? 0).toLocaleString()}</span>
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card className="lg:col-span-3 rounded-lg border border-border p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Run Details</h2>
              <p className="text-xs font-semibold text-muted-foreground mt-1">
                {selectedRun ? `Status: ${selectedRun.status}` : "Select a run to view line items"}
              </p>
            </div>
            {selectedRun ? (
              <div className="flex gap-2">
                <Button
                  onClick={() => updateRun("finalize")}
                  disabled={busy || selectedRun.status !== "draft"}
                  className="h-9 rounded-md bg-success hover:bg-success/90 text-success-foreground text-[10px] font-semibold uppercase tracking-wide px-3"
                >
                  Finalize
                </Button>
                <Button
                  onClick={() => updateRun("void")}
                  disabled={busy || selectedRun.status === "void"}
                  className="h-9 rounded-md bg-destructive hover:bg-destructive/90 text-white text-[10px] font-semibold uppercase tracking-wide px-3"
                >
                  Void
                </Button>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div className="rounded-md border border-border p-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Base</p>
              <p className="text-sm font-semibold text-foreground font-mono tabular-nums">PKR {totals.base.toLocaleString()}</p>
            </div>
            <div className="rounded-md border border-border p-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Allowance</p>
              <p className="text-sm font-semibold text-foreground font-mono tabular-nums">PKR {totals.allowance.toLocaleString()}</p>
            </div>
            <div className="rounded-md border border-border p-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Deduction</p>
              <p className="text-sm font-semibold text-foreground font-mono tabular-nums">PKR {totals.deduction.toLocaleString()}</p>
            </div>
            <div className="rounded-md border border-border p-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Adjustment</p>
              <p className="text-sm font-semibold text-foreground font-mono tabular-nums">PKR {totals.adjustment.toLocaleString()}</p>
            </div>
            <div className="rounded-md border border-primary bg-primary p-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-foreground/80">Net</p>
              <p className="text-sm font-semibold text-primary-foreground font-mono tabular-nums">PKR {totals.net.toLocaleString()}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[860px]">
              <thead>
                <tr className="bg-muted">
                  <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Employee</th>
                  <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Model</th>
                  <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Patients</th>
                  <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Base</th>
                  <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Allowance</th>
                  <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Deduction</th>
                  <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Adjust</th>
                  <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Net</th>
                  <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-2 py-6 text-sm text-muted-foreground font-semibold">
                      No line items for this run.
                    </td>
                  </tr>
                ) : (
                  lines.map((line) => (
                    <tr key={line.payroll_line_id} className="border-t border-border">
                      <td className="px-2 py-2 text-xs font-semibold text-foreground">
                        {line.person_name || "Unknown"} ({line.user_code || "-"})
                      </td>
                      <td className="px-2 py-2 text-xs font-semibold text-foreground">{line.salary_model}</td>
                      <td className="px-2 py-2 text-xs font-semibold text-foreground font-mono tabular-nums">{Number(line.patient_count ?? 0)}</td>
                      <td className="px-2 py-2 text-xs font-semibold text-foreground font-mono tabular-nums">{Number(line.base_amount).toLocaleString()}</td>
                      <td className="px-2 py-2 text-xs font-semibold text-foreground font-mono tabular-nums">{Number(line.allowance_total).toLocaleString()}</td>
                      <td className="px-2 py-2 text-xs font-semibold text-foreground font-mono tabular-nums">{Number(line.deduction_total).toLocaleString()}</td>
                      <td className="px-2 py-2 text-xs font-semibold text-foreground font-mono tabular-nums">{Number(line.adjustment_total).toLocaleString()}</td>
                      <td className="px-2 py-2 text-xs font-semibold text-foreground font-mono tabular-nums">{Number(line.net_amount).toLocaleString()}</td>
                      <td className="px-2 py-2 text-right">
                        {canAdjust ? (
                          <Button
                            onClick={() => { setError(""); setAdjustModal({ lineId: line.payroll_line_id, personName: line.person_name || "employee", amount: "" }); }}
                            className="h-8 rounded-md bg-muted text-foreground hover:bg-accent text-[10px] font-semibold uppercase tracking-wide px-3"
                          >
                            Adjust
                          </Button>
                        ) : (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Locked</span>
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

      <Dialog
        open={adjustModal !== null}
        onClose={() => setAdjustModal(null)}
        title="Adjust payroll line"
        description={adjustModal ? `Manual adjustment to ${adjustModal.personName}'s net pay. Use a negative value to deduct.` : undefined}
        footer={
          <>
            <Button onClick={() => setAdjustModal(null)} className="h-9 rounded-md bg-muted text-foreground hover:bg-accent text-xs font-semibold px-4">Cancel</Button>
            <Button disabled={busy || !adjustModal?.amount} onClick={applyAdjustment} className="h-9 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4">{busy ? "Applying…" : "Apply Adjustment"}</Button>
          </>
        }
      >
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">Adjustment amount (PKR)</label>
          <input
            autoFocus
            type="number"
            className="h-10 w-full rounded-md border border-input px-3 text-sm font-mono tabular-nums"
            placeholder="e.g. 2000 or -500"
            value={adjustModal?.amount ?? ""}
            onChange={(e) => setAdjustModal((p) => (p ? { ...p, amount: e.target.value } : p))}
          />
        </div>
      </Dialog>
    </div>
  );
}
