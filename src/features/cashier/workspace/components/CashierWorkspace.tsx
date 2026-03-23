"use client";

import React, { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileClock,
  HandCoins,
  History,
  ListFilter,
  Loader2,
  ReceiptText,
  Search,
} from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";

type CashierTab = "worklist" | "settle" | "history" | "drafts" | "overdue";

type BillDetail = {
  bill: {
    billId: number;
    visitId: number;
    patientId: number;
    patientName: string;
    contactNumber: string | null;
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    paymentStatus: string;
  };
  sourceLines: Array<{
    billChargeSourceId: number;
    sourceType: string;
    sourceId: number | null;
    amount: number;
    billItemId: number | null;
    description: string | null;
  }>;
  paymentHistory: Array<{
    cashierPaymentTxnId: number;
    amount: number;
    txnType: string;
    paymentType: string;
    paymentReference: string | null;
    receiptNo: string | null;
    createdAt: string | null;
    reversedFromTxnId: number | null;
  }>;
};

type WorklistItem = {
  billId: number;
  visitId: number;
  patientName: string;
  phone: string | null;
  clinicNumber: number | null;
  paymentStatus: string;
  dueAmount: number;
  paidAmount: number;
  totalAmount: number;
  dueScore: number;
  overdueDays: number;
};

type HistoryItem = {
  cashierPaymentTxnId: number;
  billId: number;
  visitId: number;
  amount: number;
  txnType: string;
  paymentType: string;
  paymentReference: string | null;
  receiptNo: string | null;
  createdAt: string | null;
  cashierName: string | null;
  patientName: string | null;
};

type DraftItem = {
  cashierSettlementDraftId: number;
  billId: number;
  visitId: number | null;
  amount: number;
  paymentType: string;
  paymentReference: string | null;
  notes: string | null;
  draftStatus: string;
  updatedAt: string | null;
  patientName: string | null;
};

type OverdueItem = {
  billId: number;
  visitId: number;
  patientName: string;
  dueAmount: number;
  overdueDays: number;
  riskScore: number;
  agingBucket: string;
};

const PAYMENT_TYPES = ["CASH", "CARD", "INSURANCE", "MOBILE", "SPLIT"] as const;

const tabs: Array<{ id: CashierTab; label: string; icon: React.ReactNode }> = [
  { id: "worklist", label: "Worklist", icon: <ListFilter className="h-4 w-4" /> },
  { id: "settle", label: "Settle", icon: <HandCoins className="h-4 w-4" /> },
  { id: "history", label: "History", icon: <History className="h-4 w-4" /> },
  { id: "drafts", label: "Drafts", icon: <FileClock className="h-4 w-4" /> },
  { id: "overdue", label: "Overdue & Alerts", icon: <AlertTriangle className="h-4 w-4" /> },
];

const fmt = (value: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const dt = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const statusPill = (status: string) => {
  if (status === "Paid") return "bg-emerald-100 text-emerald-700";
  if (status === "Partial") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
};

function safeJson<T>(value: unknown): T {
  return value as T;
}

export default function CashierWorkspace() {
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<CashierTab>("worklist");
  const [globalLoading, setGlobalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [selectedBill, setSelectedBill] = useState<BillDetail | null>(null);
  const [visitIdInput, setVisitIdInput] = useState("");
  const [billIdInput, setBillIdInput] = useState(searchParams.get("billId") ?? "");

  const [settleAmount, setSettleAmount] = useState("");
  const [paymentType, setPaymentType] = useState<(typeof PAYMENT_TYPES)[number]>("CASH");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");

  const [worklist, setWorklist] = useState<WorklistItem[]>([]);
  const [worklistFilters, setWorklistFilters] = useState({
    patient: "",
    visitId: "",
    billId: "",
    clinicNumber: "",
    phone: "",
    status: "",
    agingBucket: "",
    sortBy: "dueScore",
    sortDir: "desc",
  });

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyFilters, setHistoryFilters] = useState({
    billId: "",
    patient: "",
    reference: "",
    txnType: "",
  });

  const [correctingTxnId, setCorrectingTxnId] = useState<number | null>(null);
  const [correctionForm, setCorrectionForm] = useState({
    reasonCode: "entry_error",
    reasonNote: "",
    replacementAmount: "",
    replacementPaymentType: "CASH",
    replacementReference: "",
    replacementNotes: "",
  });

  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [draftStatus, setDraftStatus] = useState("open");
  const [overdueRows, setOverdueRows] = useState<OverdueItem[]>([]);
  const [overdueFilter, setOverdueFilter] = useState({ patient: "", bucket: "" });

  const dueAmount = useMemo(() => Number(selectedBill?.bill?.dueAmount ?? 0), [selectedBill?.bill?.dueAmount]);
  const groupedLines = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of selectedBill?.sourceLines ?? []) {
      const key = line.sourceType || "other";
      map.set(key, (map.get(key) ?? 0) + Number(line.amount ?? 0));
    }
    return Array.from(map.entries());
  }, [selectedBill?.sourceLines]);

  const fetchJson = async <T,>(url: string, init?: RequestInit) => {
    const res = await fetch(url, { credentials: "include", ...(init || {}) });
    const payload = await res.json();
    if (!res.ok) {
      throw new Error(payload?.error || "Request failed");
    }
    return safeJson<T>(payload);
  };

  const loadBillById = React.useCallback(async (billId: number) => {
    const payload = await fetchJson<BillDetail>(`/api/cashier/bill/${billId}`);
    setSelectedBill(payload);
    setBillIdInput(String(payload.bill.billId));
    setVisitIdInput(payload.bill.visitId ? String(payload.bill.visitId) : "");
    setSettleAmount(String(Math.max(payload.bill.dueAmount, 0)));
    setHistoryFilters((prev) => ({ ...prev, billId: String(payload.bill.billId) }));
  }, []);

  const loadBillContext = async () => {
    setGlobalLoading(true);
    setError(null);
    setNotice(null);
    try {
      if (billIdInput.trim()) {
        await loadBillById(Number(billIdInput));
        return;
      }
      if (!visitIdInput.trim()) {
        throw new Error("Enter visit or bill id.");
      }
      const outstanding = await fetchJson<{ bill: { billId: number } }>(
        `/api/cashier/outstanding?visitId=${encodeURIComponent(visitIdInput.trim())}`
      );
      await loadBillById(Number(outstanding.bill.billId));
    } catch (e) {
      setSelectedBill(null);
      setError(e instanceof Error ? e.message : "Unable to load bill");
    } finally {
      setGlobalLoading(false);
    }
  };

  const loadWorklist = React.useCallback(async () => {
    setGlobalLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      Object.entries(worklistFilters).forEach(([k, v]) => {
        if (v) qs.set(k, v);
      });
      const payload = await fetchJson<{ items: WorklistItem[] }>(`/api/cashier/worklist?${qs.toString()}`);
      setWorklist(payload.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load worklist");
    } finally {
      setGlobalLoading(false);
    }
  }, [worklistFilters]);

  const loadHistory = async () => {
    setGlobalLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      Object.entries(historyFilters).forEach(([k, v]) => {
        if (v) qs.set(k, v);
      });
      const payload = await fetchJson<{ items: HistoryItem[] }>(`/api/cashier/history?${qs.toString()}`);
      setHistoryItems(payload.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load history");
    } finally {
      setGlobalLoading(false);
    }
  };

  const loadDrafts = async () => {
    setGlobalLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (draftStatus) qs.set("status", draftStatus);
      const payload = await fetchJson<{ items: DraftItem[] }>(`/api/cashier/drafts?${qs.toString()}`);
      setDrafts(payload.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load drafts");
    } finally {
      setGlobalLoading(false);
    }
  };

  const loadOverdue = async () => {
    setGlobalLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (overdueFilter.patient) qs.set("patient", overdueFilter.patient);
      if (overdueFilter.bucket) qs.set("bucket", overdueFilter.bucket);
      const payload = await fetchJson<{ items: OverdueItem[] }>(`/api/cashier/overdue?${qs.toString()}`);
      setOverdueRows(payload.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load overdue alerts");
    } finally {
      setGlobalLoading(false);
    }
  };

  React.useEffect(() => {
    void loadWorklist();
  }, [loadWorklist]);

  React.useEffect(() => {
    const incomingBill = searchParams.get("billId");
    if (!incomingBill) return;
    setBillIdInput(incomingBill);
    setActiveTab("settle");
    loadBillById(Number(incomingBill)).catch((e) => {
      setError(e instanceof Error ? e.message : "Unable to load bill");
    });
  }, [searchParams, loadBillById]);

  const settleNow = async () => {
    if (!selectedBill?.bill?.billId) {
      setError("Load a bill first.");
      return;
    }
    const amount = Number(settleAmount || 0);
    if (!amount || amount <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setGlobalLoading(true);
    setError(null);
    setNotice(null);
    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `cashier-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      await fetchJson<{ success: boolean; data: { paymentStatus: string } }>("/api/cashier/settle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          billId: selectedBill.bill.billId,
          amount,
          paymentType,
          paymentReference: paymentReference.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      await loadBillById(selectedBill.bill.billId);
      setNotice("Settlement posted successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to settle");
    } finally {
      setGlobalLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!selectedBill?.bill?.billId) {
      setError("Load a bill first.");
      return;
    }
    const amount = Number(settleAmount || 0);
    if (!amount || amount <= 0) {
      setError("Enter a valid draft amount.");
      return;
    }

    setGlobalLoading(true);
    setError(null);
    setNotice(null);
    try {
      await fetchJson("/api/cashier/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: selectedBill.bill.billId,
          visitId: selectedBill.bill.visitId,
          amount,
          paymentType,
          paymentReference: paymentReference.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      setNotice("Draft saved. You can apply it from Drafts tab.");
      setActiveTab("drafts");
      await loadDrafts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save draft");
    } finally {
      setGlobalLoading(false);
    }
  };

  const applyDraftAction = async (draftId: number, action: "apply" | "cancel") => {
    setGlobalLoading(true);
    setError(null);
    setNotice(null);
    try {
      await fetchJson(`/api/cashier/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setNotice(action === "apply" ? "Draft applied successfully." : "Draft cancelled.");
      await loadDrafts();
      if (action === "apply" && selectedBill?.bill?.billId) {
        await loadBillById(selectedBill.bill.billId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update draft");
    } finally {
      setGlobalLoading(false);
    }
  };

  const runCorrection = async () => {
    if (!correctingTxnId) return;
    setGlobalLoading(true);
    setError(null);
    setNotice(null);
    try {
      await fetchJson("/api/cashier/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashierPaymentTxnId: correctingTxnId,
          reasonCode: correctionForm.reasonCode,
          reasonNote: correctionForm.reasonNote,
          replacementAmount: Number(correctionForm.replacementAmount || 0),
          replacementPaymentType: correctionForm.replacementPaymentType,
          replacementReference: correctionForm.replacementReference || undefined,
          replacementNotes: correctionForm.replacementNotes || undefined,
        }),
      });
      setNotice("Payment corrected via reverse + repost.");
      setCorrectingTxnId(null);
      await loadHistory();
      if (selectedBill?.bill?.billId) await loadBillById(selectedBill.bill.billId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to correct payment");
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === "worklist") loadWorklist();
                if (tab.id === "history") loadHistory();
                if (tab.id === "drafts") loadDrafts();
                if (tab.id === "overdue") loadOverdue();
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <Card className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700">{error}</Card> : null}
      {notice ? (
        <Card className="rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">{notice}</Card>
      ) : null}

      {activeTab === "worklist" ? (
        <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50">
          <div className="mb-4 flex items-center gap-2">
            <ListFilter className="h-5 w-5 text-slate-700" />
            <h2 className="text-lg font-black uppercase tracking-wide text-slate-800">Cashier Worklist</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="patient name" value={worklistFilters.patient} onChange={(e) => setWorklistFilters((p) => ({ ...p, patient: e.target.value }))} />
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="visit id" value={worklistFilters.visitId} onChange={(e) => setWorklistFilters((p) => ({ ...p, visitId: e.target.value }))} />
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="bill id" value={worklistFilters.billId} onChange={(e) => setWorklistFilters((p) => ({ ...p, billId: e.target.value }))} />
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="phone" value={worklistFilters.phone} onChange={(e) => setWorklistFilters((p) => ({ ...p, phone: e.target.value }))} />
            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={worklistFilters.status} onChange={(e) => setWorklistFilters((p) => ({ ...p, status: e.target.value }))}>
              <option value="">all status</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partial">Partial</option>
              <option value="Paid">Paid</option>
            </select>
            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={worklistFilters.agingBucket} onChange={(e) => setWorklistFilters((p) => ({ ...p, agingBucket: e.target.value }))}>
              <option value="">all aging</option>
              <option value="7+">7+</option>
              <option value="30+">30+</option>
              <option value="60+">60+</option>
            </select>
            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={worklistFilters.sortBy} onChange={(e) => setWorklistFilters((p) => ({ ...p, sortBy: e.target.value }))}>
              <option value="dueScore">due score</option>
              <option value="dueAmount">due amount</option>
              <option value="patientName">patient name</option>
              <option value="recency">recency</option>
            </select>
            <Button className="rounded-xl bg-slate-900 text-white hover:bg-black" onClick={loadWorklist} isLoading={globalLoading}>
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                  <th className="px-2 py-2">Bill</th>
                  <th className="px-2 py-2">Patient</th>
                  <th className="px-2 py-2">Due</th>
                  <th className="px-2 py-2">Aging</th>
                  <th className="px-2 py-2">Score</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {worklist.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-2 py-6 text-center text-slate-500">No matching bills.</td>
                  </tr>
                ) : (
                  worklist.map((row) => (
                    <tr key={row.billId} className="border-b border-slate-50">
                      <td className="px-2 py-2 font-semibold">#{row.billId}</td>
                      <td className="px-2 py-2">{row.patientName}</td>
                      <td className="px-2 py-2 text-rose-700">{fmt(row.dueAmount)}</td>
                      <td className="px-2 py-2">{row.overdueDays} days</td>
                      <td className="px-2 py-2">{row.dueScore.toFixed(2)}</td>
                      <td className="px-2 py-2">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wider ${statusPill(row.paymentStatus)}`}>
                          {row.paymentStatus}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700"
                          onClick={async () => {
                            await loadBillById(row.billId);
                            setActiveTab("settle");
                          }}
                        >
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {activeTab === "settle" ? (
        <div className="space-y-5">
          <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Visit ID" value={visitIdInput} onChange={(e) => setVisitIdInput(e.target.value)} />
              <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Bill ID" value={billIdInput} onChange={(e) => setBillIdInput(e.target.value)} />
              <Button className="rounded-xl bg-slate-900 text-white hover:bg-black" onClick={loadBillContext} isLoading={globalLoading}>
                <Search className="mr-2 h-4 w-4" />
                Load Bill Context
              </Button>
            </div>
          </Card>

          {selectedBill ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card className="rounded-2xl border-none shadow-md"><p className="text-xs text-slate-500">Patient</p><p className="text-lg font-black">{selectedBill.bill.patientName}</p></Card>
                <Card className="rounded-2xl border-none shadow-md"><p className="text-xs text-slate-500">Total</p><p className="text-lg font-black">{fmt(selectedBill.bill.totalAmount)}</p></Card>
                <Card className="rounded-2xl border-none shadow-md"><p className="text-xs text-slate-500">Paid</p><p className="text-lg font-black text-emerald-700">{fmt(selectedBill.bill.paidAmount)}</p></Card>
                <Card className="rounded-2xl border-none shadow-md"><p className="text-xs text-slate-500">Due</p><p className="text-lg font-black text-rose-700">{fmt(selectedBill.bill.dueAmount)}</p></Card>
              </div>

              <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50">
                <div className="mb-3 flex items-center gap-2">
                  <ReceiptText className="h-5 w-5 text-slate-700" />
                  <h3 className="text-lg font-black uppercase tracking-wide text-slate-800">Source Breakdown</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {groupedLines.length === 0 ? (
                    <p className="text-sm text-slate-500">No source lines available.</p>
                  ) : (
                    groupedLines.map(([source, amount]) => (
                      <div key={source} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">{source}</p>
                        <p className="mt-1 text-base font-black text-slate-800">{fmt(amount)}</p>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50">
                <h3 className="mb-3 text-lg font-black uppercase tracking-wide text-slate-800">Settle / Hold</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" type="number" min={0} max={Math.max(dueAmount, 0)} value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} placeholder="amount" />
                  <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={paymentType} onChange={(e) => setPaymentType(e.target.value as (typeof PAYMENT_TYPES)[number])}>
                    {PAYMENT_TYPES.map((pt) => <option key={pt} value={pt}>{pt}</option>)}
                  </select>
                  <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="payment reference" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
                  <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={settleNow} isLoading={globalLoading} disabled={dueAmount <= 0}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Settle Now
                  </Button>
                  <Button className="rounded-xl bg-amber-500 text-white hover:bg-amber-600" onClick={saveDraft} isLoading={globalLoading}>
                    <Clock3 className="mr-2 h-4 w-4" />
                    Hold as Draft
                  </Button>
                  <Button className="rounded-xl" variant="outline" onClick={() => { setActiveTab("history"); loadHistory(); }}>
                    View History
                  </Button>
                  <Button
                    className="rounded-xl"
                    variant="outline"
                    disabled={!selectedBill.paymentHistory[0]?.receiptNo}
                    onClick={() => {
                      const tx = selectedBill.paymentHistory[0];
                      if (!tx) return;
                      window.open(`/api/cashier/receipt/${tx.cashierPaymentTxnId}`, "_blank");
                    }}
                  >
                    Open Latest Receipt
                  </Button>
                </div>
              </Card>
            </>
          ) : null}
        </div>
      ) : null}

      {activeTab === "history" ? (
        <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50">
          <div className="mb-4 flex items-center gap-2">
            <History className="h-5 w-5 text-slate-700" />
            <h2 className="text-lg font-black uppercase tracking-wide text-slate-800">Payment History</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="bill id" value={historyFilters.billId} onChange={(e) => setHistoryFilters((p) => ({ ...p, billId: e.target.value }))} />
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="patient" value={historyFilters.patient} onChange={(e) => setHistoryFilters((p) => ({ ...p, patient: e.target.value }))} />
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="reference" value={historyFilters.reference} onChange={(e) => setHistoryFilters((p) => ({ ...p, reference: e.target.value }))} />
            <Button className="rounded-xl bg-slate-900 text-white hover:bg-black" onClick={loadHistory} isLoading={globalLoading}>Load History</Button>
          </div>
          <div className="mt-5 space-y-3">
            {historyItems.length === 0 ? (
              <p className="text-sm text-slate-500">No transactions found.</p>
            ) : (
              historyItems.map((row) => (
                <div key={row.cashierPaymentTxnId} className="rounded-xl border border-slate-200 px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-slate-800">Txn #{row.cashierPaymentTxnId} • Bill #{row.billId}</p>
                      <p className="text-xs text-slate-500">{row.patientName || "Unknown"} • {dt(row.createdAt)} • {row.txnType}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wider ${row.txnType === "payment" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{row.txnType}</span>
                      <p className="text-sm font-black">{fmt(row.amount)}</p>
                    </div>
                  </div>
                  {row.txnType === "payment" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        className="rounded-lg bg-amber-500 px-3 py-1 text-xs text-white hover:bg-amber-600"
                        onClick={() => {
                          setCorrectingTxnId(row.cashierPaymentTxnId);
                          setCorrectionForm((p) => ({ ...p, replacementAmount: String(Math.max(row.amount, 0)) }));
                        }}
                      >
                        Correct Payment
                      </Button>
                      {row.receiptNo ? (
                        <Button className="rounded-lg px-3 py-1 text-xs" variant="outline" onClick={() => window.open(`/api/cashier/receipt/${row.cashierPaymentTxnId}`, "_blank")}>Open Receipt</Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>

          {correctingTxnId ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-black text-amber-800">Correction Wizard: Reverse + Repost</p>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <input className="rounded-xl border border-amber-200 px-3 py-2 text-sm" placeholder="reason code" value={correctionForm.reasonCode} onChange={(e) => setCorrectionForm((p) => ({ ...p, reasonCode: e.target.value }))} />
                <input className="rounded-xl border border-amber-200 px-3 py-2 text-sm" placeholder="replacement amount" type="number" value={correctionForm.replacementAmount} onChange={(e) => setCorrectionForm((p) => ({ ...p, replacementAmount: e.target.value }))} />
                <select className="rounded-xl border border-amber-200 px-3 py-2 text-sm" value={correctionForm.replacementPaymentType} onChange={(e) => setCorrectionForm((p) => ({ ...p, replacementPaymentType: e.target.value }))}>
                  {PAYMENT_TYPES.map((pt) => <option key={pt} value={pt}>{pt}</option>)}
                </select>
                <input className="rounded-xl border border-amber-200 px-3 py-2 text-sm" placeholder="replacement reference" value={correctionForm.replacementReference} onChange={(e) => setCorrectionForm((p) => ({ ...p, replacementReference: e.target.value }))} />
                <input className="rounded-xl border border-amber-200 px-3 py-2 text-sm md:col-span-2" placeholder="reason note" value={correctionForm.reasonNote} onChange={(e) => setCorrectionForm((p) => ({ ...p, reasonNote: e.target.value }))} />
              </div>
              <div className="mt-3 flex gap-2">
                <Button className="rounded-xl bg-amber-600 text-white hover:bg-amber-700" onClick={runCorrection} isLoading={globalLoading}>Confirm Correction</Button>
                <Button className="rounded-xl" variant="outline" onClick={() => setCorrectingTxnId(null)}>Cancel</Button>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      {activeTab === "drafts" ? (
        <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileClock className="h-5 w-5 text-slate-700" />
              <h2 className="text-lg font-black uppercase tracking-wide text-slate-800">Draft Hold / Load</h2>
            </div>
            <div className="flex items-center gap-2">
              <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)}>
                <option value="open">open</option>
                <option value="applied">applied</option>
                <option value="cancelled">cancelled</option>
                <option value="all">all</option>
              </select>
              <Button className="rounded-xl bg-slate-900 text-white hover:bg-black" onClick={loadDrafts} isLoading={globalLoading}>Refresh</Button>
            </div>
          </div>
          <div className="space-y-3">
            {drafts.length === 0 ? (
              <p className="text-sm text-slate-500">No drafts in this view.</p>
            ) : (
              drafts.map((draft) => (
                <div key={draft.cashierSettlementDraftId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3">
                  <div>
                    <p className="text-sm font-black">Draft #{draft.cashierSettlementDraftId} • Bill #{draft.billId}</p>
                    <p className="text-xs text-slate-500">{draft.patientName || "Unknown"} • {draft.paymentType} • {fmt(draft.amount)} • {dt(draft.updatedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-700">{draft.draftStatus}</span>
                    {draft.draftStatus === "open" ? (
                      <>
                        <Button className="rounded-lg bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700" onClick={() => applyDraftAction(draft.cashierSettlementDraftId, "apply")}>Apply</Button>
                        <Button className="rounded-lg bg-rose-600 px-3 py-1 text-xs text-white hover:bg-rose-700" onClick={() => applyDraftAction(draft.cashierSettlementDraftId, "cancel")}>Cancel</Button>
                      </>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      ) : null}

      {activeTab === "overdue" ? (
        <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-black uppercase tracking-wide text-slate-800">Overdue Intelligence</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="patient name" value={overdueFilter.patient} onChange={(e) => setOverdueFilter((p) => ({ ...p, patient: e.target.value }))} />
            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={overdueFilter.bucket} onChange={(e) => setOverdueFilter((p) => ({ ...p, bucket: e.target.value }))}>
              <option value="">all buckets</option>
              <option value="7+">7+</option>
              <option value="30+">30+</option>
              <option value="60+">60+</option>
            </select>
            <Button className="rounded-xl bg-slate-900 text-white hover:bg-black" onClick={loadOverdue} isLoading={globalLoading}>Rank Dues</Button>
          </div>

          <div className="mt-5 space-y-3">
            {overdueRows.length === 0 ? (
              <p className="text-sm text-slate-500">No overdue rows found.</p>
            ) : (
              overdueRows.map((row) => (
                <div key={row.billId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3">
                  <div>
                    <p className="text-sm font-black text-slate-800">Bill #{row.billId} • {row.patientName}</p>
                    <p className="text-xs text-slate-500">Overdue {row.overdueDays} days • Bucket {row.agingBucket}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {row.overdueDays >= 60 ? <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-rose-700">60+ Alert</span> : null}
                    {row.overdueDays >= 30 && row.overdueDays < 60 ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700">30+ Alert</span> : null}
                    {row.overdueDays >= 7 && row.overdueDays < 30 ? <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700">7+ Alert</span> : null}
                    <p className="text-sm font-black text-rose-700">{fmt(row.dueAmount)}</p>
                    <p className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">score {row.riskScore.toFixed(2)}</p>
                    <Button className="rounded-lg bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700" onClick={async () => { await loadBillById(row.billId); setActiveTab("settle"); }}>
                      Follow Up
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      ) : null}

      {globalLoading ? (
        <div className="fixed bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          syncing cashier data
        </div>
      ) : null}

      <Card className="rounded-2xl border border-slate-200 bg-slate-50 text-slate-600">
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Immutable financial control active: history updates use reverse + repost only.
        </div>
      </Card>
    </div>
  );
}
