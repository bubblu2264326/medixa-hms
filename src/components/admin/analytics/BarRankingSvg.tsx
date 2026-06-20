"use client";

import React, { useMemo } from "react";

type Row = {
  label: string;
  value: number;
  meta?: string;
};

type Props = {
  title?: string;
  rows: Row[];
  color?: string;
  maxRows?: number;
};

export function BarRankingSvg({ title, rows, color = "#0f766e", maxRows = 8 }: Props) {
  const visible = rows.slice(0, maxRows);
  const maxValue = useMemo(() => Math.max(1, ...visible.map((r) => Number(r.value ?? 0))), [visible]);

  return (
    <div className="rounded-md border border-border p-3 bg-white">
      {title ? <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</h3> : null}
      {visible.length === 0 ? (
        <div className="h-36 grid place-items-center text-xs font-semibold text-muted-foreground">No ranking data.</div>
      ) : (
        <div className="space-y-2">
          {visible.map((row) => {
            const width = (Number(row.value ?? 0) / maxValue) * 100;
            return (
              <div key={`${row.label}-${row.meta ?? ""}`}>
                <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                  <span className="truncate max-w-[70%]" title={row.label}>{row.label}</span>
                  <span>{Number(row.value ?? 0).toFixed(2)}</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
                </div>
                {row.meta ? <p className="mt-0.5 text-[10px] text-muted-foreground font-semibold truncate">{row.meta}</p> : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
