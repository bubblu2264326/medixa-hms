import * as React from "react";
import { cn } from "@/src/lib/utils";

// Compact, centered empty state — icon + one line (+ optional hint/action).
// Never a full-height blank panel (DESIGN_SYSTEM.md density rules).
export function EmptyState({
  icon,
  title,
  hint,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-10 text-center", className)}>
      {icon ? <div className="text-muted-foreground/50">{icon}</div> : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint ? <p className="max-w-xs text-xs text-muted-foreground">{hint}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
