"use client";
import React, { useEffect, useState } from "react";
import { ShieldAlert, Pill, Download } from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { downloadCsv } from "@/src/lib/csv";
import { formatDateTimeInTimezone, getTimezoneNowDateInput, getDateInputInTimezone } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

interface NarcoticsRow {
  movement_at: string;
  movement_type: string;
  medicine_id: number;
  generic_name: string | null;
  brand_name: string | null;
  controlled_schedule: string | null;
  batch_id: number | null;
  qty_units: number | null;
  qty_sub_units: number | null;
  sale_id: number | null;
  visit_id: number | null;
  staff_id: number | null;
  staff_name: string | null;
}

const movementBadge = (type: string) => {
  const t = (type || "").toLowerCase();
  if (t.includes("return") || t.includes("in")) return "text-success bg-success/10 border-success/20";
  if (t.includes("dispense") || t.includes("out")) return "text-destructive bg-destructive/10 border-destructive/20";
  return "text-muted-foreground bg-muted border-border";
};

export default function NarcoticsRegisterPage() {
  const systemTimezone = useSystemTimezone();
  const [rows, setRows] = useState<NarcoticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Default range: last 30 days through today (in system timezone).
  useEffect(() => {
    if (!systemTimezone) return;
    const today = getTimezoneNowDateInput(systemTimezone);
    const thirtyDaysAgo = getDateInputInTimezone(Date.now() - 30 * 24 * 60 * 60 * 1000, systemTimezone);
    setFrom((prev) => prev || thirtyDaysAgo);
    setTo((prev) => prev || today);
  }, [systemTimezone]);

  const fetchRows = async (fromDate: string, toDate: string) => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (fromDate) sp.set("from", fromDate);
      if (toDate) sp.set("to", toDate);
      const qs = sp.toString();
      const res = await fetch(`/api/pharmacy/narcotics-register${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setRows(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!from && !to) return;
    void fetchRows(from, to);
  }, [from, to]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">Narcotics Register</h1>
          <p className="text-muted-foreground text-sm mt-1">DRAP controlled-drug movement ledger</p>
        </div>
      </div>

      {/* Date range filter */}
      <Card className="rounded-lg border border-border shadow-sm flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44 rounded-md" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44 rounded-md" />
        </div>
        <Button
          variant="default"
          className="rounded-md font-medium"
          onClick={() => void fetchRows(from, to)}
        >
          Apply
        </Button>
        <Button
          variant="outline"
          className="rounded-md font-medium"
          disabled={rows.length === 0}
          onClick={() =>
            downloadCsv(
              `narcotics-register${from ? `-${from}` : ""}${to ? `-to-${to}` : ""}.csv`,
              ["Movement At", "Type", "Generic", "Brand", "Schedule", "Batch", "Qty Units", "Qty Sub-units", "Sale ID", "Visit ID", "Staff"],
              rows.map((r) => [
                formatDateTimeInTimezone(r.movement_at, systemTimezone),
                r.movement_type,
                r.generic_name ?? "",
                r.brand_name ?? "",
                r.controlled_schedule ?? "",
                r.batch_id ?? "",
                r.qty_units ?? "",
                r.qty_sub_units ?? "",
                r.sale_id ?? "",
                r.visit_id ?? "",
                r.staff_name ?? "",
              ])
            )
          }
        >
          <Download className="w-4 h-4 mr-2" aria-hidden />
          Export CSV
        </Button>
      </Card>

      {/* Table */}
      <Card className="p-0 rounded-lg border border-border shadow-sm bg-card overflow-hidden">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-destructive" aria-hidden />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Controlled-Drug Movements</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin" />
              <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">Loading register...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-center">
              <Pill className="w-8 h-8 text-muted-foreground" aria-hidden />
              <p className="text-sm font-medium text-muted-foreground">No controlled-drug movements in this range.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-left">
                  <th className="px-6 py-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Movement At</th>
                  <th className="px-6 py-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                  <th className="px-6 py-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Generic</th>
                  <th className="px-6 py-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Schedule</th>
                  <th className="px-6 py-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Qty (units)</th>
                  <th className="px-6 py-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, idx) => (
                  <tr key={`${r.sale_id ?? "x"}-${r.medicine_id}-${idx}`} className="hover:bg-accent transition-colors">
                    <td className="px-6 py-4 text-muted-foreground font-mono tabular-nums text-xs">{formatDateTimeInTimezone(r.movement_at, systemTimezone)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[9px] font-semibold uppercase tracking-wide border ${movementBadge(r.movement_type)}`}>
                        {r.movement_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">{r.generic_name || r.brand_name || "—"}</td>
                    <td className="px-6 py-4 font-medium text-muted-foreground uppercase text-xs">{r.controlled_schedule || "—"}</td>
                    <td className="px-6 py-4 font-medium text-foreground font-mono tabular-nums">{r.qty_units ?? "—"}</td>
                    <td className="px-6 py-4 font-medium text-muted-foreground">{r.staff_name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
