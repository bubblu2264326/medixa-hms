"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Clock3, LogIn, LogOut } from "lucide-react";
import toast from "react-hot-toast";

type UserSession = {
  user_code: string;
  role: string;
  name: string;
  account_type?: "staff" | "doctor";
};

export function SelfAttendancePanel() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [busy, setBusy] = useState<"check_in" | "check_out" | null>(null);

  const hidden = useMemo(() => {
    if (!pathname) return true;
    if (pathname === "/") return true;
    if (pathname.startsWith("/attendance/kiosk")) return true;
    // Hide in modules that use the shared top header attendance convention.
    if (pathname.startsWith("/doctor")) return true;
    if (pathname.startsWith("/receptionist")) return true;
    if (pathname.startsWith("/pharmacy")) return true;
    if (pathname.startsWith("/admin")) return true;
    return false;
  }, [pathname]);

  useEffect(() => {
    if (hidden) return;
    let active = true;

    const loadUser = async () => {
      setLoadingUser(true);
      try {
        const res = await fetch("/api/user", { credentials: "include", cache: "no-store" });
        if (!res.ok) {
          if (active) setUser(null);
          return;
        }
        const data = await res.json();
        if (!active) return;
        setUser({
          user_code: String(data?.user_code ?? ""),
          role: String(data?.role ?? ""),
          name: String(data?.name ?? ""),
          account_type: data?.account_type === "doctor" ? "doctor" : "staff",
        });
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoadingUser(false);
      }
    };

    void loadUser();
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
    } catch {
      toast.error("Network error while marking attendance");
    } finally {
      setBusy(null);
    }
  }

  if (hidden || loadingUser || !user?.user_code) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[120] w-[280px] rounded-2xl border border-emerald-200 bg-white/95 p-3 shadow-xl backdrop-blur-sm">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-700 text-white">
          <Clock3 className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-black uppercase tracking-wider text-slate-800">Self Attendance</p>
          <p className="truncate text-[11px] font-semibold text-slate-500">{user.user_code} • {user.account_type}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => mark("check_in")}
          disabled={Boolean(busy)}
          className="inline-flex h-9 items-center justify-center rounded-xl bg-emerald-700 px-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogIn className="mr-1.5 h-3.5 w-3.5" />
          {busy === "check_in" ? "Saving..." : "Check In"}
        </button>
        <button
          type="button"
          onClick={() => mark("check_out")}
          disabled={Boolean(busy)}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-black uppercase tracking-wide text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="mr-1.5 h-3.5 w-3.5" />
          {busy === "check_out" ? "Saving..." : "Check Out"}
        </button>
      </div>
    </div>
  );
}
