"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";

type UserData = {
  name: string;
  role: string;
  user_code: string;
};

export function UserProfile() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/user");

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          setError(errorData?.error || "Failed to fetch user");
          return;
        }

        const data = await res.json();
        setUser(data);
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md border border-border">
        <div className="text-[11px] font-medium text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error || !user) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-md border border-primary/20">
      <div className="p-1.5 bg-card rounded-md border border-primary/20">
        <User size={15} className="text-primary" />
      </div>
      <div className="flex flex-col">
        <span className="text-[13px] font-semibold text-foreground leading-none">{user.name}</span>
        <span className="text-[10px] font-semibold text-primary uppercase tracking-wide mt-0.5">{user.role}</span>
      </div>
    </div>
  );
}
