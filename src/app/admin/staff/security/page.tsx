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
    "h-10 rounded-2xl bg-none bg-[#0A9F6A] hover:bg-[#087A53] text-white text-xs font-black uppercase tracking-widest px-4 shadow-[0_6px_14px_rgba(10,159,106,0.24)] focus:ring-[#0A9F6A]";

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
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Security Sessions</h1>
        <p className="text-sm text-slate-500 font-semibold mt-1">Account lockout and forced session management controls.</p>
      </div>

      {error ? <Card className="border border-red-100 bg-red-50 p-4 rounded-2xl"><p className="text-sm font-semibold text-red-700">{error}</p></Card> : null}
      {resultMessage ? <Card className="border border-emerald-100 bg-emerald-50 p-4 rounded-2xl"><p className="text-sm font-semibold text-emerald-700">{resultMessage}</p></Card> : null}

      <Card className="rounded-3xl border border-slate-100 p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <select
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm md:w-[360px]"
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
          <p className="text-sm font-semibold text-slate-500">Loading security state…</p>
        ) : payload?.staff ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card className="p-3 rounded-xl border border-slate-100"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p><p className="text-sm font-bold text-slate-800 mt-1">{payload.staff.employment_status}</p></Card>
              <Card className="p-3 rounded-xl border border-slate-100"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Failed Attempts</p><p className="text-sm font-bold text-slate-800 mt-1">{payload.staff.failed_login_attempts}</p></Card>
              <Card className="p-3 rounded-xl border border-slate-100"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Sessions</p><p className="text-sm font-bold text-emerald-700 mt-1">{activeSessions}</p></Card>
              <Card className="p-3 rounded-xl border border-slate-100"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Session Version</p><p className="text-sm font-bold text-slate-800 mt-1">{payload.staff.session_version}</p></Card>
              <Card className="p-3 rounded-xl border border-slate-100"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Locked Until</p><p className="text-sm font-bold text-slate-800 mt-1">{payload.staff.account_locked_until ? formatDateTimeInTimezone(payload.staff.account_locked_until, systemTimezone) : "-"}</p></Card>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50/70">
                    <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Login</th>
                    <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Last Seen</th>
                    <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">IP</th>
                    <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Agent</th>
                    <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">State</th>
                  </tr>
                </thead>
                <tbody>
                  {(payload.sessions ?? []).map((s) => (
                    <tr key={s.session_id} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-xs font-semibold text-slate-700">{formatDateTimeInTimezone(s.login_at, systemTimezone)}</td>
                      <td className="px-3 py-2 text-xs font-semibold text-slate-700">{formatDateTimeInTimezone(s.last_seen_at, systemTimezone)}</td>
                      <td className="px-3 py-2 text-xs font-semibold text-slate-700">{s.ip_address || "-"}</td>
                      <td className="px-3 py-2 text-xs font-semibold text-slate-700 max-w-[360px] truncate">{s.user_agent || "-"}</td>
                      <td className="px-3 py-2">
                        {s.revoked_at ? (
                          <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest">Revoked</span>
                        ) : (
                          <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest">Active</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm font-semibold text-slate-500">Select an employee to inspect security sessions.</p>
        )}
      </Card>
    </div>
  );
}
