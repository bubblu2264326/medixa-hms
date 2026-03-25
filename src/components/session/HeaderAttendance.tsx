"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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

export function HeaderAttendance() {
  const systemTimezone = useSystemTimezone();
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"check_in" | "check_out" | null>(null);

  const hidden =
    !pathname?.startsWith("/doctor") &&
    !pathname?.startsWith("/receptionist") &&
    !pathname?.startsWith("/pharmacy");

  useEffect(() => {
    if (hidden) return;
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
  }, [hidden]);

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
    if (hidden || !record) return;
    console.info("[attendance/time-debug] HeaderAttendance", {
      systemTimezone,
      rawCheckInFromApi: record.check_in_time,
      renderedCheckInTime,
      rawCheckOutFromApi: record.check_out_time,
    });
  }, [hidden, record, renderedCheckInTime, systemTimezone]);

  if (hidden || loading || !user?.user_code) {
    return null;
  }

  const isCheckedIn = Boolean(record?.check_in_time);
  const isCheckedOut = Boolean(record?.check_out_time);

  return (
    <div className="flex items-center gap-3 border-r border-slate-200 pr-4 mr-2">
      <div className="flex items-center gap-2">
        {isCheckedIn ? (
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Checked In
             </span>
             <span className="text-[10px] font-medium text-slate-500">
                {renderedCheckInTime}
             </span>
          </div>
        ) : (
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Not Checked In</span>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-lg border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 disabled:opacity-50"
          onClick={() => mark("check_in")}
          disabled={Boolean(busy) || isCheckedIn}
        >
          <LogIn className="mr-1.5 h-3.5 w-3.5" />
          {busy === "check_in" ? "..." : "Check In"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          onClick={() => mark("check_out")}
          disabled={Boolean(busy) || !isCheckedIn || isCheckedOut}
        >
          <LogOut className="mr-1.5 h-3.5 w-3.5 items-center" />
          {busy === "check_out" ? "..." : "Check Out"}
        </Button>
      </div>
    </div>
  );
}
