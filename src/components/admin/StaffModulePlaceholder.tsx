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
        <h1 className="text-2xl font-semibold text-foreground tracking-tight uppercase">{title}</h1>
        <p className="text-sm text-muted-foreground font-semibold mt-1">{description}</p>
      </div>

      <Card className="rounded-lg border border-border p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Current Scope</h2>
        <div className="mt-4 space-y-2">
          {bullets.map((bullet) => (
            <p key={bullet} className="text-sm font-semibold text-foreground">
              - {bullet}
            </p>
          ))}
        </div>

        {endpoint ? (
          <div className="mt-6 rounded-md bg-muted border border-border p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">API Contract</p>
            <p className="text-xs font-mono text-foreground mt-2">{endpoint}</p>
          </div>
        ) : null}

        <div className="mt-6">
          <Button className="bg-foreground hover:bg-black text-white rounded-md px-6 h-11 text-xs font-semibold uppercase tracking-widest">
            Phase Delivery Active
          </Button>
        </div>
      </Card>
    </div>
  );
}

