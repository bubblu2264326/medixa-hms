"use client";

import React, { useMemo } from "react";

type Segment = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  title?: string;
  segments: Segment[];
  size?: number;
};

export function DonutSvg({ title, segments, size = 180 }: Props) {
  const total = useMemo(() => segments.reduce((sum, s) => sum + Number(s.value ?? 0), 0), [segments]);
  const stroke = 20;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  let running = 0;

  return (
    <div className="rounded-2xl border border-slate-100 p-3 bg-white">
      {title ? <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">{title}</h3> : null}
      {total <= 0 ? (
        <div className="h-36 grid place-items-center text-xs font-semibold text-slate-500">No composition data.</div>
      ) : (
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
            {segments.map((seg) => {
              const value = Number(seg.value ?? 0);
              const pct = total > 0 ? value / total : 0;
              const segmentLength = pct * circumference;
              const offset = running;
              running += segmentLength;
              return (
                <circle
                  key={seg.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                >
                  <title>{`${seg.label}: ${value}`}</title>
                </circle>
              );
            })}
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize="18" fontWeight={900} fill="#0f172a">
              {total}
            </text>
          </svg>

          <div className="space-y-1">
            {segments.map((seg) => (
              <div key={seg.label} className="inline-flex w-full items-center gap-2 text-[11px] font-semibold text-slate-600">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                <span className="min-w-20">{seg.label}</span>
                <span>{seg.value}</span>
                <span className="text-slate-400">({total > 0 ? ((seg.value / total) * 100).toFixed(1) : "0.0"}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
