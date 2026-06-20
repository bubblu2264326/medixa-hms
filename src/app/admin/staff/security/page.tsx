"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { Lock, ShieldCheck } from "lucide-react";
import { formatDateTimeInTimezone } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

type StaffLite = {
  account_type: "staff" | "doctor";
  staff_id: number;
  name: string;
  user_code: string;
  role: string;
};
type SessionRow = {
  session_id: string;
  login_at: string;
  last_seen_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
  revoked_at?: string | null;
  revoked_reason?: string | null;
};

type SecurityPayload = {
  staff: {
    account_type?: "staff" | "doctor";
    staff_id: number;
    user_code: string;
    name: string;
    role: string;
    employment_status: string;
    failed_login_attempts: number;
    account_locked_until?: string | null;
    last_login_at?: string | null;
    mfa_enabled?: boolean;
    session_version: number;
  };
  sessions: SessionRow[];
};

export default function StaffSecurityPage() {
  const systemTimezone = useSystemTimezone();
  const [staff, setStaff] = useState<StaffLite[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [payload, setPayload] = useState<SecurityPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const actionBtnClass =
    "h-10 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4";

  const activeSessions = useMemo(
    () => (payload?.sessions ?? []).filter((s) => !s.revoked_at).length,
    [payload]
  );
  const selectedStaff = useMemo(
    () => staff.find((s) => `${s.account_type}:${s.staff_id}` === selectedAccount) ?? null,
    [staff, selectedAccount]
  );

  const loadStaff = useCallback(async () => {
    const res = await fetch("/api/admin/staff", { credentials: "include" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load staff list");
    const rows: StaffLite[] = (Array.isArray(data) ? data : []).map((row: any) => ({
      account_type: row?.account_type === "doctor" ? "doctor" : "staff",
      staff_id: Number(row.staff_id),
      name: String(row.name ?? ""),
      user_code: String(row.user_code ?? ""),
      role: String(row.role ?? ""),
    }));
    setStaff(rows);
    if (!selectedAccount && rows[0]) setSelectedAccount(`${rows[0].account_type}:${rows[0].staff_id}`);
  }, [selectedAccount]);

  const loadSecurity = async (entry: StaffLite) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/staff/security?staff_id=${entry.staff_id}&account_type=${entry.account_type}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load staff security data");
      setPayload(data as SecurityPayload);
    } catch (e: any) {
      setPayload(null);
      setError(e?.message || "Failed to load staff security data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff().catch((e) => setError(e?.message || "Failed to load staff list"));
  }, [loadStaff]);

  useEffect(() => {
    if (selectedStaff) loadSecurity(selectedStaff);
  }, [selectedStaff]);

  const runAction = async (action: string) => {
    if (!selectedStaff) return;
    setWorking(true);
    setError("");
    setResultMessage("");
    try {
      const res = await fetch("/api/admin/staff/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          staff_id: selectedStaff.staff_id,
          account_type: selectedStaff.account_type,
          action,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Failed to ${action}`);

      let nextMessage = "";
      if (action === "reset_password" && data?.temp_password) {
        nextMessage = `Temporary password: ${data.temp_password}`;
      } else if (action === "issue_reset_token" && data?.reset_token) {
        nextMessage = `Reset token: ${data.reset_token} (expires ${data?.expires_at ?? "soon"})`;
      } else {
        nextMessage = `${action.replace("_", " ")} successful.`;
      }

      await loadSecurity(selectedStaff);
      setResultMessage(nextMessage);
    } catch (e: any) {
      setError(e?.message || `Failed to ${action}`);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Security Sessions</h1>
        <p className="text-sm text-muted-foreground mt-1">Account lockout and forced session management controls.</p>
      </div>

      {error ? <Card className="border border-destructive/20 bg-destructive/10 p-4 rounded-lg"><p className="text-sm font-medium text-destructive">{error}</p></Card> : null}
      {resultMessage ? <Card className="border border-success/20 bg-success/10 p-4 rounded-lg"><p className="text-sm font-medium text-success">{resultMessage}</p></Card> : null}

      <Card className="rounded-lg border border-border p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <select
            className="h-10 rounded-md border border-input px-3 text-sm md:w-[360px]"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            {staff.map((s) => (
              <option key={`${s.account_type}:${s.staff_id}`} value={`${s.account_type}:${s.staff_id}`}>
                {s.name} ({s.user_code}) - {s.account_type}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-2">
            <Button disabled={working || !selectedStaff} onClick={() => runAction("lock_account")} className={actionBtnClass}>
              <Lock className="w-4 h-4 mr-1" /> Lock
            </Button>
            <Button disabled={working || !selectedStaff} onClick={() => runAction("unlock_account")} className={actionBtnClass}>
              <ShieldCheck className="w-4 h-4 mr-1" /> Unlock
            </Button>
            <Button disabled={working || !selectedStaff} onClick={() => runAction("force_logout")} className={actionBtnClass}>
              Force Logout
            </Button>
            <Button disabled={working || !selectedStaff} onClick={() => runAction("reset_password")} className={actionBtnClass}>
              Reset Password
            </Button>
            <Button disabled={working || !selectedStaff} onClick={() => runAction("issue_reset_token")} className={actionBtnClass}>
              Issue Token
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm font-medium text-muted-foreground">Loading security state…</p>
        ) : payload?.staff ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card className="p-3 rounded-md border border-border"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</p><p className="text-sm font-semibold text-foreground mt-1">{payload.staff.employment_status}</p></Card>
              <Card className="p-3 rounded-md border border-border"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Failed Attempts</p><p className="text-sm font-semibold text-foreground mt-1 font-mono tabular-nums">{payload.staff.failed_login_attempts}</p></Card>
              <Card className="p-3 rounded-md border border-border"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Active Sessions</p><p className="text-sm font-semibold text-success mt-1 font-mono tabular-nums">{activeSessions}</p></Card>
              <Card className="p-3 rounded-md border border-border"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Session Version</p><p className="text-sm font-semibold text-foreground mt-1 font-mono tabular-nums">{payload.staff.session_version}</p></Card>
              <Card className="p-3 rounded-md border border-border"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Locked Until</p><p className="text-sm font-semibold text-foreground mt-1 font-mono tabular-nums">{payload.staff.account_locked_until ? formatDateTimeInTimezone(payload.staff.account_locked_until, systemTimezone) : "-"}</p></Card>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead>
                  <tr className="bg-muted">
                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Login</th>
                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Last Seen</th>
                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">IP</th>
                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Agent</th>
                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">State</th>
                  </tr>
                </thead>
                <tbody>
                  {(payload.sessions ?? []).map((s) => (
                    <tr key={s.session_id} className="border-t border-border">
                      <td className="px-3 py-2 text-xs font-medium text-foreground font-mono tabular-nums">{formatDateTimeInTimezone(s.login_at, systemTimezone)}</td>
                      <td className="px-3 py-2 text-xs font-medium text-foreground font-mono tabular-nums">{formatDateTimeInTimezone(s.last_seen_at, systemTimezone)}</td>
                      <td className="px-3 py-2 text-xs font-medium text-foreground font-mono tabular-nums">{s.ip_address || "-"}</td>
                      <td className="px-3 py-2 text-xs font-medium text-foreground max-w-[360px] truncate">{s.user_agent || "-"}</td>
                      <td className="px-3 py-2">
                        {s.revoked_at ? (
                          <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">Revoked</span>
                        ) : (
                          <span className="px-2 py-1 rounded-md bg-success/10 text-success text-[10px] font-semibold uppercase tracking-wide">Active</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm font-medium text-muted-foreground">Select an employee to inspect security sessions.</p>
        )}
      </Card>
    </div>
  );
}
