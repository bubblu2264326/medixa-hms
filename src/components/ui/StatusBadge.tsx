import * as React from "react";
import { cn } from "@/src/lib/utils";

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const toneStyles: Record<BadgeTone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  primary: "bg-primary/10 text-primary border-primary/20",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/15 text-warning-foreground border-warning/40",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-info/10 text-info border-info/20",
};

// Small semantic status pill — pair the tone with a text label (never color alone).
export function StatusBadge({
  tone = "neutral",
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        toneStyles[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
