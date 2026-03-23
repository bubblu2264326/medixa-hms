"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import { logoutUser } from "@/src/features/Login/api";

type UserData = {
  name: string;
  role: string;
  user_code: string;
};

type ShiftData = {
  activeShift: {
    cashier_shift_id: number;
    opening_cash: number;
    opened_at: string;
    status: string;
  } | null;
};

function CashierHeaderUser() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [shift, setShift] = useState<ShiftData["activeShift"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const [userRes, shiftRes] = await Promise.all([
          fetch("/api/user", { credentials: "include" }),
          fetch("/api/cashier/shift", { credentials: "include" }),
        ]);

        if (userRes.ok) {
          const data = (await userRes.json()) as UserData;
          setUser(data);
        }
        if (shiftRes.ok) {
          const shiftData = (await shiftRes.json()) as ShiftData;
          setShift(shiftData.activeShift ?? null);
        }
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  return (
    <div className="flex items-center gap-3">
      <div className="hidden items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 md:flex">
        <div className="rounded-xl border border-indigo-100 bg-white p-2 shadow-sm">
          <UserRound className="h-4 w-4 text-indigo-600" />
        </div>
        <div className="min-w-[9rem]">
          <p className="text-sm font-black leading-none text-slate-800">
            {loading ? "Loading..." : user?.name || "Unknown User"}
          </p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
            {loading ? "SESSION" : user?.role || "No Role"}
          </p>
        </div>
      </div>
      <div
        className={`hidden rounded-2xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] md:block ${
          shift
            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border border-amber-200 bg-amber-50 text-amber-700"
        }`}
      >
        {shift ? "Shift Open" : "No Open Shift"}
      </div>

      <button
        type="button"
        onClick={async () => {
          if (loggingOut) return;
          setLoggingOut(true);
          try {
            await logoutUser();
          } finally {
            router.replace("/");
            router.refresh();
          }
        }}
        className="inline-flex h-11 items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 text-sm font-black text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={loggingOut}
      >
        <LogOut className="h-4 w-4" />
        {loggingOut ? "Logging out..." : "Logout"}
      </button>
    </div>
  );
}

export default function CashierLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/90 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-2 shadow-sm">
              <Image src="/logo.png" alt="Fouzia Ishaq Clinic logo" width={28} height={28} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">
                Fouzia Ishaq Clinic
              </p>
              <h1 className="text-lg font-black uppercase tracking-[0.12em] text-slate-800">
                Cashier Workspace
              </h1>
              <p className="text-xs font-semibold text-slate-500">
                Visit settlement and cashier operations
              </p>
            </div>
          </div>

          <CashierHeaderUser />
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  );
}
