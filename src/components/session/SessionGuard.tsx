"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";

const FORCED_LOGOUT_MESSAGE = "Admin has force logged you out. Please sign in again.";
const FORCED_LOGOUT_REASON = "forced_logout";
const REDIRECTING_KEY = "hms_forced_logout_redirecting";

export function SessionGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith("/attendance/kiosk")) {
      return;
    }
    if (pathname === "/") {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(REDIRECTING_KEY);
      }
      return;
    }

    let cancelled = false;

    const checkSession = async () => {
      try {
        const res = await fetch("/api/user", {
          credentials: "include",
          cache: "no-store",
        });
        if (cancelled || res.ok) return;

        const data = await res.json().catch(() => null);
        const message = data?.error ? String(data.error) : "Session expired. Please sign in again.";
        if (message.includes("force logged you out")) {
          if (typeof window !== "undefined" && window.sessionStorage.getItem(REDIRECTING_KEY) === "1") {
            return;
          }
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(REDIRECTING_KEY, "1");
          }
          if (!notifiedRef.current) {
            toast.error(FORCED_LOGOUT_MESSAGE, { duration: 4500 });
            notifiedRef.current = true;
          }
          await fetch("/api/logout", { method: "POST", credentials: "include" }).catch(() => null);
          router.replace(`/?reason=${FORCED_LOGOUT_REASON}`);
          return;
        }

        if (res.status === 401) {
          if (typeof window !== "undefined" && window.sessionStorage.getItem(REDIRECTING_KEY) === "1") {
            return;
          }
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(REDIRECTING_KEY, "1");
          }
          await fetch("/api/logout", { method: "POST", credentials: "include" }).catch(() => null);
          router.replace("/");
        }
      } catch {
        // Ignore transient network failures; next tick will retry.
      }
    };

    void checkSession();
    const timer = setInterval(() => {
      void checkSession();
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pathname, router]);

  return null;
}
