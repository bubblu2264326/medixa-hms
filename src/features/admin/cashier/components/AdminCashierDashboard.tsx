"use client";

import React from "react";
import { Activity, AlertTriangle, BarChart3, CircleDollarSign, ShieldCheck } from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";

type KpiPayload = {
  todayCollections: number;
  outstandingDue: number;
  reversalsToday: { count: number; amount: number };
  shifts: { openShifts: number; todayVariance: number };
  cashierWiseTotals: Array<{ staffId: number | null; cashierName: string; total: number }>;
  agingTrend: Array<{ day: string; outstandingDue: number }>;
};

type OverdueSummaryPayload = {
  summary: {
    totalDueBills: number;
    totalDueAmount: number;
    bucket7: number;
    bucket30: number;
    bucket60: number;
  };
  topOverdue: Array<{
    billId: number;
    visitId: number;
    patientName: string;
    dueAmount: number;
    overdueDays: number;
  }>;
};

type AuditPayload = {
  items: Array<{
    cashierAuditEventId: number;
    eventType: string;
    billId: number | null;
    visitId: number | null;
    createdAt: string | null;
    actorName: string | null;
    reasonCode: string | null;
  }>;
};

const fmt = (value: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const dt = (value: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

async function jsonFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload?.error || "Request failed");
  }
  return payload as T;
}

export default function AdminCashierDashboard() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [kpis, setKpis] = React.useState<KpiPayload | null>(null);
  const [overdue, setOverdue] = React.useState<OverdueSummaryPayload | null>(null);
  const [audit, setAudit] = React.useState<AuditPayload["items"]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiData, overdueData, auditData] = await Promise.all([
        jsonFetch<KpiPayload>("/api/admin/cashier/kpis"),
        jsonFetch<OverdueSummaryPayload>("/api/admin/cashier/overdue-summary"),
        jsonFetch<AuditPayload>("/api/admin/cashier/audit?page=1&pageSize=20"),
      ]);
      setKpis(kpiData);
      setOverdue(overdueData);
      setAudit(auditData.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wide text-slate-800">Cashier Analytics & Monitor</h1>
          <p className="text-sm text-slate-500">Admin transparency view for live cashier operations.</p>
        </div>
        <Button className="rounded-xl bg-slate-900 text-white hover:bg-black" onClick={load} isLoading={loading}>
          Refresh
        </Button>
      </div>

      {error ? (
        <Card className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700">{error}</Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="rounded-2xl border-none bg-white shadow-md">
          <div className="flex items-center gap-2 text-slate-500"><CircleDollarSign className="h-4 w-4" /> Today Collections</div>
          <p className="mt-1 text-xl font-black text-slate-900">{fmt(kpis?.todayCollections ?? 0)}</p>
        </Card>
        <Card className="rounded-2xl border-none bg-white shadow-md">
          <div className="flex items-center gap-2 text-slate-500"><AlertTriangle className="h-4 w-4" /> Outstanding</div>
          <p className="mt-1 text-xl font-black text-rose-700">{fmt(kpis?.outstandingDue ?? 0)}</p>
        </Card>
        <Card className="rounded-2xl border-none bg-white shadow-md">
          <div className="flex items-center gap-2 text-slate-500"><ShieldCheck className="h-4 w-4" /> Reversals Today</div>
          <p className="mt-1 text-xl font-black text-amber-700">{kpis?.reversalsToday.count ?? 0}</p>
          <p className="text-xs text-slate-500">{fmt(kpis?.reversalsToday.amount ?? 0)}</p>
        </Card>
        <Card className="rounded-2xl border-none bg-white shadow-md">
          <div className="flex items-center gap-2 text-slate-500"><Activity className="h-4 w-4" /> Shift Monitor</div>
          <p className="mt-1 text-xl font-black text-emerald-700">{kpis?.shifts.openShifts ?? 0} open</p>
          <p className="text-xs text-slate-500">Variance: {fmt(kpis?.shifts.todayVariance ?? 0)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-none shadow-md">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-800">
            <BarChart3 className="h-4 w-4" /> Cashier-Wise Totals
          </h2>
          <div className="space-y-2">
            {(kpis?.cashierWiseTotals ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No activity today.</p>
            ) : (
              (kpis?.cashierWiseTotals ?? []).map((row) => (
                <div key={`${row.staffId ?? "unknown"}-${row.cashierName}`} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-700">{row.cashierName}</p>
                  <p className="text-sm font-black text-slate-900">{fmt(row.total)}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="rounded-2xl border-none shadow-md">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-800">Overdue Buckets</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-slate-500">Total Due Bills</p>
              <p className="font-black text-slate-800">{overdue?.summary.totalDueBills ?? 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-slate-500">Total Due Amount</p>
              <p className="font-black text-slate-800">{fmt(overdue?.summary.totalDueAmount ?? 0)}</p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
              <p className="text-blue-700">7+ days</p>
              <p className="font-black text-blue-800">{overdue?.summary.bucket7 ?? 0}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-amber-700">30+ days</p>
              <p className="font-black text-amber-800">{overdue?.summary.bucket30 ?? 0}</p>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
              <p className="text-rose-700">60+ days</p>
              <p className="font-black text-rose-800">{overdue?.summary.bucket60 ?? 0}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-none shadow-md">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-800">Oldest / Largest Outstanding</h2>
          <div className="space-y-2">
            {(overdue?.topOverdue ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No overdue dues.</p>
            ) : (
              (overdue?.topOverdue ?? []).map((row) => (
                <div key={row.billId} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Bill #{row.billId} • {row.patientName}</p>
                    <p className="text-xs text-slate-500">{row.overdueDays} days overdue</p>
                  </div>
                  <p className="text-sm font-black text-rose-700">{fmt(row.dueAmount)}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="rounded-2xl border-none shadow-md">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-800">Live Transaction Feed</h2>
          <div className="space-y-2">
            {audit.length === 0 ? (
              <p className="text-sm text-slate-500">No recent cashier events.</p>
            ) : (
              audit.map((event) => (
                <div key={event.cashierAuditEventId} className="rounded-lg border border-slate-200 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-800">{event.eventType}</p>
                  <p className="text-xs text-slate-500">
                    {event.actorName || "System"} • Bill {event.billId ?? "-"} • Visit {event.visitId ?? "-"} • {dt(event.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
