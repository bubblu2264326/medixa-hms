import * as React from "react";
import { cn } from "@/src/lib/utils";

// Consistent screen header — title + optional subtitle + right-aligned actions.
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4", className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
