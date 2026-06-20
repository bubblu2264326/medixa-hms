"use client";

import React, { useMemo } from "react";

type Segment = { key: string; label: string; color: string };
type Row = { label: string; [key: string]: string | number };

type Props = {
  title?: string;
  rows: Row[];
  segments: Segment[];
  maxRows?: number;
};

export function StackedBarSvg({ title, rows, segments, maxRows = 8 }: Props) {
  const visible = rows.slice(0, maxRows);

  const normalized = useMemo(() => {
    return visible.map((row) => {
      const total = segments.reduce((sum, seg) => sum + Number(row[seg.key] ?? 0), 0);
      return {
        label: row.label,
        total,
        parts: segments.map((seg) => ({ ...seg, value: Number(row[seg.key] ?? 0) })),
      };
    });
  }, [visible, segments]);

  return (
    <div className="rounded-md border border-border p-3 bg-white">
      {title ? <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</h3> : null}
      {normalized.length === 0 ? (
        <div className="h-36 grid place-items-center text-xs font-semibold text-muted-foreground">No distribution data.</div>
      ) : (
        <div className="space-y-2">
          {normalized.map((row) => (
            <div key={row.label}>
              <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                <span>{row.label}</span>
                <span>{row.total}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div className="flex h-full w-full">
                  {row.parts.map((part) => {
                    const width = row.total > 0 ? (part.value / row.total) * 100 : 0;
                    return (
                      <div
                        key={`${row.label}-${part.key}`}
                        style={{ width: `${width}%`, backgroundColor: part.color }}
                        title={`${part.label}: ${part.value}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          <div className="pt-1 flex flex-wrap gap-3">
            {segments.map((seg) => (
              <div key={seg.key} className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                <span>{seg.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
