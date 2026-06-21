"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { TestTube, RefreshCw } from "lucide-react";
import { DataTable, THead, TR, TH, TD } from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { Button } from "@/src/components/ui/Button";
import { Dialog } from "@/src/components/ui/Dialog";
import { Label } from "@/src/components/ui/Label";
import { EmptyState } from "@/src/components/ui/EmptyState";

type OrderRow = {
  order_id: number;
  patient_id: number;
  patient_name: string;
  age: number | null;
  gender: string | null;
  visit_id: number;
  urgency: string;
  status: string;
  test_id: number;
  test_name: string;
  category: string | null;
  ordered_by: string;
  order_date: string;
};

const SPECIMEN_TYPES = ["Blood", "Urine", "Stool", "Swab", "Sputum", "Tissue", "Other"];
const URGENCY_TONE: Record<string, "danger" | "warning" | "neutral"> = {
  STAT: "danger",
  Urgent: "warning",
  Routine: "neutral",
};

export function SampleCollection() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<OrderRow | null>(null);
  const [specimen, setSpecimen] = useState("Blood");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 14); // catch pending orders from the last 2 weeks
      const params = new URLSearchParams({ startDate: start.toISOString(), endDate: end.toISOString() });
      const res = await fetch(`/api/lab/order?${params.toString()}`, { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      setRows(Array.isArray(data) ? data.filter((r: OrderRow) => r.status === "Pending") : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const collect = async () => {
    if (!active) return;
    setSaving(true);
    try {
      const res = await fetch("/api/lab/sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: active.order_id, specimen_type: specimen }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(String(data?.error ?? "Failed to record collection"));
        return;
      }
      toast.success(`Sample collected for ${active.patient_name} — ${active.test_name}`);
      setActive(null);
      setSpecimen("Blood");
      await load();
    } catch {
      toast.error("Network error while recording collection");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary text-primary-foreground rounded-md">
            <TestTube size={18} />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Sample Collection</h2>
            <p className="text-xs text-muted-foreground">Pending orders awaiting specimen collection (last 14 days)</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => load()}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading orders…</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<TestTube size={22} />} title="No pending samples" hint="All ordered tests have had their samples collected." />
      ) : (
        <DataTable>
          <THead>
            <tr>
              <TH>Patient</TH>
              <TH>Test</TH>
              <TH>Category</TH>
              <TH>Urgency</TH>
              <TH>Ordered By</TH>
              <TH>Date</TH>
              <TH className="text-right">Action</TH>
            </tr>
          </THead>
          <tbody>
            {rows.map((r) => (
              <TR key={r.order_id}>
                <TD>
                  <div className="font-medium text-foreground">{r.patient_name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
                    #{r.patient_id} · Visit #{r.visit_id}
                  </div>
                </TD>
                <TD className="text-foreground">{r.test_name}</TD>
                <TD className="text-muted-foreground">{r.category ?? "—"}</TD>
                <TD>
                  <StatusBadge tone={URGENCY_TONE[r.urgency] ?? "neutral"}>{r.urgency}</StatusBadge>
                </TD>
                <TD className="text-muted-foreground">{r.ordered_by}</TD>
                <TD className="text-muted-foreground font-mono tabular-nums">{r.order_date}</TD>
                <TD className="text-right">
                  <Button size="sm" onClick={() => { setActive(r); setSpecimen("Blood"); }}>
                    Collect
                  </Button>
                </TD>
              </TR>
            ))}
          </tbody>
        </DataTable>
      )}

      <Dialog
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title="Collect Sample"
        description={active ? `${active.patient_name} — ${active.test_name}` : undefined}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setActive(null)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={collect} isLoading={saving}>Mark Collected</Button>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label htmlFor="specimen-type">Specimen type</Label>
          <select
            id="specimen-type"
            value={specimen}
            onChange={(e) => setSpecimen(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            {SPECIMEN_TYPES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </Dialog>
    </div>
  );
}
