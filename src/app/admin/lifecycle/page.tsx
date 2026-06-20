"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { formatDateTimeInTimezone } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

type StaffRow = {
  account_type?: "staff" | "doctor";
  staff_id: number;
  name: string;
  user_code: string;
  role?: string | null;
  employment_status?: string;
};

type LifecycleTemplate = {
  lifecycle_template_id: number;
  template_code: string;
  template_name: string;
  lifecycle_type: string;
  task_count: number;
};

type LifecycleRun = {
  lifecycle_run_id: number;
  account_type: "staff" | "doctor";
  person_id: number;
  template_name?: string | null;
  lifecycle_type: string;
  run_status: string;
  employee_name: string;
  user_code: string;
  role?: string | null;
  department?: string | null;
  started_at: string;
  completed_at?: string | null;
  total_tasks: number;
  completed_tasks: number;
  open_tasks: number;
};

type LifecycleTask = {
  lifecycle_task_id: number;
  lifecycle_run_id: number;
  task_code: string;
  task_name: string;
  task_group?: string | null;
  task_status: string;
  owner_staff_id?: number | null;
  owner_name?: string | null;
  due_at?: string | null;
  completed_at?: string | null;
  completion_note?: string | null;
};

type LifecycleSummary = {
  total_runs: number;
  in_progress_runs: number;
  blocked_runs: number;
  completed_runs: number;
  pending_tasks: number;
  in_progress_tasks: number;
  blocked_tasks: number;
  overdue_tasks: number;
};

export default function LifecyclePage() {
  const systemTimezone = useSystemTimezone();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [runs, setRuns] = useState<LifecycleRun[]>([]);
  const [templates, setTemplates] = useState<LifecycleTemplate[]>([]);
  const [tasks, setTasks] = useState<LifecycleTask[]>([]);
  const [summary, setSummary] = useState<LifecycleSummary>({
    total_runs: 0,
    in_progress_runs: 0,
    blocked_runs: 0,
    completed_runs: 0,
    pending_tasks: 0,
    in_progress_tasks: 0,
    blocked_tasks: 0,
    overdue_tasks: 0,
  });

  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [startForm, setStartForm] = useState({
    person_key: "",
    lifecycle_type: "onboarding",
    lifecycle_template_id: "",
    summary_note: "",
  });

  const statusClass = (status: string) => {
    if (status === "completed") return "bg-success/10 text-success";
    if (status === "blocked" || status === "overdue") return "bg-destructive/10 text-destructive";
    if (status === "cancelled") return "bg-muted text-muted-foreground";
    return "bg-warning/15 text-warning-foreground";
  };

  const loadDirectory = async () => {
    const res = await fetch("/api/admin/staff/v2/directory", { credentials: "include" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load directory");
    const rows = (Array.isArray(data) ? data : []).filter((row: any) => {
      const state = String(row?.employment_status ?? "active").toLowerCase();
      return state === "active" || row?.account_type === "doctor";
    });
    setStaff(rows);
  };

  const loadLifecycle = async (runId?: number | null) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (runId) params.set("run_id", String(runId));
      const res = await fetch(`/api/admin/staff/v2/lifecycle?${params.toString()}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load lifecycle data");
      setRuns(Array.isArray(data?.runs) ? data.runs : []);
      setTemplates(Array.isArray(data?.templates) ? data.templates : []);
      setSummary({
        total_runs: Number(data?.summary?.total_runs ?? 0),
        in_progress_runs: Number(data?.summary?.in_progress_runs ?? 0),
        blocked_runs: Number(data?.summary?.blocked_runs ?? 0),
        completed_runs: Number(data?.summary?.completed_runs ?? 0),
        pending_tasks: Number(data?.summary?.pending_tasks ?? 0),
        in_progress_tasks: Number(data?.summary?.in_progress_tasks ?? 0),
        blocked_tasks: Number(data?.summary?.blocked_tasks ?? 0),
        overdue_tasks: Number(data?.summary?.overdue_tasks ?? 0),
      });
      setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load lifecycle data");
      setRuns([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([loadDirectory(), loadLifecycle(selectedRunId)]).catch((e: any) =>
      setError(e?.message || "Failed to initialize lifecycle module")
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadLifecycle(selectedRunId);
  }, [statusFilter, selectedRunId]); // eslint-disable-line react-hooks/exhaustive-deps

  const startRun = async () => {
    setSaving(true);
    setError("");
    try {
      const [accountType, personIdRaw] = startForm.person_key.split(":");
      const personId = Number(personIdRaw);
      if (!personId) throw new Error("Select employee before starting lifecycle run.");

      const res = await fetch("/api/admin/staff/v2/lifecycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "start_run",
          account_type: accountType === "doctor" ? "doctor" : "staff",
          person_id: personId,
          lifecycle_type: startForm.lifecycle_type,
          lifecycle_template_id: startForm.lifecycle_template_id ? Number(startForm.lifecycle_template_id) : null,
          summary_note: startForm.summary_note || null,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Failed to start lifecycle run");
      setStartForm({
        person_key: "",
        lifecycle_type: "onboarding",
        lifecycle_template_id: "",
        summary_note: "",
      });
      setSelectedRunId(Number(payload?.run?.lifecycle_run_id ?? 0) || null);
      await loadLifecycle(Number(payload?.run?.lifecycle_run_id ?? 0) || null);
    } catch (e: any) {
      setError(e?.message || "Failed to start lifecycle run");
    } finally {
      setSaving(false);
    }
  };

  const patchLifecycle = async (payload: Record<string, unknown>) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/staff/v2/lifecycle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Lifecycle action failed");
      await loadLifecycle(selectedRunId);
    } catch (e: any) {
      setError(e?.message || "Lifecycle action failed");
    } finally {
      setSaving(false);
    }
  };

  const selectedRun = useMemo(
    () => runs.find((run) => run.lifecycle_run_id === selectedRunId) ?? null,
    [runs, selectedRunId]
  );

  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Lifecycle</h1>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          Onboarding/offboarding orchestration with task ownership, blockers, and closure controls.
        </p>
      </div>

      {error ? (
        <Card className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
          <p className="text-sm font-semibold text-destructive">{error}</p>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <Card className="rounded-lg p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Runs</p><p className="text-xl font-semibold text-foreground font-mono tabular-nums">{summary.total_runs}</p></Card>
        <Card className="rounded-lg p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">In Progress</p><p className="text-xl font-semibold text-warning-foreground font-mono tabular-nums">{summary.in_progress_runs}</p></Card>
        <Card className="rounded-lg p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Blocked</p><p className="text-xl font-semibold text-destructive font-mono tabular-nums">{summary.blocked_runs}</p></Card>
        <Card className="rounded-lg p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Completed</p><p className="text-xl font-semibold text-success font-mono tabular-nums">{summary.completed_runs}</p></Card>
        <Card className="rounded-lg p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pending Tasks</p><p className="text-xl font-semibold text-foreground font-mono tabular-nums">{summary.pending_tasks}</p></Card>
        <Card className="rounded-lg p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Task WIP</p><p className="text-xl font-semibold text-warning-foreground font-mono tabular-nums">{summary.in_progress_tasks}</p></Card>
        <Card className="rounded-lg p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Task Blocked</p><p className="text-xl font-semibold text-destructive font-mono tabular-nums">{summary.blocked_tasks}</p></Card>
        <Card className="rounded-lg p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Overdue</p><p className="text-xl font-semibold text-destructive font-mono tabular-nums">{summary.overdue_tasks}</p></Card>
      </div>

      <Card className="rounded-lg border border-border p-5 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start Lifecycle Run</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <select className="h-10 rounded-md border border-input px-3 text-sm" value={startForm.person_key} onChange={(e) => setStartForm((p) => ({ ...p, person_key: e.target.value }))}>
            <option value="">Select Employee</option>
            {staff.map((s) => (
              <option key={`${s.account_type ?? "staff"}:${s.staff_id}`} value={`${s.account_type ?? "staff"}:${s.staff_id}`}>
                {s.name} ({s.user_code}) - {s.account_type === "doctor" ? "Doctor" : s.role || "Staff"}
              </option>
            ))}
          </select>
          <select className="h-10 rounded-md border border-input px-3 text-sm" value={startForm.lifecycle_type} onChange={(e) => setStartForm((p) => ({ ...p, lifecycle_type: e.target.value }))}>
            <option value="onboarding">Onboarding</option>
            <option value="offboarding">Offboarding</option>
            <option value="probation">Probation</option>
            <option value="transfer">Transfer</option>
          </select>
          <select className="h-10 rounded-md border border-input px-3 text-sm" value={startForm.lifecycle_template_id} onChange={(e) => setStartForm((p) => ({ ...p, lifecycle_template_id: e.target.value }))}>
            <option value="">Auto Template</option>
            {templates.map((t) => (
              <option key={t.lifecycle_template_id} value={t.lifecycle_template_id}>
                {t.template_name} ({t.task_count} tasks)
              </option>
            ))}
          </select>
          <input className="h-10 rounded-md border border-input px-3 text-sm" placeholder="Summary note" value={startForm.summary_note} onChange={(e) => setStartForm((p) => ({ ...p, summary_note: e.target.value }))} />
        </div>
        <div className="flex items-center gap-2">
          <Button disabled={saving} onClick={startRun} className="h-10 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4">Start Run</Button>
          <select className="h-10 rounded-md border border-input px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </Card>

      <Card className="rounded-lg border border-border p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Runs</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead>
              <tr className="bg-muted">
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Employee</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Template</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Started</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tasks</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-8 text-sm font-semibold text-muted-foreground">Loading lifecycle runs…</td></tr>
              ) : runs.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-sm font-semibold text-muted-foreground">No lifecycle runs found.</td></tr>
              ) : runs.map((run) => (
                <tr key={run.lifecycle_run_id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <p className="text-xs font-semibold text-foreground">{run.employee_name}</p>
                    <p className="text-[10px] text-muted-foreground font-medium font-mono tabular-nums">{run.user_code} - {run.account_type.toUpperCase()}</p>
                  </td>
                  <td className="px-3 py-2 text-xs font-medium text-foreground">{run.lifecycle_type}</td>
                  <td className="px-3 py-2 text-xs font-medium text-foreground">{run.template_name || "-"}</td>
                  <td className="px-3 py-2 text-xs font-medium text-foreground font-mono tabular-nums">{formatDateTimeInTimezone(run.started_at, systemTimezone)}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide ${statusClass(run.run_status)}`}>{run.run_status}</span>
                  </td>
                  <td className="px-3 py-2 text-xs font-medium text-foreground font-mono tabular-nums">{run.completed_tasks}/{run.total_tasks}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-1">
                      <Button disabled={saving} onClick={() => setSelectedRunId(run.lifecycle_run_id)} className="h-8 rounded-md bg-muted text-foreground hover:bg-accent text-[10px] font-semibold uppercase px-2">Tasks</Button>
                      {run.run_status !== "completed" ? (
                        <Button disabled={saving} onClick={() => patchLifecycle({ action: "complete_run", lifecycle_run_id: run.lifecycle_run_id })} className="h-8 rounded-md bg-success text-success-foreground hover:bg-success/90 text-[10px] font-semibold uppercase px-2">Complete</Button>
                      ) : null}
                      {run.run_status !== "cancelled" ? (
                        <Button disabled={saving} onClick={() => patchLifecycle({ action: "cancel_run", lifecycle_run_id: run.lifecycle_run_id })} className="h-8 rounded-md bg-destructive text-white hover:bg-destructive/90 text-[10px] font-semibold uppercase px-2">Cancel</Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="rounded-lg border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {selectedRun ? `Tasks: ${selectedRun.employee_name} (${selectedRun.lifecycle_type})` : "Run Tasks"}
          </h2>
          {selectedRun ? (
            <Button onClick={() => setSelectedRunId(null)} className="h-8 rounded-md bg-muted text-foreground hover:bg-accent text-[10px] font-semibold uppercase px-2">Clear</Button>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead>
              <tr className="bg-muted">
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Task</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Group</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Owner</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Due</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {!selectedRun ? (
                <tr><td colSpan={6} className="px-3 py-8 text-sm font-semibold text-muted-foreground">Select a run to view tasks.</td></tr>
              ) : tasks.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-8 text-sm font-semibold text-muted-foreground">No tasks found for selected run.</td></tr>
              ) : tasks.map((task) => (
                <tr key={task.lifecycle_task_id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <p className="text-xs font-semibold text-foreground">{task.task_name}</p>
                    <p className="text-[10px] text-muted-foreground font-medium font-mono tabular-nums">{task.task_code}</p>
                  </td>
                  <td className="px-3 py-2 text-xs font-medium text-foreground">{task.task_group || "-"}</td>
                  <td className="px-3 py-2 text-xs font-medium text-foreground">
                    {task.owner_name || "-"}
                    <div className="mt-1">
                      <select
                        className="h-8 rounded-md border border-input px-2 text-[11px]"
                        value={task.owner_staff_id ?? ""}
                        onChange={(e) => {
                          const ownerStaffId = Number(e.target.value);
                          if (!ownerStaffId) return;
                          patchLifecycle({
                            action: "assign_task",
                            lifecycle_task_id: task.lifecycle_task_id,
                            owner_staff_id: ownerStaffId,
                          });
                        }}
                      >
                        <option value="">Assign Owner</option>
                        {staff.filter((s) => (s.account_type ?? "staff") === "staff").map((s) => (
                          <option key={s.staff_id} value={s.staff_id}>{s.name} ({s.user_code})</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs font-medium text-foreground font-mono tabular-nums">{formatDateTimeInTimezone(task.due_at, systemTimezone)}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide ${statusClass(task.task_status)}`}>{task.task_status}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-1 flex-wrap justify-end">
                      <Button disabled={saving} onClick={() => patchLifecycle({ action: "update_task_status", lifecycle_task_id: task.lifecycle_task_id, task_status: "in_progress" })} className="h-8 rounded-md bg-muted text-foreground hover:bg-accent text-[10px] font-semibold uppercase px-2">In Progress</Button>
                      <Button disabled={saving} onClick={() => patchLifecycle({ action: "update_task_status", lifecycle_task_id: task.lifecycle_task_id, task_status: "blocked" })} className="h-8 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 text-[10px] font-semibold uppercase px-2">Block</Button>
                      <Button disabled={saving} onClick={() => patchLifecycle({ action: "complete_task", lifecycle_task_id: task.lifecycle_task_id })} className="h-8 rounded-md bg-success text-success-foreground hover:bg-success/90 text-[10px] font-semibold uppercase px-2">Complete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
