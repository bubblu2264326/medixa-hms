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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Approvals</h1>
        <p className="text-sm text-muted-foreground mt-1">Unified queue for leave and attendance correction approvals.</p>
      </div>

      {error ? <Card className="border border-destructive/20 bg-destructive/10 p-4 rounded-lg"><p className="text-sm font-medium text-destructive">{error}</p></Card> : null}

      <Card className="rounded-lg border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-foreground">Pending Items</p>
          <Button onClick={load} className="h-9 rounded-md bg-muted text-foreground hover:bg-accent text-xs font-medium px-3">Refresh</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="bg-muted">
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Created</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Type</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Staff</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Request</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-3 py-8 text-sm text-muted-foreground font-medium">Loading approvals…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-8 text-sm text-muted-foreground font-medium">No pending approvals.</td></tr>
              ) : items.map((item) => {
                const busy = workingId === `${item.approval_type}:${item.request_id}`;
                return (
                  <tr key={`${item.approval_type}:${item.request_id}`} className="border-t border-border">
                    <td className="px-3 py-2 text-xs font-medium text-foreground font-mono tabular-nums">{formatDateTimeInTimezone(item.created_at, systemTimezone)}</td>
                    <td className="px-3 py-2 text-xs font-medium text-foreground uppercase">{item.approval_type}</td>
                    <td className="px-3 py-2 text-xs font-medium text-foreground">{item.staff_name}</td>
                    <td className="px-3 py-2 text-xs font-medium text-foreground">
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-muted-foreground">{item.subtitle}</p>
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-1 rounded-md bg-warning/15 text-warning-foreground text-[10px] font-semibold uppercase tracking-wide">{item.status}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-2">
                        <Button disabled={busy} onClick={() => decide(item, "approved")} className="h-8 rounded-md bg-success hover:bg-success/90 text-success-foreground text-[10px] font-semibold uppercase tracking-wide px-3">Approve</Button>
                        <Button disabled={busy} onClick={() => decide(item, "rejected")} className="h-8 rounded-md bg-destructive hover:bg-destructive/90 text-white text-[10px] font-semibold uppercase tracking-wide px-3">Reject</Button>
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
