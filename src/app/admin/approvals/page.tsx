"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { formatDateTimeInTimezone } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

type ApprovalItem = {
  approval_type: "leave" | "attendance";
  request_id: string;
  created_at: string;
  status: string;
  staff_id: number;
  staff_name: string;
  title: string;
  subtitle: string;
};

type ApprovalPayload = {
  leave?: ApprovalItem[];
  attendance?: ApprovalItem[];
};

export default function ApprovalsPage() {
  const systemTimezone = useSystemTimezone();
  const [data, setData] = useState<ApprovalPayload>({});
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const items = useMemo(() => {
    const leave = data.leave ?? [];
    const attendance = data.attendance ?? [];
    return [...leave, ...attendance].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [data]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/staff/v2/approvals?type=all", { credentials: "include" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Failed to load approvals");
      setData(payload as ApprovalPayload);
    } catch (e: any) {
      setError(e?.message || "Failed to load approvals");
      setData({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const decide = async (item: ApprovalItem, decision: "approved" | "rejected") => {
    setWorkingId(`${item.approval_type}:${item.request_id}`);
    setError("");
    try {
      const res = await fetch("/api/admin/staff/v2/approvals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          approval_type: item.approval_type,
          request_id: Number(item.request_id),
          decision,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || `Failed to ${decision}`);
      await load();
    } catch (e: any) {
      setError(e?.message || `Failed to ${decision}`);
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Approvals</h1>
        <p className="text-sm text-slate-500 font-semibold mt-1">Unified queue for leave and attendance correction approvals.</p>
      </div>

      {error ? <Card className="border border-red-100 bg-red-50 p-4 rounded-2xl"><p className="text-sm font-semibold text-red-700">{error}</p></Card> : null}

      <Card className="rounded-3xl border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-700">Pending Items</p>
          <Button onClick={load} className="h-9 rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 text-xs font-bold uppercase tracking-widest px-3">Refresh</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/70">
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Created</th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Staff</th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Request</th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-3 py-8 text-sm text-slate-500 font-semibold">Loading approvals…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-8 text-sm text-slate-500 font-semibold">No pending approvals.</td></tr>
              ) : items.map((item) => {
                const busy = workingId === `${item.approval_type}:${item.request_id}`;
                return (
                  <tr key={`${item.approval_type}:${item.request_id}`} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-xs font-semibold text-slate-700">{formatDateTimeInTimezone(item.created_at, systemTimezone)}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-slate-700 uppercase">{item.approval_type}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-slate-700">{item.staff_name}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-slate-700">
                      <p className="font-bold">{item.title}</p>
                      <p className="text-slate-500">{item.subtitle}</p>
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest">{item.status}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-2">
                        <Button disabled={busy} onClick={() => decide(item, "approved")} className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest px-3">Approve</Button>
                        <Button disabled={busy} onClick={() => decide(item, "rejected")} className="h-8 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest px-3">Reject</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
