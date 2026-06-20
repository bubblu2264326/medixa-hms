"use client";

import React, { useCallback, useEffect, useState } from "react";

type Bed = {
  ward_id: number; ward_name: string; ward_type: string;
  room_id: number; room_number: string;
  bed_id: number; bed_number: string; status: string; daily_rate: string | number;
  admission_id: number | null; admission_no: string | null; patient_id: number | null; patient_name: string | null;
};
type Admission = {
  admission_id: number; admission_no: string; status: string; admission_datetime: string;
  patient_id: number; patient_name: string; bed_number: string | null; ward_name: string | null;
  doctor_name: string | null; total_charges: string | number | null; total_advances: string | number | null; balance_due: string | number | null;
};
type Detail = {
  admission: Record<string, any>;
  bill: { total_charges: number; total_advances: number; balance_due: number } | null;
  charges: { charge_id: number; charge_type: string; description: string; qty: number; unit_rate: number; amount: number }[];
  advances: { advance_id: number; amount: number; payment_type: string; received_at: string }[];
};
type Order = { order_id: number; order_type: string; details: string; status: string; med_order_id: number | null; drug_name: string | null; dose: string | null };
type Mar = { mar_id: number; action: string; drug_name: string; administered_dt: string | null; administered_by_name: string | null; dose_given: string | null };

const money = (v: unknown) => `Rs ${Number(v ?? 0)}`;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || `Request failed (${res.status})`);
  return res.json();
}
async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export default function IpdWorkspace() {
  const [tab, setTab] = useState<"beds" | "admissions">("admissions");
  const [beds, setBeds] = useState<Bed[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [mar, setMar] = useState<Mar[]>([]);
  const [msg, setMsg] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(""), 4000); };

  const loadBeds = useCallback(async () => {
    try { setBeds(await getJson<Bed[]>("/api/ipd/beds")); } catch (e) { flash(String((e as Error).message)); }
  }, []);
  const loadAdmissions = useCallback(async () => {
    try { setAdmissions(await getJson<Admission[]>("/api/ipd/admissions?status=admitted")); } catch (e) { flash(String((e as Error).message)); }
  }, []);
  const loadDetail = useCallback(async (id: number) => {
    try {
      setSelected(id);
      setDetail(await getJson<Detail>(`/api/ipd/admissions/${id}`));
      setOrders(await getJson<Order[]>(`/api/ipd/orders?admission_id=${id}`));
      setMar(await getJson<Mar[]>(`/api/ipd/nurse/mar?admission_id=${id}`));
    } catch (e) { flash(String((e as Error).message)); }
  }, []);

  useEffect(() => { loadBeds(); loadAdmissions(); }, [loadBeds, loadAdmissions]);

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try { await fn(); } catch (e) { flash(String((e as Error).message)); } finally { setBusy(false); }
  };

  const admit = (bed: Bed) => run(async () => {
    const patientId = window.prompt(`Admit to ${bed.ward_name} / ${bed.bed_number}. Enter patient_id:`);
    if (!patientId) return;
    await postJson("/api/ipd/admissions", { patient_id: Number(patientId), bed_id: bed.bed_id, admission_type: "direct" });
    flash("Patient admitted.");
    await Promise.all([loadBeds(), loadAdmissions()]);
  });
  const addAdvance = (id: number) => run(async () => {
    const amt = window.prompt("Advance amount:");
    if (!amt) return;
    await postJson(`/api/ipd/admissions/${id}/advances`, { amount: Number(amt), payment_type: "CASH" });
    flash("Advance recorded."); await loadDetail(id);
  });
  const placeOrder = (id: number) => run(async () => {
    const drug = window.prompt("Medication order — drug name:");
    if (!drug) return;
    await postJson("/api/ipd/orders", { admission_id: id, order_type: "medication", medication: { drug_name: drug } });
    flash("Order placed."); await loadDetail(id);
  });
  const chartGiven = (medOrderId: number, id: number) => run(async () => {
    await postJson("/api/ipd/nurse/mar", { med_order_id: medOrderId, action: "given", dose_given: "as ordered" });
    flash("Dose charted."); await loadDetail(id);
  });
  const discharge = (id: number) => run(async () => {
    const type = window.prompt("Discharge type (normal/lama/referred/transferred/death/absconded):", "normal");
    if (!type) return;
    await postJson(`/api/ipd/admissions/${id}/discharge`, { discharge_type: type });
    flash("Patient discharged."); setSelected(null); setDetail(null);
    await Promise.all([loadBeds(), loadAdmissions()]);
  });

  const bedColor = (s: string) =>
    s === "vacant" ? "border-success/30 bg-success/10" :
    s === "occupied" ? "border-info/20 bg-info/10" :
    "border-warning/40 bg-warning/15";

  return (
    <div className="space-y-5">
      {msg && <div className="rounded-md border border-info/20 bg-info/10 px-4 py-2 text-sm font-medium text-info">{msg}</div>}

      <div className="flex gap-2">
        {(["admissions", "beds"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === t ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border"}`}>
            {t === "admissions" ? "Admissions" : "Bed Board"}
          </button>
        ))}
      </div>

      {tab === "beds" && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {beds.map((b) => (
            <div key={b.bed_id} className={`rounded-lg border p-3 ${bedColor(b.status)}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{b.ward_name} · {b.room_number}</p>
              <p className="text-base font-semibold text-foreground">Bed {b.bed_number}</p>
              <p className="text-xs font-medium uppercase text-muted-foreground">{b.status} · {money(b.daily_rate)}/day</p>
              {b.patient_name ? (
                <button onClick={() => b.admission_id && loadDetail(b.admission_id)} className="mt-2 text-xs font-semibold text-info underline">
                  {b.patient_name} ({b.admission_no})
                </button>
              ) : (
                <button onClick={() => admit(b)} disabled={busy} className="mt-2 rounded-md bg-success px-3 py-1 text-xs font-semibold text-success-foreground disabled:opacity-60">Admit</button>
              )}
            </div>
          ))}
          {beds.length === 0 && <p className="text-sm text-muted-foreground">No beds configured. Create wards/rooms/beds in Admin.</p>}
        </div>
      )}

      {tab === "admissions" && (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-3">Admission</th><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Bed</th><th className="px-4 py-3">Doctor</th><th className="px-4 py-3">Balance</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {admissions.map((a) => (
                <tr key={a.admission_id}>
                  <td className="px-4 py-3 font-semibold text-foreground">{a.admission_no}</td>
                  <td className="px-4 py-3">{a.patient_name}</td>
                  <td className="px-4 py-3">{a.ward_name ? `${a.ward_name} · ${a.bed_number}` : "—"}</td>
                  <td className="px-4 py-3">{a.doctor_name || "—"}</td>
                  <td className="px-4 py-3 font-semibold font-mono tabular-nums">{money(a.balance_due)}</td>
                  <td className="px-4 py-3"><button onClick={() => loadDetail(a.admission_id)} className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Open</button></td>
                </tr>
              ))}
              {admissions.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No active admissions.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {detail && selected && (
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{detail.admission.admission_no} — {detail.admission.patient_name}</h2>
              <p className="text-xs font-medium text-muted-foreground">{detail.admission.ward_name || "—"} · Bed {detail.admission.bed_number || "—"} · {detail.admission.status}</p>
            </div>
            <button onClick={() => { setSelected(null); setDetail(null); }} className="text-sm font-semibold text-muted-foreground">Close</button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-border bg-muted p-3"><p className="text-[10px] font-semibold uppercase text-muted-foreground">Charges</p><p className="text-lg font-semibold font-mono tabular-nums text-foreground">{money(detail.bill?.total_charges)}</p></div>
            <div className="rounded-md border border-border bg-muted p-3"><p className="text-[10px] font-semibold uppercase text-muted-foreground">Advances</p><p className="text-lg font-semibold font-mono tabular-nums text-success">{money(detail.bill?.total_advances)}</p></div>
            <div className="rounded-md border border-border bg-muted p-3"><p className="text-[10px] font-semibold uppercase text-muted-foreground">Balance Due</p><p className="text-lg font-semibold font-mono tabular-nums text-warning-foreground">{money(detail.bill?.balance_due)}</p></div>
          </div>

          {detail.admission.status === "admitted" && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => addAdvance(selected)} disabled={busy} className="rounded-md bg-success px-3 py-2 text-xs font-semibold text-success-foreground disabled:opacity-60">Add Advance</button>
              <button onClick={() => placeOrder(selected)} disabled={busy} className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">Place Medication Order</button>
              <button onClick={() => discharge(selected)} disabled={busy} className="rounded-md bg-destructive px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">Discharge</button>
            </div>
          )}

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Orders</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {orders.map((o) => (
                  <li key={o.order_id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <span>{o.order_type === "medication" ? (o.drug_name || "medication") : o.order_type} <span className="text-xs text-muted-foreground">({o.status})</span></span>
                    {o.med_order_id && detail.admission.status === "admitted" && o.status === "active" && (
                      <button onClick={() => chartGiven(o.med_order_id as number, selected)} disabled={busy} className="rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground disabled:opacity-60">Chart Given</button>
                    )}
                  </li>
                ))}
                {orders.length === 0 && <li className="text-muted-foreground">No orders.</li>}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">MAR</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {mar.map((m) => (
                  <li key={m.mar_id} className="rounded-md border border-border px-3 py-2">
                    <span className="font-semibold">{m.drug_name}</span> — {m.action}
                    {m.administered_by_name ? <span className="text-xs text-muted-foreground"> by {m.administered_by_name}</span> : null}
                  </li>
                ))}
                {mar.length === 0 && <li className="text-muted-foreground">No administrations charted.</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
