"use client";

import * as React from "react";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { Label } from "@/src/components/ui/Label";
import { Card } from "@/src/components/ui/Card";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { StatCard } from "@/src/components/ui/StatCard";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Activity, CreditCard, Pill, TriangleAlert } from "lucide-react";

// Living reference for the HMS clinical design system.
// See documentation/DESIGN_SYSTEM.md for the rules this page demonstrates.

function Swatch({ name, className, note }: { name: string; className: string; note?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`h-16 w-full rounded-md border border-border ${className}`} />
      <div className="text-xs font-medium text-foreground">{name}</div>
      {note ? <div className="text-[11px] text-muted-foreground">{note}</div> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

export default function StyleGuidePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl space-y-12 px-6 py-10">
        <PageHeader
          title="HMS Design System"
          subtitle="Living reference — tokens and primitives. Source of truth: documentation/DESIGN_SYSTEM.md"
          actions={<StatusBadge tone="primary">v1</StatusBadge>}
        />

        {/* Brand & neutral surfaces */}
        <Section title="Surfaces & brand">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Swatch name="Background" className="bg-background" note="page" />
            <Swatch name="Card" className="bg-card" note="surface" />
            <Swatch name="Muted" className="bg-muted" note="subtle fill" />
            <Swatch name="Accent" className="bg-accent" note="hover / selected" />
            <Swatch name="Primary (teal)" className="bg-primary" note="interactive" />
            <Swatch name="Secondary" className="bg-secondary" />
            <Swatch name="Border" className="bg-border" />
            <Swatch name="Ring" className="bg-ring" note="focus" />
          </div>
        </Section>

        {/* Semantic safety colors */}
        <Section title="Semantic colors (meaning, never decoration)">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Swatch name="Success" className="bg-success" note="paid / normal" />
            <Swatch name="Warning" className="bg-warning" note="caution / due" />
            <Swatch name="Danger" className="bg-destructive" note="critical / refund" />
            <Swatch name="Info" className="bg-info" note="neutral notice" />
          </div>
        </Section>

        {/* Typography */}
        <Section title="Typography (font-sans, real type scale)">
          <Card className="space-y-3">
            <p className="text-3xl font-semibold tracking-tight">Heading 30 / semibold</p>
            <p className="text-2xl font-semibold tracking-tight">Heading 24 / semibold</p>
            <p className="text-xl font-semibold">Heading 20 / semibold</p>
            <p className="text-base">Body 16 — the quick brown fox jumps over the lazy dog.</p>
            <p className="text-sm text-muted-foreground">Small 14 muted — secondary / helper text.</p>
            <p className="font-mono tabular-nums text-lg">Rs 12,480.00 — monospace tabular numerals for money</p>
          </Card>
        </Section>

        {/* Buttons */}
        <Section title="Buttons">
          <Card className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="success">Success</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="touch">Touch 48px (POS)</Button>
              <Button isLoading>Loading</Button>
              <Button disabled>Disabled</Button>
            </div>
          </Card>
        </Section>

        {/* Status badges */}
        <Section title="Status badges (color + label, never color alone)">
          <Card>
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone="neutral">Waiting</StatusBadge>
              <StatusBadge tone="primary">In Progress</StatusBadge>
              <StatusBadge tone="success">Payment Done</StatusBadge>
              <StatusBadge tone="warning">Due</StatusBadge>
              <StatusBadge tone="danger">Out of Stock</StatusBadge>
              <StatusBadge tone="info">Admitted</StatusBadge>
            </div>
          </Card>
        </Section>

        {/* KPI tiles */}
        <Section title="Stat tiles">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Today's Sales" value="Rs 84,200" hint="32 invoices" icon={<CreditCard size={16} />} />
            <StatCard label="Patients Seen" value="58" hint="OPD + Emergency" icon={<Activity size={16} />} />
            <StatCard label="Low Stock" value="7" hint="needs reorder" icon={<Pill size={16} />} />
          </div>
        </Section>

        {/* Form fields */}
        <Section title="Form fields">
          <Card className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sg-name">Patient name</Label>
              <Input id="sg-name" placeholder="e.g. Ayesha Khan" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sg-amt">Amount received</Label>
              <Input id="sg-amt" type="number" placeholder="0.00" className="font-mono tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sg-err">Invalid example</Label>
              <Input id="sg-err" aria-invalid placeholder="shows error ring" />
            </div>
          </Card>
        </Section>

        {/* Money hierarchy demo (POS) */}
        <Section title="Money hierarchy (POS)">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total payable</span>
              <span className="font-mono tabular-nums text-2xl font-bold">Rs 1,250.00</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Change due</span>
              <span className="font-mono tabular-nums text-xl font-semibold text-success">Rs 250.00</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Balance due</span>
              <span className="font-mono tabular-nums text-xl font-semibold text-warning-foreground">Rs 150.00</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <TriangleAlert size={14} className="text-destructive" /> Over limit
              </span>
              <span className="font-mono tabular-nums text-xl font-semibold text-destructive">Rs -50.00</span>
            </div>
          </Card>
        </Section>
      </div>
    </div>
  );
}
