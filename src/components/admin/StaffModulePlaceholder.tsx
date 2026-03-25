"use client";

import React from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";

type PlaceholderProps = {
  title: string;
  description: string;
  bullets: string[];
  endpoint?: string;
};

export function StaffModulePlaceholder({ title, description, bullets, endpoint }: PlaceholderProps) {
  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{title}</h1>
        <p className="text-sm text-slate-500 font-semibold mt-1">{description}</p>
      </div>

      <Card className="rounded-3xl border border-slate-100 p-6 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Current Scope</h2>
        <div className="mt-4 space-y-2">
          {bullets.map((bullet) => (
            <p key={bullet} className="text-sm font-semibold text-slate-700">
              - {bullet}
            </p>
          ))}
        </div>

        {endpoint ? (
          <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">API Contract</p>
            <p className="text-xs font-mono text-slate-700 mt-2">{endpoint}</p>
          </div>
        ) : null}

        <div className="mt-6">
          <Button className="bg-slate-900 hover:bg-black text-white rounded-2xl px-6 h-11 text-xs font-black uppercase tracking-widest">
            Phase Delivery Active
          </Button>
        </div>
      </Card>
    </div>
  );
}

