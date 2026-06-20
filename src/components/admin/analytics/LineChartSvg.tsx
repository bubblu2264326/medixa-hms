"use client";

import React, { useMemo, useState } from "react";

type Series = {
  key: string;
  label: string;
  color: string;
};

type Point = {
  label: string;
  [key: string]: string | number;
};

type Props = {
  title?: string;
  points: Point[];
  series: Series[];
  height?: number;
  ySuffix?: string;
};

export function LineChartSvg({ title, points, series, height = 240, ySuffix = "" }: Props) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const padding = { top: 16, right: 16, bottom: 28, left: 34 };
  const width = 760;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const maxY = useMemo(() => {
    const values = points.flatMap((p) => series.map((s) => Number(p[s.key] ?? 0)));
    return Math.max(1, ...values);
  }, [points, series]);

  const xFor = (i: number) => {
    if (points.length <= 1) return padding.left;
    return padding.left + (i / (points.length - 1)) * innerWidth;
  };

  const yFor = (v: number) => padding.top + (1 - v / maxY) * innerHeight;

  return (
    <div className="rounded-md border border-border p-3 bg-white">
      {title ? <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</h3> : null}
      {points.length === 0 ? (
        <div className="h-36 grid place-items-center text-xs font-semibold text-muted-foreground">No trend data.</div>
      ) : (
        <>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            {[0, 0.25, 0.5, 0.75, 1].map((step) => {
              const y = padding.top + innerHeight * step;
              return (
                <line
                  key={step}
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                />
              );
            })}

            {series.map((s) => {
              const path = points
                .map((p, i) => {
                  const x = xFor(i);
                  const y = yFor(Number(p[s.key] ?? 0));
                  return `${i === 0 ? "M" : "L"}${x} ${y}`;
                })
                .join(" ");

              return <path key={s.key} d={path} fill="none" stroke={s.color} strokeWidth={2.5} />;
            })}

            {points.map((p, i) => {
              const x = xFor(i);
              return (
                <g key={`${p.label}-${i}`}>
                  <line x1={x} x2={x} y1={padding.top} y2={padding.top + innerHeight} stroke="transparent" strokeWidth={14} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)} />
                  {series.map((s) => {
                    const value = Number(p[s.key] ?? 0);
                    const y = yFor(value);
                    return <circle key={`${s.key}-${i}`} cx={x} cy={y} r={hoverIndex === i ? 4 : 3} fill={s.color} />;
                  })}
                </g>
              );
            })}

            {points.map((p, i) => {
              if (i % Math.ceil(points.length / 6) !== 0 && i !== points.length - 1) return null;
              return (
                <text key={`label-${i}`} x={xFor(i)} y={height - 8} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight={700}>
                  {p.label}
                </text>
              );
            })}
          </svg>

          <div className="mt-2 flex flex-wrap gap-3">
            {series.map((s) => (
              <div key={s.key} className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span>{s.label}</span>
              </div>
            ))}
          </div>

          {hoverIndex !== null ? (
            <div className="mt-2 text-[11px] font-semibold text-muted-foreground">
              <span className="text-muted-foreground">{points[hoverIndex]?.label}: </span>
              {series.map((s, idx) => (
                <span key={s.key} className="mr-2" style={{ color: s.color }}>
                  {s.label} {Number(points[hoverIndex]?.[s.key] ?? 0).toFixed(0)}{ySuffix}{idx < series.length - 1 ? " |" : ""}
                </span>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
