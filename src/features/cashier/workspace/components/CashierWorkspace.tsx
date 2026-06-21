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
import { formatDateTimeInTimezone } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

type CashierTab = "worklist" | "settle" | "history" | "drafts" | "overdue" | "shift";

type ShiftInfo = {
  cashier_shift_id: number;
  opening_cash: number | string | null;
  opened_at: string | null;
  closed_at: string | null;
  closing_cash_counted: number | string | null;
  expected_cash: number | string | null;
  variance: number | string | null;
  status: string;
  notes: string | null;
};

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

// INSURANCE and SPLIT were selectable but unimplemented — the settle/correct
// routes store payment_type as a plain string with no split-tender capture and
// no insurance-claim linkage, so picking them recorded a normal payment under a
// misleading label. Removed until those flows exist. (Backend unions still
// tolerate the old values so historical rows render unchanged.)
const PAYMENT_TYPES = ["CASH", "CARD", "MOBILE"] as const;

// One key per money-mutating action (settle / draft-apply / correct) so a
// network retry replays the original result server-side instead of double-posting.
function newIdempotencyKey() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `cashier-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const tabs: Array<{ id: CashierTab; label: string; icon: React.ReactNode }> = [
  { id: "worklist", label: "Worklist", icon: <ListFilter className="h-4 w-4" /> },
  { id: "settle", label: "Settle", icon: <HandCoins className="h-4 w-4" /> },
  { id: "history", label: "History", icon: <History className="h-4 w-4" /> },
  { id: "drafts", label: "Drafts", icon: <FileClock className="h-4 w-4" /> },
  { id: "overdue", label: "Overdue & Alerts", icon: <AlertTriangle className="h-4 w-4" /> },
  { id: "shift", label: "My Shift", icon: <Clock3 className="h-4 w-4" /> },
];

const fmt = (value: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const dt = (value: string | null, timeZone: string) => {
  if (!value) return "-";
  return formatDateTimeInTimezone(value, timeZone);
};

const statusPill = (status: string) => {
  if (status === "Paid") return "bg-success/10 text-success";
  if (status === "Partial") return "bg-warning/15 text-warning-foreground";
  return "bg-destructive/10 text-destructive";
};

function safeJson<T>(value: unknown): T {
  return value as T;
}

export default function CashierWorkspace() {
  const searchParams = useSearchParams();
  const systemTimezone = useSystemTimezone();

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

  const [shift, setShift] = useState<ShiftInfo | null>(null);
  const [shiftLoaded, setShiftLoaded] = useState(false);
  const [openingCash, setOpeningCash] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [shiftNotes, setShiftNotes] = useState("");

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
      await fetchJson<{ success: boolean; data: { paymentStatus: string } }>("/api/cashier/settle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": newIdempotencyKey(),
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
        headers: {
          "Content-Type": "application/json",
          ...(action === "apply" ? { "Idempotency-Key": newIdempotencyKey() } : {}),
        },
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
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": newIdempotencyKey(),
        },
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

  const loadShift = React.useCallback(async () => {
    setGlobalLoading(true);
    setError(null);
    try {
      const payload = await fetchJson<{ activeShift: ShiftInfo | null }>("/api/cashier/shift");
      setShift(payload.activeShift);
      setShiftLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load shift");
    } finally {
      setGlobalLoading(false);
    }
  }, []);

  const openShift = async () => {
    setGlobalLoading(true);
    setError(null);
    setNotice(null);
    try {
      await fetchJson("/api/cashier/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingCash: Number(openingCash || 0), notes: shiftNotes.trim() || undefined }),
      });
      setOpeningCash("");
      setShiftNotes("");
      setNotice("Shift opened.");
      await loadShift();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open shift");
    } finally {
      setGlobalLoading(false);
    }
  };

  const closeShift = async () => {
    setGlobalLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetchJson<{ shift: ShiftInfo }>("/api/cashier/shift", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countedCash: Number(countedCash || 0), notes: shiftNotes.trim() || undefined }),
      });
      setCountedCash("");
      setShiftNotes("");
      setNotice(`Shift closed. Variance ${fmt(Number(res.shift?.variance ?? 0))}.`);
      await loadShift();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to close shift");
    } finally {
      setGlobalLoading(false);
    }
  };

  // Render a clean, printable receipt in a new window (the buttons previously
  // opened the raw JSON API response). Pure client-side print — no PDF lib.
  const printReceipt = async (cashierPaymentTxnId: number) => {
    type ReceiptPayload = {
      receipt: {
        cashierPaymentTxnId: number;
        billId: number;
        amount: number;
        txnType: string;
        paymentType: string;
        paymentReference: string | null;
        receiptNo: string | null;
        notes: string | null;
        createdAt: string | null;
        patientName: string;
        cashierName: string | null;
      };
    };
    try {
      const { receipt: r } = await fetchJson<ReceiptPayload>(`/api/cashier/receipt/${cashierPaymentTxnId}`);
      const win = window.open("", "_blank", "width=420,height=640");
      if (!win) {
        setError("Pop-up blocked — allow pop-ups for this site to print receipts.");
        return;
      }
      const esc = (s: string) =>
        s.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
      const lines: Array<[string, string]> = [
        ["Receipt No", r.receiptNo || `CPT-${r.cashierPaymentTxnId}`],
        ["Date", dt(r.createdAt, systemTimezone)],
        ["Patient", r.patientName || "-"],
        ["Bill", `#${r.billId}`],
        ["Method", r.paymentType],
        ["Reference", r.paymentReference || "-"],
        ["Cashier", r.cashierName || "-"],
      ];
      win.document.write(
        `<!doctype html><html><head><title>Receipt ${esc(r.receiptNo || String(r.cashierPaymentTxnId))}</title>` +
          `<style>` +
          `*{font-family:ui-monospace,Menlo,Consolas,monospace;box-sizing:border-box}` +
          `body{width:320px;margin:16px auto;color:#111}` +
          `h1{font-size:15px;text-align:center;margin:0 0 2px}` +
          `.sub{text-align:center;font-size:11px;color:#555;margin-bottom:12px}` +
          `table{width:100%;border-collapse:collapse;font-size:12px}` +
          `td{padding:3px 0;vertical-align:top}td.k{color:#555}td.v{text-align:right;font-weight:600}` +
          `.amt{margin-top:12px;border-top:1px dashed #999;padding-top:8px;display:flex;justify-content:space-between;font-size:14px;font-weight:700}` +
          `.foot{margin-top:14px;text-align:center;font-size:10px;color:#777}` +
          `</style></head><body>` +
          `<h1>Fouzia Ishaq Clinic</h1><div class="sub">Payment Receipt</div>` +
          `<table>${lines.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td class="v">${esc(v)}</td></tr>`).join("")}</table>` +
          `<div class="amt"><span>${r.txnType === "reversal" ? "Reversed" : "Amount Paid"}</span><span>${esc(fmt(r.amount))}</span></div>` +
          (r.notes ? `<div class="foot">${esc(r.notes)}</div>` : "") +
          `<div class="foot">Thank you.</div>` +
          `<script>window.onload=function(){window.print()}<\/script>` +
          `</body></html>`
      );
      win.document.close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load receipt");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === "worklist") loadWorklist();
                if (tab.id === "history") loadHistory();
                if (tab.id === "drafts") loadDrafts();
                if (tab.id === "overdue") loadOverdue();
                if (tab.id === "shift") loadShift();
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <Card className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">{error}</Card> : null}
      {notice ? (
        <Card className="rounded-lg border border-success/30 bg-success/10 text-success">{notice}</Card>
      ) : null}

      {activeTab === "worklist" ? (
        <Card className="rounded-lg shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ListFilter className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Cashier Worklist</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <input className="rounded-md border border-input px-3 py-2 text-sm" placeholder="patient name" value={worklistFilters.patient} onChange={(e) => setWorklistFilters((p) => ({ ...p, patient: e.target.value }))} />
            <input className="rounded-md border border-input px-3 py-2 text-sm" placeholder="visit id" value={worklistFilters.visitId} onChange={(e) => setWorklistFilters((p) => ({ ...p, visitId: e.target.value }))} />
            <input className="rounded-md border border-input px-3 py-2 text-sm" placeholder="bill id" value={worklistFilters.billId} onChange={(e) => setWorklistFilters((p) => ({ ...p, billId: e.target.value }))} />
            <input className="rounded-md border border-input px-3 py-2 text-sm" placeholder="phone" value={worklistFilters.phone} onChange={(e) => setWorklistFilters((p) => ({ ...p, phone: e.target.value }))} />
            <select className="rounded-md border border-input px-3 py-2 text-sm" value={worklistFilters.status} onChange={(e) => setWorklistFilters((p) => ({ ...p, status: e.target.value }))}>
              <option value="">all status</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partial">Partial</option>
              <option value="Paid">Paid</option>
            </select>
            <select className="rounded-md border border-input px-3 py-2 text-sm" value={worklistFilters.agingBucket} onChange={(e) => setWorklistFilters((p) => ({ ...p, agingBucket: e.target.value }))}>
              <option value="">all aging</option>
              <option value="7+">7+</option>
              <option value="30+">30+</option>
              <option value="60+">60+</option>
            </select>
            <select className="rounded-md border border-input px-3 py-2 text-sm" value={worklistFilters.sortBy} onChange={(e) => setWorklistFilters((p) => ({ ...p, sortBy: e.target.value }))}>
              <option value="dueScore">due score</option>
              <option value="dueAmount">due amount</option>
              <option value="patientName">patient name</option>
              <option value="recency">recency</option>
            </select>
            <Button className="rounded-md" onClick={loadWorklist} isLoading={globalLoading}>
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                    <td colSpan={7} className="px-2 py-6 text-center text-muted-foreground">No matching bills.</td>
                  </tr>
                ) : (
                  worklist.map((row) => (
                    <tr key={row.billId} className="border-b border-border">
                      <td className="px-2 py-2 font-semibold font-mono tabular-nums">#{row.billId}</td>
                      <td className="px-2 py-2">{row.patientName}</td>
                      <td className="px-2 py-2 font-mono tabular-nums text-warning-foreground">{fmt(row.dueAmount)}</td>
                      <td className="px-2 py-2 font-mono tabular-nums">{row.overdueDays} days</td>
                      <td className="px-2 py-2 font-mono tabular-nums">{row.dueScore.toFixed(2)}</td>
                      <td className="px-2 py-2">
                        <span className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusPill(row.paymentStatus)}`}>
                          {row.paymentStatus}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          className="rounded-md px-3 py-1 text-xs"
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
          <Card className="rounded-lg shadow-sm">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <input className="rounded-md border border-input px-3 py-2 text-sm" placeholder="Visit ID" value={visitIdInput} onChange={(e) => setVisitIdInput(e.target.value)} />
              <input className="rounded-md border border-input px-3 py-2 text-sm" placeholder="Bill ID" value={billIdInput} onChange={(e) => setBillIdInput(e.target.value)} />
              <Button className="rounded-md" onClick={loadBillContext} isLoading={globalLoading}>
                <Search className="mr-2 h-4 w-4" />
                Load Bill Context
              </Button>
            </div>
          </Card>

          {selectedBill ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card className="rounded-lg shadow-sm"><p className="text-xs text-muted-foreground">Patient</p><p className="text-lg font-semibold text-foreground">{selectedBill.bill.patientName}</p></Card>
                <Card className="rounded-lg shadow-sm"><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-semibold font-mono tabular-nums text-foreground">{fmt(selectedBill.bill.totalAmount)}</p></Card>
                <Card className="rounded-lg shadow-sm"><p className="text-xs text-muted-foreground">Paid</p><p className="text-lg font-semibold font-mono tabular-nums text-success">{fmt(selectedBill.bill.paidAmount)}</p></Card>
                <Card className="rounded-lg shadow-sm"><p className="text-xs text-muted-foreground">Due</p><p className="text-lg font-semibold font-mono tabular-nums text-warning-foreground">{fmt(selectedBill.bill.dueAmount)}</p></Card>
              </div>

              <Card className="rounded-lg shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <ReceiptText className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">Source Breakdown</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {groupedLines.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No source lines available.</p>
                  ) : (
                    groupedLines.map(([source, amount]) => (
                      <div key={source} className="rounded-md border border-border bg-muted px-3 py-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{source}</p>
                        <p className="mt-1 text-base font-semibold font-mono tabular-nums text-foreground">{fmt(amount)}</p>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card className="rounded-lg shadow-sm">
                <h3 className="mb-3 text-lg font-semibold tracking-tight text-foreground">Settle / Hold</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input className="rounded-md border border-input px-3 py-2 text-sm font-mono tabular-nums" type="number" min={0} max={Math.max(dueAmount, 0)} value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} placeholder="amount" />
                  <select className="rounded-md border border-input px-3 py-2 text-sm" value={paymentType} onChange={(e) => setPaymentType(e.target.value as (typeof PAYMENT_TYPES)[number])}>
                    {PAYMENT_TYPES.map((pt) => <option key={pt} value={pt}>{pt}</option>)}
                  </select>
                  <input className="rounded-md border border-input px-3 py-2 text-sm" placeholder="payment reference" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
                  <input className="rounded-md border border-input px-3 py-2 text-sm" placeholder="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button className="rounded-md bg-success text-success-foreground hover:bg-success/90" onClick={settleNow} isLoading={globalLoading} disabled={dueAmount <= 0}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Settle Now
                  </Button>
                  <Button className="rounded-md bg-warning text-warning-foreground hover:bg-warning/90" onClick={saveDraft} isLoading={globalLoading}>
                    <Clock3 className="mr-2 h-4 w-4" />
                    Hold as Draft
                  </Button>
                  <Button className="rounded-md" variant="outline" onClick={() => { setActiveTab("history"); loadHistory(); }}>
                    View History
                  </Button>
                  <Button
                    className="rounded-md"
                    variant="outline"
                    disabled={!selectedBill.paymentHistory[0]?.receiptNo}
                    onClick={() => {
                      const tx = selectedBill.paymentHistory[0];
                      if (!tx) return;
                      printReceipt(tx.cashierPaymentTxnId);
                    }}
                  >
                    Print Latest Receipt
                  </Button>
                </div>
              </Card>
            </>
          ) : null}
        </div>
      ) : null}

      {activeTab === "history" ? (
        <Card className="rounded-lg shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Payment History</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <input className="rounded-md border border-input px-3 py-2 text-sm" placeholder="bill id" value={historyFilters.billId} onChange={(e) => setHistoryFilters((p) => ({ ...p, billId: e.target.value }))} />
            <input className="rounded-md border border-input px-3 py-2 text-sm" placeholder="patient" value={historyFilters.patient} onChange={(e) => setHistoryFilters((p) => ({ ...p, patient: e.target.value }))} />
            <input className="rounded-md border border-input px-3 py-2 text-sm" placeholder="reference" value={historyFilters.reference} onChange={(e) => setHistoryFilters((p) => ({ ...p, reference: e.target.value }))} />
            <Button className="rounded-md" onClick={loadHistory} isLoading={globalLoading}>Load History</Button>
          </div>
          <div className="mt-5 space-y-3">
            {historyItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions found.</p>
            ) : (
              historyItems.map((row) => (
                <div key={row.cashierPaymentTxnId} className="rounded-md border border-border px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Txn #{row.cashierPaymentTxnId} • Bill #{row.billId}</p>
                      <p className="text-xs text-muted-foreground">{row.patientName || "Unknown"} • {dt(row.createdAt, systemTimezone)} • {row.txnType}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${row.txnType === "payment" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{row.txnType}</span>
                      <p className={`text-sm font-semibold font-mono tabular-nums ${row.txnType === "payment" ? "text-success" : "text-destructive"}`}>{fmt(row.amount)}</p>
                    </div>
                  </div>
                  {row.txnType === "payment" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        className="rounded-md bg-warning px-3 py-1 text-xs text-warning-foreground hover:bg-warning/90"
                        onClick={() => {
                          setCorrectingTxnId(row.cashierPaymentTxnId);
                          setCorrectionForm((p) => ({ ...p, replacementAmount: String(Math.max(row.amount, 0)) }));
                        }}
                      >
                        Correct Payment
                      </Button>
                      {row.receiptNo ? (
                        <Button className="rounded-md px-3 py-1 text-xs" variant="outline" onClick={() => printReceipt(row.cashierPaymentTxnId)}>Print Receipt</Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>

          {correctingTxnId ? (
            <div className="mt-5 rounded-lg border border-warning/40 bg-warning/15 p-4">
              <p className="text-sm font-semibold text-warning-foreground">Correction Wizard: Reverse + Repost</p>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <input className="rounded-md border border-input px-3 py-2 text-sm" placeholder="reason code" value={correctionForm.reasonCode} onChange={(e) => setCorrectionForm((p) => ({ ...p, reasonCode: e.target.value }))} />
                <input className="rounded-md border border-input px-3 py-2 text-sm font-mono tabular-nums" placeholder="replacement amount" type="number" value={correctionForm.replacementAmount} onChange={(e) => setCorrectionForm((p) => ({ ...p, replacementAmount: e.target.value }))} />
                <select className="rounded-md border border-input px-3 py-2 text-sm" value={correctionForm.replacementPaymentType} onChange={(e) => setCorrectionForm((p) => ({ ...p, replacementPaymentType: e.target.value }))}>
                  {PAYMENT_TYPES.map((pt) => <option key={pt} value={pt}>{pt}</option>)}
                </select>
                <input className="rounded-md border border-input px-3 py-2 text-sm" placeholder="replacement reference" value={correctionForm.replacementReference} onChange={(e) => setCorrectionForm((p) => ({ ...p, replacementReference: e.target.value }))} />
                <input className="rounded-md border border-input px-3 py-2 text-sm md:col-span-2" placeholder="reason note" value={correctionForm.reasonNote} onChange={(e) => setCorrectionForm((p) => ({ ...p, reasonNote: e.target.value }))} />
              </div>
              <div className="mt-3 flex gap-2">
                <Button className="rounded-md bg-warning text-warning-foreground hover:bg-warning/90" onClick={runCorrection} isLoading={globalLoading}>Confirm Correction</Button>
                <Button className="rounded-md" variant="outline" onClick={() => setCorrectingTxnId(null)}>Cancel</Button>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      {activeTab === "drafts" ? (
        <Card className="rounded-lg shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileClock className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Draft Hold / Load</h2>
            </div>
            <div className="flex items-center gap-2">
              <select className="rounded-md border border-input px-3 py-2 text-sm" value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)}>
                <option value="open">open</option>
                <option value="applied">applied</option>
                <option value="cancelled">cancelled</option>
                <option value="all">all</option>
              </select>
              <Button className="rounded-md" onClick={loadDrafts} isLoading={globalLoading}>Refresh</Button>
            </div>
          </div>
          <div className="space-y-3">
            {drafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No drafts in this view.</p>
            ) : (
              drafts.map((draft) => (
                <div key={draft.cashierSettlementDraftId} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Draft #{draft.cashierSettlementDraftId} • Bill #{draft.billId}</p>
                    <p className="text-xs text-muted-foreground">{draft.patientName || "Unknown"} • {draft.paymentType} • {fmt(draft.amount)} • {dt(draft.updatedAt, systemTimezone)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{draft.draftStatus}</span>
                    {draft.draftStatus === "open" ? (
                      <>
                        <Button className="rounded-md bg-success px-3 py-1 text-xs text-success-foreground hover:bg-success/90" onClick={() => applyDraftAction(draft.cashierSettlementDraftId, "apply")}>Apply</Button>
                        <Button className="rounded-md bg-destructive px-3 py-1 text-xs text-white hover:bg-destructive/90" onClick={() => applyDraftAction(draft.cashierSettlementDraftId, "cancel")}>Cancel</Button>
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
        <Card className="rounded-lg shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning-foreground" />
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Overdue Intelligence</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input className="rounded-md border border-input px-3 py-2 text-sm" placeholder="patient name" value={overdueFilter.patient} onChange={(e) => setOverdueFilter((p) => ({ ...p, patient: e.target.value }))} />
            <select className="rounded-md border border-input px-3 py-2 text-sm" value={overdueFilter.bucket} onChange={(e) => setOverdueFilter((p) => ({ ...p, bucket: e.target.value }))}>
              <option value="">all buckets</option>
              <option value="7+">7+</option>
              <option value="30+">30+</option>
              <option value="60+">60+</option>
            </select>
            <Button className="rounded-md" onClick={loadOverdue} isLoading={globalLoading}>Rank Dues</Button>
          </div>

          <div className="mt-5 space-y-3">
            {overdueRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No overdue rows found.</p>
            ) : (
              overdueRows.map((row) => (
                <div key={row.billId} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Bill #{row.billId} • {row.patientName}</p>
                    <p className="text-xs text-muted-foreground">Overdue {row.overdueDays} days • Bucket {row.agingBucket}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {row.overdueDays >= 60 ? <span className="rounded-md bg-destructive/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-destructive">60+ Alert</span> : null}
                    {row.overdueDays >= 30 && row.overdueDays < 60 ? <span className="rounded-md bg-warning/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-warning-foreground">30+ Alert</span> : null}
                    {row.overdueDays >= 7 && row.overdueDays < 30 ? <span className="rounded-md bg-info/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-info">7+ Alert</span> : null}
                    <p className="text-sm font-semibold font-mono tabular-nums text-warning-foreground">{fmt(row.dueAmount)}</p>
                    <p className="rounded-md bg-muted px-2 py-1 text-xs font-semibold font-mono tabular-nums text-muted-foreground">score {row.riskScore.toFixed(2)}</p>
                    <Button className="rounded-md bg-success px-3 py-1 text-xs text-success-foreground hover:bg-success/90" onClick={async () => { await loadBillById(row.billId); setActiveTab("settle"); }}>
                      Follow Up
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      ) : null}

      {activeTab === "shift" ? (
        <Card className="rounded-lg shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold tracking-tight text-foreground">My Shift</h2>
          </div>
          {!shiftLoaded ? (
            <p className="text-sm text-muted-foreground">Loading shift…</p>
          ) : shift ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-md border border-border p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                  <p className="text-sm font-semibold text-success">Open</p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Opened</p>
                  <p className="text-sm font-semibold font-mono tabular-nums text-foreground">{dt(shift.opened_at, systemTimezone)}</p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Opening Cash</p>
                  <p className="text-sm font-semibold font-mono tabular-nums text-foreground">{fmt(Number(shift.opening_cash ?? 0))}</p>
                </div>
              </div>
              <div className="rounded-md border border-warning/40 bg-warning/10 p-4">
                <p className="text-sm font-semibold text-warning-foreground">Close shift</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Count the drawer and enter the total. The system computes expected cash (opening + cash collected this shift) and the variance.
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <input className="rounded-md border border-input px-3 py-2 text-sm font-mono tabular-nums" type="number" placeholder="counted cash" value={countedCash} onChange={(e) => setCountedCash(e.target.value)} />
                  <input className="rounded-md border border-input px-3 py-2 text-sm md:col-span-2" placeholder="notes (optional)" value={shiftNotes} onChange={(e) => setShiftNotes(e.target.value)} />
                </div>
                <Button className="mt-3 rounded-md bg-warning text-warning-foreground hover:bg-warning/90" onClick={closeShift} isLoading={globalLoading} disabled={!countedCash}>Close Shift</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">No open shift. Start one to track your drawer for this session.</p>
              <div className="rounded-md border border-border p-4">
                <p className="text-sm font-semibold text-foreground">Open shift</p>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <input className="rounded-md border border-input px-3 py-2 text-sm font-mono tabular-nums" type="number" placeholder="opening cash" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} />
                  <input className="rounded-md border border-input px-3 py-2 text-sm md:col-span-2" placeholder="notes (optional)" value={shiftNotes} onChange={(e) => setShiftNotes(e.target.value)} />
                </div>
                <Button className="mt-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90" onClick={openShift} isLoading={globalLoading}>Open Shift</Button>
              </div>
            </div>
          )}
        </Card>
      ) : null}

      {globalLoading ? (
        <div className="fixed bottom-6 right-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary-foreground shadow-md">
          <Loader2 className="h-4 w-4 animate-spin" />
          syncing cashier data
        </div>
      ) : null}

      <Card className="rounded-lg border border-border bg-muted text-muted-foreground">
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
          <CheckCircle2 className="h-4 w-4 text-success" />
          Immutable financial control active: history updates use reverse + repost only.
        </div>
      </Card>
    </div>
  );
}
