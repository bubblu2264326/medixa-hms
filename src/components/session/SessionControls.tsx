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
    <div className="flex items-center gap-3">
      <HeaderAttendance />
      <div className="px-2.5 py-1 bg-muted rounded-full border border-border flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></span>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Live Session</span>
      </div>

      <UserProfile />

      <Button
        variant="outline"
        size="sm"
        className="rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all gap-1.5"
        onClick={async () => {
          await logoutUser();
          router.replace("/");
        }}
      >
        <LogOut size={15} />
        <span className="font-semibold text-sm">Logout</span>
      </Button>
    </div>
  );
}
