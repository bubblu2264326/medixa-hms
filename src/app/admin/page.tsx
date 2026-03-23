"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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

type TrendRange = "7d" | "30d" | "1y" | "5y" | "lifetime";
type TrendBucket = "day" | "month" | "year";

type TrendPoint = {
  date: string;
  day: string;
  value: number;
};

type ActivityItem = {
  id: number;
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
    className={`p-6 relative overflow-hidden border-none shadow-xl shadow-slate-200/50 rounded-[2rem] ${
      onClick ? "cursor-pointer hover:scale-[1.01] transition-transform" : ""
    }`}
  >
    <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 opacity-5 rounded-full ${color}`} />
    <div className="flex items-start justify-between relative z-10">
      <div className="space-y-3">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h3>
        <div className="flex items-center gap-1.5">
          <span
            className={`flex items-center text-[10px] font-black px-2 py-0.5 rounded-full ${
              trend === "up" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
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

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

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
    dailyPatients: 0,
    activeStaff: 0,
    totalStaff: 0,
    criticalLowStockCount: 0,
  };

  return {
    ...payload,
    metrics: {
      revenue: Number.isFinite(Number(metrics.revenue)) ? Number(metrics.revenue) : 0,
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

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [selectedRange, setSelectedRange] = useState<TrendRange>("30d");
  const [isPageBootstrapping, setIsPageBootstrapping] = useState(true);
  const [isTrendLoading, setIsTrendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

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
    void loadSummary(selectedRange, data ? "trend" : "boot");
  }, [loadSummary, selectedRange]);

  const maxTrendValue = useMemo(() => {
    if (!data?.trend?.length) return 1;
    return Math.max(...data.trend.map((point) => point.value), 1);
  }, [data?.trend]);

  const hasNonZeroTrend = useMemo(
    () => (data?.trend ?? []).some((point) => Number(point.value ?? 0) > 0),
    [data?.trend]
  );

  const chartPoints = useMemo(() => {
    const trend = data?.trend ?? [];
    const n = trend.length;
    if (!n) return [];

    const width = 100;
    const height = 100;
    const xInset = 4;
    const yInset = 10;
    const usableWidth = width - xInset * 2;
    const usableHeight = height - yInset * 2;
    const safeMax = Math.max(maxTrendValue, 1);

    return trend.map((point, index) => {
      const x = n === 1 ? width / 2 : xInset + (index / (n - 1)) * usableWidth;
      const normalized = Math.max(0, Number(point.value ?? 0)) / safeMax;
      const y = yInset + (1 - normalized) * usableHeight;
      return { ...point, x, y };
    });
  }, [data?.trend, maxTrendValue]);

  const linePath = useMemo(() => {
    if (!chartPoints.length) return "";
    return chartPoints
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(" ");
  }, [chartPoints]);

  const activePoint = activePointIndex !== null ? chartPoints[activePointIndex] : null;

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
            onClick={() => (window.location.href = "/admin/audit")}
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
          onClick={() => (window.location.href = "/admin/inventory?focus=critical-low-stock")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-8 rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/50">
          <div className="flex items-center justify-between mb-8">
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
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-colors ${
                    selectedRange === option.key
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
                  } ${isTrendLoading ? "opacity-70 cursor-wait" : ""}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {chartError ? <p className="text-xs font-semibold text-rose-500 mb-2">{chartError}</p> : null}
          <div className="h-64 px-4 relative">
            {data.trend.length === 0 || (!hasNonZeroTrend && selectedRange === "7d") ? (
              <p className="text-sm font-semibold text-slate-400 m-auto">
                No cash collected in this range.
              </p>
            ) : (
              <div className="h-full flex flex-col">
                <div className="flex-1 relative min-h-[180px]">
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="w-full h-full"
                    data-testid="trend-line-chart"
                  >
                    {[20, 40, 60, 80].map((y) => (
                      <line
                        key={y}
                        x1="0"
                        y1={String(y)}
                        x2="100"
                        y2={String(y)}
                        stroke="#e2e8f0"
                        strokeWidth="0.35"
                        strokeDasharray="1.2 1.6"
                      />
                    ))}
                    {linePath ? (
                      <path
                        d={linePath}
                        fill="none"
                        stroke={hasNonZeroTrend ? "#10b981" : "#94a3b8"}
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : null}
                    {chartPoints.map((point, index) => (
                      <circle
                        key={point.date}
                        cx={point.x}
                        cy={point.y}
                        r={activePointIndex === index ? 2.2 : 1.6}
                        fill={point.value > 0 ? "#059669" : "#94a3b8"}
                        className="cursor-pointer transition-all"
                        tabIndex={0}
                        role="button"
                        aria-label={`${point.day} ${point.date}: PKR ${point.value.toLocaleString()}`}
                        data-testid={`trend-point-${index}`}
                        onMouseEnter={() => setActivePointIndex(index)}
                        onMouseLeave={() => setActivePointIndex((prev) => (prev === index ? null : prev))}
                        onFocus={() => setActivePointIndex(index)}
                        onBlur={() => setActivePointIndex((prev) => (prev === index ? null : prev))}
                      />
                    ))}
                  </svg>

                  {activePoint ? (
                    <div
                      className="absolute z-20 -translate-x-1/2 -translate-y-full bg-white rounded-xl shadow-xl border border-slate-100 px-3 py-2 min-w-[150px]"
                      style={{
                        left: `${activePoint.x}%`,
                        top: `${Math.max(activePoint.y - 3, 8)}%`,
                      }}
                      data-testid="trend-tooltip"
                    >
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {activePoint.day} - {activePoint.date}
                      </p>
                      <p className="text-sm font-black text-slate-800 mt-1">
                        PKR {Number(activePoint.value ?? 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 mt-1">
                        Change:{" "}
                        {(() => {
                          const pointIndex = chartPoints.findIndex((point) => point.date === activePoint.date);
                          const delta = getPercentChange(pointIndex);
                          if (delta === null) return "N/A";
                          const signed = `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;
                          return signed;
                        })()}
                      </p>
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${data.trend.length}, minmax(0, 1fr))` }}>
                  {data.trend.map((point) => (
                    <span
                      key={point.date}
                      className="text-[10px] text-center font-black text-slate-400 uppercase tracking-widest truncate"
                      title={`${point.day} ${point.date}`}
                    >
                      {point.day}
                    </span>
                  ))}
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

        <Card className="p-8 rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/50">
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-8">Pulse Feed</h3>
          <div className="space-y-6">
            {data.activities.length === 0 ? (
              <p className="text-sm font-semibold text-slate-400">No recent activity found.</p>
            ) : (
              data.activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4">
                  <div
                    className={`p-2.5 rounded-xl shadow-sm ${
                      activity.status === "success"
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
                    {formatTime(activity.time)}
                  </span>
                </div>
              ))
            )}
          </div>
          <Button
            className="w-full mt-10 bg-slate-50 hover:bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold uppercase tracking-widest text-[11px] border-none shadow-none"
            onClick={() => (window.location.href = "/admin/audit")}
          >
            View All Logs
          </Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      </div>
    </div>
  );
}
