"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/src/components/ui/Button";
import { logoutUser } from "@/src/features/Login/api";
import { formatTimeInTimezone } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

type UserSession = {
  user_code: string;
  role: string;
  name: string;
  account_type?: "staff" | "doctor";
};

type AttendanceRecord = {
  attendance_id: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
};

export function SidebarAttendance() {
  const systemTimezone = useSystemTimezone();
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"check_in" | "check_out" | null>(null);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [userRes, statusRes] = await Promise.all([
          fetch("/api/user", { credentials: "include", cache: "no-store" }),
          fetch("/api/attendance/me/status", { credentials: "include", cache: "no-store" })
        ]);

        if (!active) return;
        
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser({
             user_code: String(userData?.user_code ?? ""),
             role: String(userData?.role ?? ""),
             name: String(userData?.name ?? ""),
             account_type: userData?.account_type === "doctor" ? "doctor" : "staff",
          });
        } else {
          setUser(null);
        }

        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setRecord(statusData.data);
        } else {
          setRecord(null);
        }
      } catch {
        if (active) {
          setUser(null);
          setRecord(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadData();
    return () => {
      active = false;
    };
  }, []);

  async function mark(event: "check_in" | "check_out") {
    if (!user || busy) return;
    setBusy(event);
    try {
      const endpoint = event === "check_in" ? "/api/attendance/me/check-in" : "/api/attendance/me/check-out";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(String(data?.error ?? "Unable to mark attendance"));
        return;
      }
      toast.success(String(data?.message ?? "Attendance marked"));
      // update the record manually
      setRecord((prev) => ({
        ...prev,
        attendance_id: data?.data?.attendance_id ?? prev?.attendance_id ?? "",
        check_in_time: data?.data?.check_in_time ?? prev?.check_in_time ?? null,
        check_out_time: data?.data?.check_out_time ?? prev?.check_out_time ?? null,
        status: data?.data?.status ?? prev?.status ?? "Present",
      }));
      
      if (event === "check_out") {
        await logoutUser();
        toast.success("Logged out successfully");
        router.replace("/");
        return;
      }
    } catch {
      toast.error("Network error while marking attendance");
    } finally {
      setBusy(null);
    }
  }

  const renderedCheckInTime = formatTimeInTimezone(record?.check_in_time, systemTimezone);

  useEffect(() => {
    if (!record) return;
    console.info("[attendance/time-debug] SidebarAttendance", {
      systemTimezone,
      rawCheckInFromApi: record.check_in_time,
      renderedCheckInTime,
      rawCheckOutFromApi: record.check_out_time,
    });
  }, [record, renderedCheckInTime, systemTimezone]);

  if (loading || !user?.user_code) {
    return <div className="h-20 animate-pulse bg-slate-50 rounded-xl mx-2"></div>;
  }

  const isCheckedIn = Boolean(record?.check_in_time);
  const isCheckedOut = Boolean(record?.check_out_time);

  return (
    <div className="flex flex-col gap-3 px-3 py-3 mx-2 bg-slate-50 rounded-xl border border-slate-100">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Attendance</span>
        {isCheckedIn ? (
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Checked In
             </span>
             <span className="text-[9px] font-medium text-slate-500">
                {renderedCheckInTime}
             </span>
          </div>
        ) : (
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Not Checked In</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-lg border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-50 text-[11px] px-2 shadow-sm"
          onClick={() => mark("check_in")}
          disabled={Boolean(busy) || isCheckedIn}
        >
          <LogIn className="mr-1.5 h-3 w-3" />
          {busy === "check_in" ? "..." : "Check In"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 text-[11px] px-2 shadow-sm"
          onClick={() => mark("check_out")}
          disabled={Boolean(busy) || !isCheckedIn || isCheckedOut}
        >
          <LogOut className="mr-1.5 h-3 w-3" />
          {busy === "check_out" ? "..." : "Check Out"}
        </Button>
      </div>
    </div>
  );
}
