"use client";

import { usePatient } from "@/contexts/PatientIdContext";
import { History, Search, X } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { getVisitColor, groupHistoryByVisit } from "@/src/features/doctor/history-utils";
import { formatDateTimeInTimezone } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

import { usePreviousLabOrders } from "../hooks/usePreviousLabOrders";

type DatePreset = "all" | "7d" | "30d" | "90d" | "custom";

function toTimestamp(input?: string) {
  if (!input) return null;
  const ts = new Date(input).getTime();
  return Number.isNaN(ts) ? null : ts;
}

export default function PreviousLabOrders() {
  const { patientId } = usePatient();
  const { previousData, loading } = usePreviousLabOrders();
  const systemTimezone = useSystemTimezone();
  const [searchQuery, setSearchQuery] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [visitFilter, setVisitFilter] = useState("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    setSearchQuery("");
    setDoctorFilter("all");
    setVisitFilter("all");
    setDatePreset("all");
    setFromDate("");
    setToDate("");
  }, [patientId]);

  const doctorOptions = useMemo(
    () => Array.from(new Set(previousData.map((item) => item.ordered_by).filter(Boolean))),
    [previousData]
  );

  const visitOptions = useMemo(
    () => Array.from(new Set(previousData.map((item) => String(item.visit_id)).filter(Boolean))),
    [previousData]
  );

  const filteredLabOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = Date.now();
    const presetMillis =
      datePreset === "7d"
        ? 7 * 24 * 60 * 60 * 1000
        : datePreset === "30d"
          ? 30 * 24 * 60 * 60 * 1000
          : datePreset === "90d"
            ? 90 * 24 * 60 * 60 * 1000
            : null;

    return previousData.filter((item) => {
      if (doctorFilter !== "all" && item.ordered_by !== doctorFilter) return false;
      if (visitFilter !== "all" && String(item.visit_id) !== visitFilter) return false;

      const rowTimestamp = toTimestamp(item.visit_timestamp || item.order_date);
      if (presetMillis != null) {
        if (!rowTimestamp || now - rowTimestamp > presetMillis) return false;
      }
      if (datePreset === "custom") {
        const fromTs = fromDate ? toTimestamp(fromDate) : null;
        const toTs = toDate ? toTimestamp(toDate) : null;
        if (fromTs && (!rowTimestamp || rowTimestamp < fromTs)) return false;
        if (toTs) {
          const inclusiveTo = toTs + 24 * 60 * 60 * 1000 - 1;
          if (!rowTimestamp || rowTimestamp > inclusiveTo) return false;
        }
      }

      if (!query) return true;
      const haystack = [
        item.test_name,
        item.category,
        item.status,
        item.ordered_by,
        item.order_date,
        item.visit_timestamp,
        String(item.visit_id),
        String(item.price),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [datePreset, doctorFilter, fromDate, previousData, searchQuery, toDate, visitFilter]);

  const groupedFilteredHistory = useMemo(() => {
    return groupHistoryByVisit(filteredLabOrders);
  }, [filteredLabOrders]);

  const clearFilters = () => {
    setSearchQuery("");
    setDoctorFilter("all");
    setVisitFilter("all");
    setDatePreset("all");
    setFromDate("");
    setToDate("");
  };

  const formatPrice = (value: number) => {
    if (Number.isNaN(value)) return "-";
    return `Rs${Number(value).toLocaleString()}`;
  };

  const normalizeStatus = (value: string) => {
    const normalized = value.toLowerCase();
    if (normalized.includes("pending")) return "bg-warning/15 text-warning-foreground";
    if (normalized.includes("done") || normalized.includes("completed")) return "bg-success/10 text-success";
    if (normalized.includes("cancel")) return "bg-destructive/10 text-destructive";
    return "bg-muted text-muted-foreground";
  };

  const formatDate = (value?: string) => {
    if (!value) return "-";
    return formatDateTimeInTimezone(value, systemTimezone);
  };

  const openFullHistory = () => {
    window.dispatchEvent(new CustomEvent("switch-doctor-tab", { detail: { tab: "pastVisits" } }));
  };

  return (
    <section className="rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/50 px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              Patient Lab History
            </h3>
            <span className="rounded-md border border-border bg-card px-2 py-0.5 text-[10px] font-semibold font-mono tabular-nums text-muted-foreground whitespace-nowrap">
              {patientId ? `${filteredLabOrders.length}/${previousData.length}` : "Waiting"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openFullHistory}
              disabled={!patientId}
              className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-card px-3 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              View Full History
            </button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Patient-wide history (all treating doctors)
        </p>

        {patientId && previousData.length > 0 && (
          <div className="grid gap-1.5 lg:grid-cols-[minmax(220px,1fr)_160px_140px_auto_auto]">
            <label className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Search size={15} aria-hidden />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search test, doctor, visit, date..."
                className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-xs text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </label>

            <select
              value={doctorFilter}
              onChange={(event) => setDoctorFilter(event.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              <option value="all">All doctors</option>
              {doctorOptions.map((doctor) => (
                <option key={doctor} value={doctor}>
                  {doctor}
                </option>
              ))}
            </select>

            <select
              value={visitFilter}
              onChange={(event) => setVisitFilter(event.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              <option value="all">All visits</option>
              {visitOptions.map((visitId) => (
                <option key={visitId} value={visitId}>
                  Visit #{visitId}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 rounded-md border border-input bg-background p-1">
              {(["all", "7d", "30d", "90d", "custom"] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDatePreset(preset)}
                  className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition ${
                    datePreset === preset
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <X size={12} aria-hidden />
              Clear
            </button>
          </div>
        )}

        {datePreset === "custom" && patientId && (
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              aria-label="From date"
            />
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              aria-label="To date"
            />
          </div>
        )}
      </div>

      <div id="previous-lab-orders-panel" className="mt-2.5">
        {!patientId ? (
          <div className="flex min-h-[8rem] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/50 px-6 text-center">
            <History size={22} className="text-muted-foreground" aria-hidden />
            <div>
              <h4 className="text-base font-semibold tracking-tight text-foreground">No patient selected</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a patient from the queue to review prior lab orders.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex min-h-[8rem] items-center justify-center rounded-lg border border-border bg-muted/50 text-sm font-medium text-muted-foreground">
            Loading lab history...
          </div>
        ) : groupedFilteredHistory.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="max-h-[34rem] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted">
                  <tr className="text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2">Date/Time</th>
                    <th className="px-3 py-2">Visit ID</th>
                    <th className="px-3 py-2">Test</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Ordered By</th>
                    <th className="px-3 py-2">Price</th>
                  </tr>
                </thead>
                <tbody className="bg-card">
                  {groupedFilteredHistory.map((group) => {
                    const tintClass = getVisitColor(group.visitId);

                    return (
                      <Fragment key={`lab-group-${group.visitId}`}>
                        <tr className={`border-t ${tintClass}`}>
                          <td
                            colSpan={7}
                            className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                          >
                            Visit #{group.visitId} · {formatDate(group.items[0]?.visit_timestamp || group.items[0]?.order_date)}
                          </td>
                        </tr>

                        {group.items.map((item, index) => (
                          <tr
                            key={String(item.order_id ?? `${group.visitId}-${index}`)}
                            className="border-t border-border text-xs"
                          >
                            <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">
                              {formatDate(item.visit_timestamp || item.order_date)}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground whitespace-nowrap font-mono tabular-nums">#{item.visit_id}</td>
                            <td className="px-3 py-2 font-semibold text-foreground">{item.test_name || "-"}</td>
                            <td className="px-3 py-2 text-muted-foreground">{item.category || "-"}</td>
                            <td className="px-3 py-2">
                              <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${normalizeStatus(item.status || "")}`}>
                                {item.status || "-"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{item.ordered_by || "-"}</td>
                            <td className="px-3 py-2 text-muted-foreground whitespace-nowrap font-mono tabular-nums">{formatPrice(Number(item.price ?? 0))}</td>
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-muted/50 px-4 py-8 text-center text-sm text-muted-foreground">
            No lab rows match your current filters.
          </div>
        )}
      </div>
    </section>
  );
}
