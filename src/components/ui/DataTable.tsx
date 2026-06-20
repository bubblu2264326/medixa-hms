import * as React from "react";
import { cn } from "@/src/lib/utils";

// Dense, token-based table primitives (sticky-able header, hover rows).
// Wrap in DataTable; compose THead/TR/TH/TD. Horizontal scroll is contained.
export function DataTable({ className, children, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border">
      <table className={cn("w-full border-collapse text-sm", className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function THead({ className, children, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead className={cn("bg-muted text-muted-foreground", className)} {...props}>
      {children}
    </thead>
  );
}

export function TH({ className, children, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn("px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap", className)}
      {...props}
    >
      {children}
    </th>
  );
}

export function TR({ className, children, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr className={cn("border-t border-border hover:bg-muted/40", className)} {...props}>
      {children}
    </tr>
  );
}

export function TD({ className, children, ...props }: React.ComponentProps<"td">) {
  return (
    <td className={cn("px-3 py-2 align-middle", className)} {...props}>
      {children}
    </td>
  );
}
