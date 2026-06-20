import * as React from "react";
import { cn } from "@/src/lib/utils";
import { Label } from "./Label";

// Label + control + error/hint in one consistent rhythm (DESIGN_SYSTEM.md).
export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: {
  label?: React.ReactNode;
  htmlFor?: string;
  error?: React.ReactNode;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <Label htmlFor={htmlFor} className="text-foreground">
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
      ) : null}
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

// Responsive form grid — fills width with columns instead of stretching fields.
export function FormGrid({
  cols = 2,
  className,
  children,
}: {
  cols?: 1 | 2 | 3;
  className?: string;
  children: React.ReactNode;
}) {
  const map = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  } as const;
  return <div className={cn("grid gap-x-4 gap-y-3", map[cols], className)}>{children}</div>;
}
