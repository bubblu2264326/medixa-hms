"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { logoutUser } from "@/src/features/Login/api";
import { UserProfile } from "./UserProfile";
import { HeaderAttendance } from "./HeaderAttendance";

export function SessionControls() {
  const router = useRouter();

  return (
    <div className="flex items-center gap-4">
      <HeaderAttendance />
      <div className="px-4 py-1.5 bg-slate-50 rounded-full border border-slate-100 flex items-center gap-2">
        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
        <span className="text-[11px] font-bold text-slate-500 uppercase">Live Session</span>
      </div>

      <UserProfile />

      <Button
        variant="outline"
        className="rounded-xl border-slate-200 hover:border-rose-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-all gap-2 h-10"
        onClick={async () => {
          await logoutUser();
          router.replace("/");
        }}
      >
        <LogOut size={16} />
        <span className="font-bold text-sm">Logout</span>
      </Button>
    </div>
  );
}
