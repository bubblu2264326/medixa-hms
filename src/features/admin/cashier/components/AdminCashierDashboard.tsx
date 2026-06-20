"use client";

import React from "react";
import { Activity, AlertTriangle, BarChart3, CircleDollarSign, ShieldCheck } from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";
import { formatDateTimeInTimezone } from "@/src/lib/timezone/client";

type KpiPayload = {
  todayCollections: number;
  outstandingDue: number;
  last30Collections?: number;
  last30Outstanding?: number;
  last30TxnCount?: number;
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

const dt = (value: string | null, timeZone: string) => {
  if (!value) return "-";
  return formatDateTimeInTimezone(value, timeZone);
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
  const systemTimezone = useSystemTimezone();
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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Cashier Analytics & Monitor</h1>
          <p className="text-sm text-muted-foreground">Admin transparency view for live cashier operations.</p>
        </div>
        <Button className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90" onClick={load} isLoading={loading}>
          Refresh
        </Button>
      </div>

      {error ? (
        <Card className="rounded-lg border border-destructive/20 bg-destructive/10 text-destructive">{error}</Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground"><CircleDollarSign className="h-4 w-4" aria-hidden /> Today Collections</div>
          <p className="mt-1 text-xl font-semibold text-foreground font-mono tabular-nums">{fmt(kpis?.todayCollections ?? 0)}</p>
          <p className="text-xs text-muted-foreground">Last 30d: <span className="font-mono tabular-nums">{fmt(kpis?.last30Collections ?? 0)}</span></p>
        </Card>
        <Card className="rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground"><AlertTriangle className="h-4 w-4" aria-hidden /> Outstanding</div>
          <p className="mt-1 text-xl font-semibold text-destructive font-mono tabular-nums">{fmt(kpis?.outstandingDue ?? 0)}</p>
          <p className="text-xs text-muted-foreground">Last 30d: <span className="font-mono tabular-nums">{fmt(kpis?.last30Outstanding ?? 0)}</span></p>
        </Card>
        <Card className="rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground"><ShieldCheck className="h-4 w-4" aria-hidden /> Reversals Today</div>
          <p className="mt-1 text-xl font-semibold text-warning-foreground font-mono tabular-nums">{kpis?.reversalsToday.count ?? 0}</p>
          <p className="text-xs text-muted-foreground font-mono tabular-nums">{fmt(kpis?.reversalsToday.amount ?? 0)}</p>
        </Card>
        <Card className="rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground"><Activity className="h-4 w-4" aria-hidden /> Shift Monitor</div>
          <p className="mt-1 text-xl font-semibold text-success"><span className="font-mono tabular-nums">{kpis?.shifts.openShifts ?? 0}</span> open</p>
          <p className="text-xs text-muted-foreground">
            Variance: <span className="font-mono tabular-nums">{fmt(kpis?.shifts.todayVariance ?? 0)}</span> • Last 30d Txns: <span className="font-mono tabular-nums">{Number(kpis?.last30TxnCount ?? 0)}</span>
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-lg border border-border shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <BarChart3 className="h-4 w-4" aria-hidden /> Cashier-Wise Totals
          </h2>
          <div className="space-y-2">
            {(kpis?.cashierWiseTotals ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No pharmacy sales in selected period.</p>
            ) : (
              (kpis?.cashierWiseTotals ?? []).map((row) => (
                <div key={`${row.staffId ?? "unknown"}-${row.cashierName}`} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <p className="text-sm font-medium text-foreground">{row.cashierName}</p>
                  <p className="text-sm font-semibold text-foreground font-mono tabular-nums">{fmt(row.total)}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="rounded-lg border border-border shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Overdue Buckets</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border border-border bg-muted px-3 py-2">
              <p className="text-muted-foreground">Total Due Bills</p>
              <p className="font-semibold text-foreground font-mono tabular-nums">{overdue?.summary.totalDueBills ?? 0}</p>
            </div>
            <div className="rounded-md border border-border bg-muted px-3 py-2">
              <p className="text-muted-foreground">Total Due Amount</p>
              <p className="font-semibold text-foreground font-mono tabular-nums">{fmt(overdue?.summary.totalDueAmount ?? 0)}</p>
            </div>
            <div className="rounded-md border border-info/20 bg-info/10 px-3 py-2">
              <p className="text-info">7+ days</p>
              <p className="font-semibold text-info font-mono tabular-nums">{overdue?.summary.bucket7 ?? 0}</p>
            </div>
            <div className="rounded-md border border-warning/20 bg-warning/15 px-3 py-2">
              <p className="text-warning-foreground">30+ days</p>
              <p className="font-semibold text-warning-foreground font-mono tabular-nums">{overdue?.summary.bucket30 ?? 0}</p>
            </div>
            <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2">
              <p className="text-destructive">60+ days</p>
              <p className="font-semibold text-destructive font-mono tabular-nums">{overdue?.summary.bucket60 ?? 0}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-lg border border-border shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Oldest / Largest Outstanding</h2>
          <div className="space-y-2">
            {(overdue?.topOverdue ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No overdue dues.</p>
            ) : (
              (overdue?.topOverdue ?? []).map((row) => (
                <div key={row.billId} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">Bill #<span className="font-mono tabular-nums">{row.billId}</span> • {row.patientName}</p>
                    <p className="text-xs text-muted-foreground"><span className="font-mono tabular-nums">{row.overdueDays}</span> days overdue</p>
                  </div>
                  <p className="text-sm font-semibold text-destructive font-mono tabular-nums">{fmt(row.dueAmount)}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="rounded-lg border border-border shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Live Transaction Feed</h2>
          <div className="space-y-2">
            {audit.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pharmacy sales in selected period.</p>
            ) : (
              audit.map((event) => (
                <div key={event.cashierAuditEventId} className="rounded-md border border-border px-3 py-2">
                  <p className="text-sm font-medium text-foreground">{event.eventType}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.actorName || "System"} • Bill <span className="font-mono tabular-nums">{event.billId ?? "-"}</span> • Visit <span className="font-mono tabular-nums">{event.visitId ?? "-"}</span> • <span className="font-mono tabular-nums">{dt(event.createdAt, systemTimezone)}</span>
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
