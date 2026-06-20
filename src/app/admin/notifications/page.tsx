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
  if (s === "sent") return "text-emerald-600 bg-emerald-50 border-emerald-100";
  if (s === "failed") return "text-rose-600 bg-rose-50 border-rose-100";
  if (s === "queued") return "text-amber-600 bg-amber-50 border-amber-100";
  return "text-slate-500 bg-slate-50 border-slate-100";
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
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Notifications Outbox</h1>
          <p className="text-slate-500 text-sm font-semibold mt-1">WhatsApp &amp; SMS delivery queue with retry tracking</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-none shadow-lg shadow-slate-200/50 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Queued</p>
            <p className="text-2xl font-black text-slate-800">{counts.queued}</p>
          </div>
        </Card>
        <Card className="rounded-3xl border-none shadow-lg shadow-slate-200/50 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sent</p>
            <p className="text-2xl font-black text-slate-800">{counts.sent}</p>
          </div>
        </Card>
        <Card className="rounded-3xl border-none shadow-lg shadow-slate-200/50 flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center">
            <XCircle className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Failed</p>
            <p className="text-2xl font-black text-slate-800">{counts.failed}</p>
          </div>
        </Card>
      </div>

      {/* Filter + table */}
      <Card className="p-0 rounded-[2rem] border-none shadow-2xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-wrap items-center gap-3">
          <Bell className="w-5 h-5 text-slate-400" />
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
              <p className="text-xs font-black text-slate-400 tracking-widest uppercase">Loading outbox...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-center">
              <Send className="w-8 h-8 text-slate-300" />
              <p className="text-sm font-bold text-slate-500">No notifications matched this filter.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/50 text-left">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Channel</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Recipient</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Template</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Attempts</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((r) => (
                  <tr key={r.notification_id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4 font-bold text-slate-700 uppercase text-xs">{r.channel}</td>
                    <td className="px-6 py-4 font-medium text-slate-600 font-mono text-xs">{r.recipient}</td>
                    <td className="px-6 py-4 font-medium text-slate-600">{r.template}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${statusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">{r.attempts}</td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{formatDateTimeInTimezone(r.created_at, systemTimezone)}</td>
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
