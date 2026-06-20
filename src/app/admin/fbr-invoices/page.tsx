"use client";
import React, { useEffect, useState } from "react";
import { FileText, Receipt } from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { formatDateTimeInTimezone } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

interface FbrRow {
  submission_id: number;
  bill_id: number;
  status: string;
  fbr_invoice_number: string | null;
  attempts: number;
  created_at: string;
  submitted_at: string | null;
}

const STATUS_FILTERS = ["", "queued", "submitted", "failed"];

const statusBadge = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s === "submitted") return "text-emerald-600 bg-emerald-50 border-emerald-100";
  if (s === "failed") return "text-rose-600 bg-rose-50 border-rose-100";
  if (s === "queued") return "text-amber-600 bg-amber-50 border-amber-100";
  return "text-slate-500 bg-slate-50 border-slate-100";
};

export default function FbrInvoicesPage() {
  const systemTimezone = useSystemTimezone();
  const [rows, setRows] = useState<FbrRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchRows = async () => {
      setLoading(true);
      try {
        const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
        const res = await fetch(`/api/admin/fbr-invoices${qs}`);
        const data = await res.json();
        if (!cancelled && res.ok && Array.isArray(data)) setRows(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchRows();
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">FBR Invoicing Queue</h1>
          <p className="text-slate-500 text-sm font-semibold mt-1">PRAL / FBR e-invoice submission status</p>
        </div>
      </div>

      {/* Filter + table */}
      <Card className="p-0 rounded-[2rem] border-none shadow-2xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-wrap items-center gap-3">
          <FileText className="w-5 h-5 text-slate-400" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Filter</span>
          {STATUS_FILTERS.map((s) => (
            <Button
              key={s || "all"}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              className="rounded-xl text-xs font-bold capitalize"
              onClick={() => setStatusFilter(s)}
            >
              {s || "All"}
            </Button>
          ))}
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-emerald-600 rounded-full animate-spin" />
              <p className="text-xs font-black text-slate-400 tracking-widest uppercase">Loading submissions...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-center">
              <Receipt className="w-8 h-8 text-slate-300" />
              <p className="text-sm font-bold text-slate-500">No FBR submissions matched this filter.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/50 text-left">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Submission</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bill</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">FBR Invoice #</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((r) => (
                  <tr key={r.submission_id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4 font-bold text-slate-700">#{r.submission_id}</td>
                    <td className="px-6 py-4 font-medium text-slate-600">#{r.bill_id}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${statusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{r.fbr_invoice_number || "—"}</td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                      {r.submitted_at ? formatDateTimeInTimezone(r.submitted_at, systemTimezone) : "—"}
                    </td>
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
