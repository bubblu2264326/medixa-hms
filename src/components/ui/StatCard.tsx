import * as React from "react";
import { cn } from "@/src/lib/utils";

// KPI tile for dashboards — label + prominent value (+ optional hint/icon).
export function StatCard({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-4 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
