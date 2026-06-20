"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import { logoutUser } from "@/src/features/Login/api";

type UserData = { name: string; role: string; user_code: string };

function IpdHeaderUser() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/user", { credentials: "include" });
        if (res.ok) setUser((await res.json()) as UserData);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="flex items-center gap-3">
      <div className="hidden items-center gap-3 rounded-md border border-border bg-muted px-3 py-2 md:flex">
        <div className="rounded-md border border-border bg-card p-2 shadow-sm">
          <UserRound className="h-4 w-4 text-info" />
        </div>
        <div className="min-w-[9rem]">
          <p className="text-sm font-semibold leading-none text-foreground">
            {loading ? "Loading..." : user?.name || "Unknown User"}
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {loading ? "SESSION" : user?.role || "No Role"}
          </p>
        </div>
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
        className="inline-flex h-11 items-center gap-2 rounded-md border border-destructive/30 bg-card px-4 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={loggingOut}
      >
        <LogOut className="h-4 w-4" />
        {loggingOut ? "Logging out..." : "Logout"}
      </button>
    </div>
  );
}

export default function IpdLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md border border-info/20 bg-info/10 p-2 shadow-sm">
              <Image src="/logo.png" alt="Clinic logo" width={28} height={28} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-info">
                In-Patient Department
              </p>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">IPD Workspace</h1>
              <p className="text-xs font-medium text-muted-foreground">Beds, admissions, nursing &amp; inpatient billing</p>
            </div>
          </div>
          <IpdHeaderUser />
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  );
}
