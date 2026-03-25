"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  HandCoins,
  Package,
  RefreshCw,
  Settings,
  Stethoscope,
  Users,
} from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import toast from "react-hot-toast";
import { formatTimeInTimezone } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

type TrendRange = "7d" | "30d" | "1y" | "5y" | "lifetime";
type TrendBucket = "day" | "month" | "year";

type TrendPoint = {
  date: string;
  day: string;
  value: number;
};

type ActivityItem = {
  id: number | string;
  type: "attendance" | "financial" | "inventory" | "patient" | "system";
  status: "success" | "warning" | "danger" | "info";
  action: string;
  staff: string;
  entityType: string | null;
  entityId: string | number | null;
  time: string;
};

type DashboardPayload = {
  metrics: {
    revenue: number;
    previousRevenue30d: number;
    revenueChangePct30d: number | null;
    dailyPatients: number;
    activeStaff: number;
    totalStaff: number;
    criticalLowStockCount: number;
  };
  trendMeta: {
    range: TrendRange;
    bucket: TrendBucket;
    points: number;
  };
  trend: TrendPoint[];
  activities: ActivityItem[];
};
type LoadMode = "boot" | "trend" | "refresh";

type StatCardProps = {
  title: string;
  value: string;
  changeLabel: string;
  trend: "up" | "down";
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  onClick?: () => void;
};

const StatCard = ({ title, value, changeLabel, trend, icon: Icon, color, onClick }: StatCardProps) => (
  <Card
    onClick={onClick}
    className={`p-6 relative overflow-hidden border-none shadow-xl shadow-slate-200/50 rounded-[2rem] ${onClick ? "cursor-pointer hover:scale-[1.01] transition-transform" : ""
      }`}
  >
    <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 opacity-5 rounded-full ${color}`} />
    <div className="flex items-start justify-between relative z-10">
      <div className="space-y-3">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h3>
        <div className="flex items-center gap-1.5">
          <span
            className={`flex items-center text-[10px] font-black px-2 py-0.5 rounded-full ${trend === "up" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              }`}
          >
            {trend === "up" ? (
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
            ) : (
              <ArrowDownRight className="w-3 h-3 mr-0.5" />
            )}
            {changeLabel}
          </span>
          <span className="text-[10px] font-bold text-slate-400">live snapshot</span>
        </div>
      </div>
      <div className={`p-4 rounded-2xl ${color}/10 ${color.replace("bg-", "text-")}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  </Card>
);

const formatTime = (iso: string, timeZone: string) => formatTimeInTimezone(iso, timeZone);

const getActivityType = (action: string, entityType: string): ActivityItem["type"] => {
  const text = `${action} ${entityType}`.toLowerCase();
  if (text.includes("attendance")) return "attendance";
  if (text.includes("payment") || text.includes("bill") || text.includes("financial")) return "financial";
  if (text.includes("stock") || text.includes("inventory") || text.includes("medicine")) return "inventory";
  if (text.includes("patient") || text.includes("visit")) return "patient";
  return "system";
};

const getActivityStatus = (action: string): ActivityItem["status"] => {
  const text = action.toLowerCase();
  if (text.includes("delete") || text.includes("remove") || text.includes("fail")) return "danger";
  if (text.includes("update") || text.includes("edit") || text.includes("override")) return "warning";
  if (text.includes("create") || text.includes("add") || text.includes("complete")) return "success";
  return "info";
};

function mapAuditLogRowToActivity(row: any): ActivityItem {
  const action = String(row?.action ?? "System event");
  const entityType = String(row?.entity_type ?? "");
  const createdAt = row?.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString();
  return {
    id: row?.log_id ?? `${createdAt}-${action}`,
    type: getActivityType(action, entityType),
    status: getActivityStatus(action),
    action,
    staff: row?.staff_name ?? "System",
    entityType: row?.entity_type ?? null,
    entityId: row?.entity_id ?? null,
    time: createdAt,
  };
}

const sanitizePayload = (payload: DashboardPayload): DashboardPayload => {
  const safeTrend = Array.isArray(payload?.trend)
    ? payload.trend.map((point) => ({
      date: String(point?.date ?? ""),
      day: String(point?.day ?? ""),
      value: Number.isFinite(Number(point?.value)) ? Number(point?.value) : 0,
    }))
    : [];

  const metrics = payload?.metrics ?? {
    revenue: 0,
    previousRevenue30d: 0,
    revenueChangePct30d: 0,
    dailyPatients: 0,
    activeStaff: 0,
    totalStaff: 0,
    criticalLowStockCount: 0,
  };

  return {
    ...payload,
    metrics: {
      revenue: Number.isFinite(Number(metrics.revenue)) ? Number(metrics.revenue) : 0,
      previousRevenue30d: Number.isFinite(Number(metrics.previousRevenue30d))
        ? Number(metrics.previousRevenue30d)
        : 0,
      revenueChangePct30d:
        metrics.revenueChangePct30d === null
          ? null
          : Number.isFinite(Number(metrics.revenueChangePct30d))
            ? Number(metrics.revenueChangePct30d)
            : 0,
      dailyPatients: Number.isFinite(Number(metrics.dailyPatients)) ? Number(metrics.dailyPatients) : 0,
      activeStaff: Number.isFinite(Number(metrics.activeStaff)) ? Number(metrics.activeStaff) : 0,
      totalStaff: Number.isFinite(Number(metrics.totalStaff)) ? Number(metrics.totalStaff) : 0,
      criticalLowStockCount: Number.isFinite(Number(metrics.criticalLowStockCount))
        ? Number(metrics.criticalLowStockCount)
        : 0,
    },
    trend: safeTrend,
    activities: Array.isArray(payload?.activities) ? payload.activities : [],
    trendMeta: payload?.trendMeta ?? {
      range: "7d",
      bucket: "day",
      points: safeTrend.length,
    },
  };
};

type ChartPoint = TrendPoint & {
  x: number;
  y: number;
};

type MonotoneCurve = {
  path: string;
  segmentCommands: string[];
};

const buildMonotoneCurve = (points: ChartPoint[]): MonotoneCurve => {
  if (points.length === 0) return { path: "", segmentCommands: [] };
  if (points.length === 1) return { path: `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`, segmentCommands: [] };

  const n = points.length;
  const delta: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    delta.push(dx === 0 ? 0 : (points[i + 1].y - points[i].y) / dx);
  }

  const tangents = new Array<number>(n).fill(0);
  tangents[0] = delta[0];
  tangents[n - 1] = delta[n - 2];
  for (let i = 1; i < n - 1; i++) {
    tangents[i] = (delta[i - 1] + delta[i]) / 2;
  }

  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    const a = tangents[i] / delta[i];
    const b = tangents[i + 1] / delta[i];
    const magnitude = Math.hypot(a, b);
    if (magnitude > 3) {
      const scale = 3 / magnitude;
      tangents[i] = scale * a * delta[i];
      tangents[i + 1] = scale * b * delta[i];
    }
  }

  const segmentCommands: string[] = [];
  const segments: string[] = [`M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`];

  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = p1.x - p0.x;
    const c1x = p0.x + dx / 3;
    const c1y = p0.y + (tangents[i] * dx) / 3;
    const c2x = p1.x - dx / 3;
    const c2y = p1.y - (tangents[i + 1] * dx) / 3;
    const segment = `C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
    segments.push(segment);
    segmentCommands.push(segment);
  }

  return { path: segments.join(" "), segmentCommands };
};

const formatCurrencyCompact = (amount: number) => `PKR ${amount.toLocaleString()}`;

export default function AdminDashboard() {
  const router = useRouter();
  const systemTimezone = useSystemTimezone();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [selectedRange, setSelectedRange] = useState<TrendRange>("30d");
  const [isPageBootstrapping, setIsPageBootstrapping] = useState(true);
  const [isTrendLoading, setIsTrendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [isChartDrawn, setIsChartDrawn] = useState(false);
  const knownActivityIdsRef = useRef<Set<string>>(new Set());
  const hasLoadedSummaryRef = useRef(false);

  const loadSummary = useCallback(async (range: TrendRange, mode: LoadMode) => {
    if (mode === "boot") {
      setIsPageBootstrapping(true);
      setError(null);
    }
    if (mode === "trend") {
      setIsTrendLoading(true);
      setChartError(null);
    }
    if (mode === "refresh") {
      setRefreshing(true);
      setChartError(null);
    }

    try {
      const response = await fetch(`/api/admin/dashboard/summary?range=${range}`, { credentials: "include" });
      const payload = (await response.json()) as DashboardPayload & { error?: string };

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load dashboard");
      }

      const normalized = sanitizePayload(payload);
      console.info("[admin/dashboard/page] fetched summary", {
        range,
        trendMeta: normalized.trendMeta,
        trendLength: normalized.trend.length,
        trendSample: normalized.trend.slice(0, 5),
      });
      setData(normalized);
      knownActivityIdsRef.current = new Set((normalized.activities ?? []).map((item) => String(item.id)));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load dashboard";
      if (mode === "boot") {
        setError(message);
      } else {
        setChartError(message);
      }
    } finally {
      if (mode === "boot") setIsPageBootstrapping(false);
      if (mode === "trend") setIsTrendLoading(false);
      if (mode === "refresh") setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const mode: LoadMode = hasLoadedSummaryRef.current ? "trend" : "boot";
    hasLoadedSummaryRef.current = true;
    void loadSummary(selectedRange, mode);
  }, [loadSummary, selectedRange]);

  const refreshActivities = useCallback(async (showToast = false) => {
    try {
      const response = await fetch("/api/admin/audit-logs?limit=10", { credentials: "include" });
      const rows = (await response.json()) as any[];
      if (!response.ok || !Array.isArray(rows)) return;

      const mapped = rows.map(mapAuditLogRowToActivity);
      const nextKnown = new Set(mapped.map((item) => String(item.id)));
      let newItemsCount = 0;
      for (const item of mapped) {
        if (!knownActivityIdsRef.current.has(String(item.id))) {
          newItemsCount++;
        }
      }

      setData((prev) => (prev ? { ...prev, activities: mapped } : prev));
      knownActivityIdsRef.current = nextKnown;

      if (showToast && newItemsCount > 0) {
        toast.success(
          newItemsCount === 1
            ? "New audit activity received"
            : `${newItemsCount} new audit activities received`,
          { id: "audit-live-update" }
        );
      }
    } catch {
      // Keep dashboard stable on stream errors.
    }
  }, []);

  useEffect(() => {
    if (typeof EventSource === "undefined") return;

    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let source: EventSource | null = null;

    const connect = () => {
      if (disposed) return;
      source = new EventSource("/api/admin/audit-logs/stream");
      source.addEventListener("invalidate", () => {
        void refreshActivities(true);
      });
      source.onerror = () => {
        source?.close();
        source = null;
        if (!disposed) reconnectTimer = setTimeout(connect, 5000);
      };
    };

    connect();
    const interval = setInterval(() => {
      void refreshActivities(false);
    }, 60000);

    return () => {
      disposed = true;
      clearInterval(interval);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      source?.close();
    };
  }, [refreshActivities]);

  const maxTrendValue = useMemo(() => {
    if (!data?.trend?.length) return 1;
    const rawMax = Math.max(...data.trend.map((point) => Number(point.value ?? 0)), 1);
    const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(rawMax)));
    return Math.ceil(rawMax / magnitude) * magnitude;
  }, [data?.trend]);

  const hasNonZeroTrend = useMemo(
    () => (data?.trend ?? []).some((point) => Number(point.value ?? 0) > 0),
    [data?.trend]
  );

  const chartPoints = useMemo<ChartPoint[]>(() => {
    const trend = data?.trend ?? [];
    const n = trend.length;
    if (!n) return [];

    const width = 100;
    const height = 100;
    const xInset = 5;
    const yInset = 9;
    const usableWidth = width - xInset * 2;
    const usableHeight = height - yInset - 12;
    const safeMax = Math.max(maxTrendValue, 1);

    return trend.map((point, index) => {
      const x = n === 1 ? width / 2 : xInset + (index / (n - 1)) * usableWidth;
      const normalized = Math.max(0, Number(point.value ?? 0)) / safeMax;
      const y = yInset + (1 - normalized) * usableHeight;
      return { ...point, x, y };
    });
  }, [data?.trend, maxTrendValue]);

  const chartCurve = useMemo(() => buildMonotoneCurve(chartPoints), [chartPoints]);
  const areaPath = useMemo(() => {
    if (!chartPoints.length || !chartCurve.path) return "";
    const baselineY = 88;
    const first = chartPoints[0];
    const last = chartPoints[chartPoints.length - 1];
    return `${chartCurve.path} L ${last.x.toFixed(2)} ${baselineY.toFixed(2)} L ${first.x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
  }, [chartCurve.path, chartPoints]);

  const activeSegmentPath = useMemo(() => {
    if (chartPoints.length < 2 || chartCurve.segmentCommands.length === 0) return "";
    const segments: string[] = [];
    for (let i = 0; i < chartCurve.segmentCommands.length; i++) {
      const left = Number(chartPoints[i]?.value ?? 0);
      const right = Number(chartPoints[i + 1]?.value ?? 0);
      if (left <= 0 && right <= 0) continue;
      const start = chartPoints[i];
      const move = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)}`;
      segments.push(`${move} ${chartCurve.segmentCommands[i]}`);
    }
    return segments.join(" ");
  }, [chartCurve.segmentCommands, chartPoints]);

  const yTicks = useMemo(() => {
    const steps = 4;
    return Array.from({ length: steps + 1 }).map((_, idx) => {
      const ratio = idx / steps;
      const value = maxTrendValue * (1 - ratio);
      const y = 9 + ratio * (100 - 9 - 12);
      return { value, y };
    });
  }, [maxTrendValue]);

  const activePoint = activePointIndex !== null ? chartPoints[activePointIndex] : null;

  const spikeIndexes = useMemo(() => {
    return chartPoints
      .map((point, index) => ({ index, value: Number(point.value ?? 0) }))
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 2)
      .map((entry) => entry.index);
  }, [chartPoints]);

  useEffect(() => {
    setIsChartDrawn(false);
    const timer = setTimeout(() => setIsChartDrawn(true), 40);
    return () => clearTimeout(timer);
  }, [selectedRange, chartCurve.path]);

  const getPercentChange = (index: number) => {
    if (index <= 0) return null;
    const prev = Number(chartPoints[index - 1]?.value ?? 0);
    const current = Number(chartPoints[index]?.value ?? 0);
    if (prev === 0) return current === 0 ? 0 : null;
    return ((current - prev) / prev) * 100;
  };

  if (isPageBootstrapping && !data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card className="p-8 rounded-[2rem] border border-rose-100 bg-rose-50/40">
        <h2 className="text-lg font-black text-rose-700 uppercase tracking-wide">Dashboard unavailable</h2>
        <p className="text-sm font-semibold text-rose-600 mt-2">{error}</p>
        <Button
          className="mt-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white"
          onClick={() => loadSummary(selectedRange, "boot")}
        >
          Retry
        </Button>
      </Card>
    );
  }

  if (!data) return null;

  const { metrics } = data;
  const rangeOptions: Array<{ key: TrendRange; label: string }> = [
    { key: "7d", label: "7D" },
    { key: "30d", label: "30D" },
    { key: "1y", label: "1Y" },
    { key: "5y", label: "5Y" },
    { key: "lifetime", label: "Lifetime" },
  ];
  const rangeLabelMap: Record<TrendRange, string> = {
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "1y": "Last 12 months",
    "5y": "Last 5 years",
    lifetime: "Lifetime",
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Hospital Overview</h1>
          <p className="text-slate-500 text-sm font-semibold mt-1 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Live operational summary
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="rounded-2xl border-slate-200 font-bold text-xs uppercase tracking-wider"
            onClick={() => {
              void loadSummary(selectedRange, "refresh");
            }}
            isLoading={refreshing}
          >
            {!refreshing && <RefreshCw className="w-4 h-4 mr-2" />}
            Refresh
          </Button>
          <Button
            className="bg-slate-900 hover:bg-black text-white rounded-2xl px-6 shadow-xl font-bold text-xs uppercase tracking-wider"
            onClick={() => router.push("/admin/audit")}
          >
            View Audit Logs
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Cash Collected (30d)"
          value={`PKR ${metrics.revenue.toLocaleString()}`}
          changeLabel={metrics.revenue > 0 ? "Cash received" : "No collections"}
          trend="up"
          icon={HandCoins}
          color="bg-emerald-500"
        />
        <StatCard
          title="Daily Patients"
          value={`${metrics.dailyPatients}`}
          changeLabel={metrics.dailyPatients > 0 ? "Active queue" : "No visits yet"}
          trend={metrics.dailyPatients > 0 ? "up" : "down"}
          icon={Stethoscope}
          color="bg-blue-500"
        />
        <StatCard
          title="Active Staff"
          value={`${metrics.activeStaff}/${metrics.totalStaff}`}
          changeLabel={metrics.activeStaff > 0 ? "Present today" : "No check-ins"}
          trend={metrics.activeStaff > 0 ? "up" : "down"}
          icon={Users}
          color="bg-amber-500"
        />
        <StatCard
          title="Critical Low-Stock Items"
          value={`${metrics.criticalLowStockCount}`}
          changeLabel={
            metrics.criticalLowStockCount === 0
              ? "All stable"
              : metrics.criticalLowStockCount <= 5
                ? "Monitor"
                : "Urgent restock"
          }
          trend={metrics.criticalLowStockCount > 5 ? "down" : "up"}
          icon={AlertCircle}
          color="bg-violet-500"
          onClick={() => router.push("/admin/inventory?focus=critical-low-stock")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-8 h-[480px] flex flex-col rounded-[2.5rem] border border-slate-100/80 shadow-2xl shadow-slate-200/40">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Revenue Trends</h3>
              <p className="text-xs font-bold text-slate-400 mt-1">
                {rangeLabelMap[selectedRange]} cash collected
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              {rangeOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  disabled={isTrendLoading}
                  onClick={() => setSelectedRange(option.key)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-colors ${selectedRange === option.key
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
                    } ${isTrendLoading ? "opacity-70 cursor-wait" : ""}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
            <div className="flex flex-wrap items-end gap-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Total revenue (last 30 days)
                </p>
                <p className="mt-1 text-2xl font-black tracking-tight text-slate-900" data-testid="revenue-summary-total">
                  {formatCurrencyCompact(metrics.revenue)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">% vs previous 30 days</p>
                <p
                  className={`mt-1 text-sm font-black ${metrics.revenueChangePct30d === null
                    ? "text-slate-500"
                    : metrics.revenueChangePct30d >= 0
                      ? "text-emerald-600"
                      : "text-rose-600"
                    }`}
                  data-testid="revenue-summary-change"
                >
                  {metrics.revenueChangePct30d === null
                    ? "N/A"
                    : `${metrics.revenueChangePct30d > 0 ? "+" : ""}${metrics.revenueChangePct30d.toFixed(1)}%`}
                </p>
              </div>
            </div>
          </div>

          {chartError ? <p className="text-xs font-semibold text-rose-500 mb-2">{chartError}</p> : null}
          <div className="relative rounded-2xl border border-slate-100 bg-white shadow-sm p-4 flex-1 min-h-0">
            {data.trend.length === 0 || (!hasNonZeroTrend && selectedRange === "7d") ? (
              <p className="text-sm font-semibold text-slate-400 py-20 text-center">No cash collected in this range.</p>
            ) : (
              <div className="h-full flex flex-col">
                <div className="relative flex-1 min-h-[150px] pl-14 pr-2">
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="w-full h-full"
                    data-testid="trend-line-chart"
                  >
                    <defs>
                      <linearGradient id="revenueTrendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.24" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    {yTicks.map((tick, idx) => (
                      <line
                        key={idx}
                        x1="0"
                        y1={tick.y.toFixed(2)}
                        x2="100"
                        y2={tick.y.toFixed(2)}
                        stroke="#e2e8f0"
                        strokeWidth={idx === yTicks.length - 1 ? "0.5" : "0.35"}
                        strokeDasharray={idx === yTicks.length - 1 ? "0" : "1.6 2.2"}
                      />
                    ))}
                    {areaPath ? (
                      <path
                        d={areaPath}
                        fill="url(#revenueTrendFill)"
                        className="transition-opacity duration-700"
                        style={{ opacity: isChartDrawn ? 1 : 0.2 }}
                        data-testid="trend-area-fill"
                      />
                    ) : null}
                    {chartCurve.path ? (
                      <path
                        d={chartCurve.path}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="1.1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.65}
                      />
                    ) : null}
                    {activeSegmentPath ? (
                      <path
                        d={activeSegmentPath}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        pathLength={1}
                        strokeDasharray="1"
                        strokeDashoffset={isChartDrawn ? 0 : 1}
                        style={{ transition: "stroke-dashoffset 800ms ease" }}
                        data-testid="trend-active-line"
                      />
                    ) : null}
                    {spikeIndexes.map((idx) => {
                      const spike = chartPoints[idx];
                      if (!spike) return null;
                      return (
                        <circle
                          key={`spike-${spike.date}`}
                          cx={spike.x}
                          cy={spike.y}
                          r="2.1"
                          fill="#059669"
                          stroke="#ffffff"
                          strokeWidth="0.8"
                          data-testid={`trend-spike-marker-${idx}`}
                        />
                      );
                    })}
                    {activePoint ? (
                      <circle
                        cx={activePoint.x}
                        cy={activePoint.y}
                        r="2.45"
                        fill="#0f172a"
                        stroke="#ffffff"
                        strokeWidth="0.9"
                      />
                    ) : null}
                  </svg>

                  <div className="absolute inset-0">
                    <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between py-2">
                      {yTicks.map((tick, idx) => (
                        <span key={idx} className="text-[10px] font-bold text-slate-400">
                          {formatCurrencyCompact(Math.max(0, tick.value))}
                        </span>
                      ))}
                    </div>
                    <div
                      className="absolute left-14 right-2 top-0 bottom-0"
                      data-testid="trend-hover-layer"
                      onMouseMove={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        const percent = rect.width <= 0 ? 0 : ((event.clientX - rect.left) / rect.width) * 100;
                        let nearest = 0;
                        let bestDistance = Number.POSITIVE_INFINITY;
                        chartPoints.forEach((point, index) => {
                          const distance = Math.abs(point.x - percent);
                          if (distance < bestDistance) {
                            bestDistance = distance;
                            nearest = index;
                          }
                        });
                        setActivePointIndex(nearest);
                      }}
                      onMouseLeave={() => setActivePointIndex(null)}
                    />
                  </div>

                  {activePoint ? (
                    <div
                      className="absolute z-20 -translate-x-1/2 -translate-y-full bg-white rounded-xl shadow-xl border border-slate-100 px-3 py-2 min-w-[170px]"
                      style={{
                        left: `${activePoint.x}%`,
                        top: `${Math.max(activePoint.y - 3, 10)}%`,
                      }}
                      data-testid="trend-tooltip"
                    >
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {activePoint.day} - {activePoint.date}
                      </p>
                      <p className="text-sm font-black text-slate-800 mt-1">
                        {formatCurrencyCompact(Number(activePoint.value ?? 0))}
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 mt-1">
                        Change:{" "}
                        {(() => {
                          const pointIndex = chartPoints.findIndex((point) => point.date === activePoint.date);
                          const delta = getPercentChange(pointIndex);
                          if (delta === null) return "N/A";
                          return `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;
                        })()}
                      </p>
                    </div>
                  ) : null}

                  {spikeIndexes[0] !== undefined && chartPoints[spikeIndexes[0]] ? (
                    <div
                      className="absolute px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-[10px] font-bold text-emerald-700"
                      style={{
                        left: `${chartPoints[spikeIndexes[0]].x}%`,
                        top: `${Math.max(chartPoints[spikeIndexes[0]].y - 11, 8)}%`,
                        transform: "translate(-50%, -100%)",
                      }}
                    >
                      Peak
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${data.trend.length}, minmax(0, 1fr))` }}>
                  {data.trend.map((point, index) => {
                    const skipStep = data.trend.length > 20 ? 4 : data.trend.length > 10 ? 2 : 1;
                    const visible = index % skipStep === 0 || index === data.trend.length - 1;
                    return (
                      <span
                        key={point.date}
                        className={`text-[10px] text-center font-black uppercase tracking-widest truncate ${visible ? "text-slate-400" : "text-transparent"}`}
                        title={`${point.day} ${point.date}`}
                      >
                        {visible ? point.day : "."}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {isTrendLoading ? (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                <div className="w-8 h-8 border-4 border-slate-100 border-t-emerald-600 rounded-full animate-spin" />
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="p-8 rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/50 h-[480px] flex flex-col">
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-6">Pulse Feed</h3>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-6" data-testid="pulse-feed-scroll">
            {data.activities.length === 0 ? (
              <p className="text-sm font-semibold text-slate-400">No recent activity found.</p>
            ) : (
              data.activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4">
                  <div
                    className={`p-2.5 rounded-xl shadow-sm ${activity.status === "success"
                        ? "bg-emerald-50 text-emerald-600"
                        : activity.status === "warning"
                          ? "bg-amber-50 text-amber-600"
                          : activity.status === "danger"
                            ? "bg-rose-50 text-rose-600"
                            : "bg-blue-50 text-blue-600"
                      }`}
                  >
                    {activity.type === "attendance" ? (
                      <Clock className="w-4 h-4" />
                    ) : activity.type === "financial" ? (
                      <HandCoins className="w-4 h-4" />
                    ) : activity.type === "inventory" ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : activity.type === "patient" ? (
                      <Stethoscope className="w-4 h-4" />
                    ) : (
                      <Activity className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800 leading-none">{activity.action}</p>
                    <p className="text-[11px] font-medium text-slate-500 mt-1">{activity.staff}</p>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 whitespace-nowrap">
                    {formatTime(activity.time, systemTimezone)}
                  </span>
                </div>
              ))
            )}
          </div>
          <Button
            className="w-full mt-6 shrink-0 bg-slate-50 hover:bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold uppercase tracking-widest text-[11px] border-none shadow-none"
            onClick={() => router.push("/admin/audit")}
          >
            View All Logs
          </Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/admin/staff" className="block">
          <Card className="p-6 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-[2rem] border-none shadow-xl shadow-emerald-100 flex items-center justify-between group cursor-pointer overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-white font-black uppercase tracking-widest text-[10px] opacity-80 mb-1">New Operation</h4>
              <p className="text-sm font-bold">Register New Staff Member</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
          </Card>
        </Link>

        <Link href="/admin/inventory" className="block">
          <Card className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[2rem] border-none shadow-xl shadow-blue-100 flex items-center justify-between group cursor-pointer overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-white font-black uppercase tracking-widest text-[10px] opacity-80 mb-1">Stock Control</h4>
              <p className="text-sm font-bold">Initiate Inventory Audit</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform">
              <Package className="w-6 h-6" />
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
          </Card>
        </Link>

        <Link href="/admin/staff" className="block">
          <Card className="p-6 bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-[2rem] border-none shadow-xl shadow-violet-100 flex items-center justify-between group cursor-pointer overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-white font-black uppercase tracking-widest text-[10px] opacity-80 mb-1">System Audit</h4>
              <p className="text-sm font-bold">Review Module Permissions</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform">
              <Settings className="w-6 h-6" />
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
          </Card>
        </Link>
      </div>
    </div>
  );
}
