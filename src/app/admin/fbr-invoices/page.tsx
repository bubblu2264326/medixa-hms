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
  if (s === "submitted") return "text-success bg-success/10 border-success/20";
  if (s === "failed") return "text-destructive bg-destructive/10 border-destructive/20";
  if (s === "queued") return "bg-warning/15 text-warning-foreground border-warning/20";
  return "text-muted-foreground bg-muted border-border";
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">FBR Invoicing Queue</h1>
          <p className="text-muted-foreground text-sm mt-1">PRAL / FBR e-invoice submission status</p>
        </div>
      </div>

      {/* Filter + table */}
      <Card className="p-0 rounded-lg border border-border shadow-sm bg-card overflow-hidden">
        <div className="p-6 border-b border-border flex flex-wrap items-center gap-3">
          <FileText className="w-5 h-5 text-muted-foreground" aria-hidden />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mr-2">Filter</span>
          {STATUS_FILTERS.map((s) => (
            <Button
              key={s || "all"}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              className="rounded-md text-xs font-medium capitalize"
              onClick={() => setStatusFilter(s)}
            >
              {s || "All"}
            </Button>
          ))}
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin" />
              <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">Loading submissions...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-center">
              <Receipt className="w-8 h-8 text-muted-foreground" aria-hidden />
              <p className="text-sm font-medium text-muted-foreground">No FBR submissions matched this filter.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-left">
                  <th className="px-6 py-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Submission</th>
                  <th className="px-6 py-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Bill</th>
                  <th className="px-6 py-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-6 py-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">FBR Invoice #</th>
                  <th className="px-6 py-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.submission_id} className="hover:bg-accent transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground font-mono tabular-nums">#{r.submission_id}</td>
                    <td className="px-6 py-4 font-medium text-muted-foreground font-mono tabular-nums">#{r.bill_id}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[9px] font-semibold uppercase tracking-wide border ${statusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono tabular-nums text-xs text-muted-foreground">{r.fbr_invoice_number || "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground font-mono tabular-nums text-xs">
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
