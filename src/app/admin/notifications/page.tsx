"use client";
import React, { useEffect, useState } from "react";
import { Bell, Send, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { formatDateTimeInTimezone } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

interface NotificationRow {
  notification_id: number;
  channel: string;
  recipient: string;
  template: string;
  status: string;
  related_entity: string | null;
  attempts: number;
  created_at: string;
  sent_at: string | null;
}

const STATUS_FILTERS = ["", "queued", "sent", "failed"];

const statusBadge = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s === "sent") return "text-success bg-success/10 border-success/20";
  if (s === "failed") return "text-destructive bg-destructive/10 border-destructive/20";
  if (s === "queued") return "text-warning-foreground bg-warning/15 border-warning/20";
  return "text-muted-foreground bg-muted border-border";
};

export default function NotificationsPage() {
  const systemTimezone = useSystemTimezone();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchRows = async () => {
      setLoading(true);
      try {
        const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
        const res = await fetch(`/api/admin/notifications${qs}`);
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

  const counts = {
    queued: rows.filter((r) => r.status === "queued").length,
    sent: rows.filter((r) => r.status === "sent").length,
    failed: rows.filter((r) => r.status === "failed").length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">Notifications Outbox</h1>
          <p className="text-muted-foreground text-sm mt-1">WhatsApp &amp; SMS delivery queue with retry tracking</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-lg border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-warning/15 rounded-md flex items-center justify-center">
            <Clock className="w-6 h-6 text-warning-foreground" aria-hidden />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Queued</p>
            <p className="text-2xl font-semibold text-foreground font-mono tabular-nums">{counts.queued}</p>
          </div>
        </Card>
        <Card className="rounded-lg border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-success/10 rounded-md flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-success" aria-hidden />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Sent</p>
            <p className="text-2xl font-semibold text-foreground font-mono tabular-nums">{counts.sent}</p>
          </div>
        </Card>
        <Card className="rounded-lg border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-destructive/10 rounded-md flex items-center justify-center">
            <XCircle className="w-6 h-6 text-destructive" aria-hidden />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Failed</p>
            <p className="text-2xl font-semibold text-foreground font-mono tabular-nums">{counts.failed}</p>
          </div>
        </Card>
      </div>

      {/* Filter + table */}
      <Card className="p-0 rounded-lg border border-border shadow-sm bg-card overflow-hidden">
        <div className="p-6 border-b border-border flex flex-wrap items-center gap-3">
          <Bell className="w-5 h-5 text-muted-foreground" aria-hidden />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mr-2">Filter</span>
          {STATUS_FILTERS.map((s) => (
            <Button
              key={s || "all"}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              className="rounded-md text-xs font-semibold capitalize"
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
              <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">Loading outbox...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-center">
              <Send className="w-8 h-8 text-muted-foreground" aria-hidden />
              <p className="text-sm font-semibold text-muted-foreground">No notifications matched this filter.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-left">
                  <th className="px-6 py-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Channel</th>
                  <th className="px-6 py-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Recipient</th>
                  <th className="px-6 py-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Template</th>
                  <th className="px-6 py-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-6 py-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Attempts</th>
                  <th className="px-6 py-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.notification_id} className="hover:bg-accent transition-all">
                    <td className="px-6 py-4 font-semibold text-foreground uppercase text-xs">{r.channel}</td>
                    <td className="px-6 py-4 font-medium text-muted-foreground font-mono tabular-nums text-xs">{r.recipient}</td>
                    <td className="px-6 py-4 font-medium text-muted-foreground">{r.template}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[9px] font-semibold uppercase tracking-wide border ${statusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground font-mono tabular-nums">{r.attempts}</td>
                    <td className="px-6 py-4 text-muted-foreground font-mono tabular-nums text-xs">{formatDateTimeInTimezone(r.created_at, systemTimezone)}</td>
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
