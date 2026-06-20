"use client";

import { AlertTriangle } from "lucide-react";

export function StaleVisitNotice({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <section className="rounded-lg border border-warning/50 bg-warning/15 px-6 py-8 shadow-sm">
      <div className="flex min-h-[14rem] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-card text-warning-foreground shadow-sm">
          <AlertTriangle size={22} aria-hidden />
        </div>
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-warning-foreground">{title}</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-warning-foreground">{message}</p>
        </div>
      </div>
    </section>
  );
}
