import * as React from "react";
import { cn } from "@/src/lib/utils";

// Horizontal action/filter bar — title slot + right-aligned actions.
export function Toolbar({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2", className)} {...props}>
      {children}
    </div>
  );
}
