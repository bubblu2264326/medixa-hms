"use client";
import React, { useEffect, useState } from "react";
import { ShieldAlert, Pill } from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
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
  if (t.includes("return") || t.includes("in")) return "text-emerald-600 bg-emerald-50 border-emerald-100";
  if (t.includes("dispense") || t.includes("out")) return "text-rose-600 bg-rose-50 border-rose-100";
  return "text-slate-500 bg-slate-50 border-slate-100";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Narcotics Register</h1>
          <p className="text-slate-500 text-sm font-semibold mt-1">DRAP controlled-drug movement ledger</p>
        </div>
      </div>

      {/* Date range filter */}
      <Card className="rounded-[2rem] border-none shadow-lg shadow-slate-200/50 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44 rounded-xl" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44 rounded-xl" />
        </div>
        <Button
          variant="default"
          className="rounded-xl font-bold"
          onClick={() => void fetchRows(from, to)}
        >
          Apply
        </Button>
      </Card>

      {/* Table */}
      <Card className="p-0 rounded-[2rem] border-none shadow-2xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Controlled-Drug Movements</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-emerald-600 rounded-full animate-spin" />
              <p className="text-xs font-black text-slate-400 tracking-widest uppercase">Loading register...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-center">
              <Pill className="w-8 h-8 text-slate-300" />
              <p className="text-sm font-bold text-slate-500">No controlled-drug movements in this range.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/50 text-left">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Movement At</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Generic</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Schedule</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty (units)</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((r, idx) => (
                  <tr key={`${r.sale_id ?? "x"}-${r.medicine_id}-${idx}`} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{formatDateTimeInTimezone(r.movement_at, systemTimezone)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${movementBadge(r.movement_type)}`}>
                        {r.movement_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{r.generic_name || r.brand_name || "—"}</td>
                    <td className="px-6 py-4 font-bold text-slate-600 uppercase text-xs">{r.controlled_schedule || "—"}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{r.qty_units ?? "—"}</td>
                    <td className="px-6 py-4 font-medium text-slate-600">{r.staff_name || "—"}</td>
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
