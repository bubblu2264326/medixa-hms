"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getTimezoneNowDateInput } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

type FinanceSummary = {
  gross_revenue?: number;
  payroll_expense?: number;
  operational_expense?: number;
  capex?: number;
  total_expense?: number;
  net_operating_profit?: number;
  expenses?: number;
};

type ExpenseRow = {
  expense_id: number;
  expense_date: string;
  category: string;
  amount: number | string;
  vendor_name?: string | null;
};

type AssetRow = {
  asset_purchase_id: number;
  purchase_date: string;
  asset_name: string;
  asset_category: string;
  amount: number | string;
};

type ExpenseCategory = {
  code: string;
  label: string;
};
type FinanceScope = "combined" | "non_pharmacy";

function FinancialsPageContent() {
  const systemTimezone = useSystemTimezone();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const today = useMemo(() => getTimezoneNowDateInput(systemTimezone), [systemTimezone]);

  const [summary, setSummary] = useState<FinanceSummary>({});
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [scope, setScope] = useState<FinanceScope>("combined");

  const [expenseForm, setExpenseForm] = useState({
    expense_date: today,
    category: "",
    amount: 0,
    vendor_name: "",
    notes: "",
  });

  const [assetForm, setAssetForm] = useState({
    purchase_date: today,
    asset_name: "",
    asset_category: "",
    amount: 0,
    vendor_name: "",
    notes: "",
  });

  useEffect(() => {
    setExpenseForm((prev) => ({ ...prev, expense_date: today }));
    setAssetForm((prev) => ({ ...prev, purchase_date: today }));
  }, [today]);

  const cards = useMemo(
    () => [
      { label: "Gross Revenue", value: Number(summary.gross_revenue ?? 0), tone: "text-emerald-700" },
      { label: "Payroll Cost", value: Number(summary.payroll_expense ?? 0), tone: "text-slate-700" },
      { label: "Operational Expense", value: Number(summary.operational_expense ?? 0), tone: "text-slate-700" },
      { label: "Capex", value: Number(summary.capex ?? 0), tone: "text-slate-700" },
      { label: "Total Expense", value: Number(summary.total_expense ?? summary.expenses ?? 0), tone: "text-rose-700" },
      { label: "Net Operating Profit", value: Number(summary.net_operating_profit ?? 0), tone: "text-indigo-700" },
    ],
    [summary]
  );

  const loadData = async (activeScope: FinanceScope = scope) => {
    setLoading(true);
    setError("");
    try {
      const [summaryRes, expensesRes, assetsRes, mastersRes] = await Promise.all([
        fetch(`/api/admin/financials?scope=${activeScope}`, { credentials: "include" }),
        fetch("/api/admin/finance/expenses", { credentials: "include" }),
        fetch("/api/admin/finance/assets", { credentials: "include" }),
        fetch("/api/admin/finance/masters", { credentials: "include" }),
      ]);

      const summaryData = await summaryRes.json();
      const expensesData = await expensesRes.json();
      const assetsData = await assetsRes.json();
      const mastersData = await mastersRes.json();

      if (!summaryRes.ok) throw new Error(summaryData?.error || "Failed to load financial summary");
      if (!expensesRes.ok) throw new Error(expensesData?.error || "Failed to load expense entries");
      if (!assetsRes.ok) throw new Error(assetsData?.error || "Failed to load asset purchases");
      if (!mastersRes.ok) throw new Error(mastersData?.error || "Failed to load finance categories");

      setSummary(summaryData ?? {});
      setExpenses(Array.isArray(expensesData) ? expensesData : []);
      setAssets(Array.isArray(assetsData) ? assetsData : []);
      setCategories(Array.isArray(mastersData?.expense_categories) ? mastersData.expense_categories : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load financial dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlScope = searchParams.get("scope");
    if (!urlScope) {
      setScopeInUrl("combined");
      return;
    }
    const normalizedScope: FinanceScope = urlScope === "non_pharmacy" ? "non_pharmacy" : "combined";
    setScope(normalizedScope);
    loadData(normalizedScope);
  }, [searchParams]);

  const setScopeInUrl = (nextScope: FinanceScope) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("scope", nextScope);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleModeChange = (mode: "pharmacy" | FinanceScope) => {
    if (mode === "pharmacy") {
      router.push("/admin/cashier");
      return;
    }
    if (mode === scope) return;
    setScopeInUrl(mode);
  };

  const createExpense = async () => {
    if (!expenseForm.expense_date || !expenseForm.category || Number(expenseForm.amount) <= 0) {
      setError("Expense date, category and a positive amount are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...expenseForm,
          amount: Number(expenseForm.amount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save expense");
      setExpenseForm({ expense_date: today, category: "", amount: 0, vendor_name: "", notes: "" });
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  const createAsset = async () => {
    if (
      !assetForm.purchase_date ||
      !assetForm.asset_name.trim() ||
      !assetForm.asset_category.trim() ||
      Number(assetForm.amount) <= 0
    ) {
      setError("Purchase date, asset name, asset category and a positive amount are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/finance/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...assetForm,
          amount: Number(assetForm.amount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save asset purchase");
      setAssetForm({ purchase_date: today, asset_name: "", asset_category: "", amount: 0, vendor_name: "", notes: "" });
      await loadData();
    } catch (e: any) {
      setError(e?.message || "Failed to save asset purchase");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">System Financials</h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            Consolidated revenue, payroll, operating expenses, and asset purchases.
          </p>
        </div>
        <Button
          onClick={() => loadData(scope)}
          disabled={loading}
          className="h-10 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black uppercase tracking-widest px-4"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <Card className="rounded-2xl border border-slate-100 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => handleModeChange("pharmacy")}
            className="h-9 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-black uppercase tracking-widest px-4"
          >
            Pharmacy Financials
          </Button>
          <Button
            onClick={() => handleModeChange("combined")}
            className={`h-9 rounded-xl text-[11px] font-black uppercase tracking-widest px-4 ${
              scope === "combined"
                ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            Combined
          </Button>
          <Button
            onClick={() => handleModeChange("non_pharmacy")}
            className={`h-9 rounded-xl text-[11px] font-black uppercase tracking-widest px-4 ${
              scope === "non_pharmacy"
                ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            Non-Pharmacy
          </Button>
        </div>
      </Card>

      {error ? (
        <Card className="border border-red-100 bg-red-50 p-4 rounded-2xl">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.label} className="rounded-2xl border border-slate-100 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.label}</p>
            <p className={`text-2xl font-black mt-2 ${card.tone}`}>PKR {card.value.toLocaleString()}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card className="rounded-3xl border border-slate-100 p-5 space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Add Operational Expense</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="date"
              value={expenseForm.expense_date}
              onChange={(e) => setExpenseForm((p) => ({ ...p, expense_date: e.target.value }))}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            />
            <select
              value={expenseForm.category}
              onChange={(e) => setExpenseForm((p) => ({ ...p, category: e.target.value }))}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            >
              <option value="">Category</option>
              {categories.map((cat) => (
                <option key={cat.code} value={cat.code}>
                  {cat.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm((p) => ({ ...p, amount: Number(e.target.value || 0) }))}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
              placeholder="Amount"
            />
            <input
              value={expenseForm.vendor_name}
              onChange={(e) => setExpenseForm((p) => ({ ...p, vendor_name: e.target.value }))}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
              placeholder="Vendor (optional)"
            />
          </div>
          <textarea
            value={expenseForm.notes}
            onChange={(e) => setExpenseForm((p) => ({ ...p, notes: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm min-h-[80px]"
            placeholder="Notes (optional)"
          />
          <Button
            onClick={createExpense}
            disabled={saving || !expenseForm.category || !expenseForm.expense_date || Number(expenseForm.amount) <= 0}
            className="h-10 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black uppercase tracking-widest px-4"
          >
            Add Expense
          </Button>
        </Card>

        <Card className="rounded-3xl border border-slate-100 p-5 space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Add Asset Purchase (Capex)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="date"
              value={assetForm.purchase_date}
              onChange={(e) => setAssetForm((p) => ({ ...p, purchase_date: e.target.value }))}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            />
            <input
              value={assetForm.asset_category}
              onChange={(e) => setAssetForm((p) => ({ ...p, asset_category: e.target.value }))}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
              placeholder="Asset category (e.g. machine)"
            />
            <input
              value={assetForm.asset_name}
              onChange={(e) => setAssetForm((p) => ({ ...p, asset_name: e.target.value }))}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
              placeholder="Asset name"
            />
            <input
              type="number"
              min={0}
              value={assetForm.amount}
              onChange={(e) => setAssetForm((p) => ({ ...p, amount: Number(e.target.value || 0) }))}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
              placeholder="Amount"
            />
            <input
              value={assetForm.vendor_name}
              onChange={(e) => setAssetForm((p) => ({ ...p, vendor_name: e.target.value }))}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm md:col-span-2"
              placeholder="Vendor (optional)"
            />
          </div>
          <textarea
            value={assetForm.notes}
            onChange={(e) => setAssetForm((p) => ({ ...p, notes: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm min-h-[80px]"
            placeholder="Notes (optional)"
          />
          <Button
            onClick={createAsset}
            disabled={
              saving ||
              !assetForm.asset_name ||
              !assetForm.asset_category ||
              !assetForm.purchase_date ||
              Number(assetForm.amount) <= 0
            }
            className="h-10 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black uppercase tracking-widest px-4"
          >
            Add Asset Purchase
          </Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card className="rounded-3xl border border-slate-100 p-5">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-3">Recent Expenses</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[560px]">
              <thead>
                <tr className="bg-slate-50/70">
                  <th className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                  <th className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Category</th>
                  <th className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor</th>
                  <th className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-4 text-sm font-semibold text-slate-500">
                      No expense entries yet.
                    </td>
                  </tr>
                ) : (
                  expenses.slice(0, 15).map((row) => (
                    <tr key={row.expense_id} className="border-t border-slate-100">
                      <td className="px-2 py-2 text-xs font-semibold text-slate-700">{row.expense_date}</td>
                      <td className="px-2 py-2 text-xs font-semibold text-slate-700">{row.category}</td>
                      <td className="px-2 py-2 text-xs font-semibold text-slate-700">{row.vendor_name || "-"}</td>
                      <td className="px-2 py-2 text-xs font-black text-slate-800">PKR {Number(row.amount).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="rounded-3xl border border-slate-100 p-5">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-3">Recent Asset Purchases</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[560px]">
              <thead>
                <tr className="bg-slate-50/70">
                  <th className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                  <th className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Category</th>
                  <th className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Asset</th>
                  <th className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                </tr>
              </thead>
              <tbody>
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-4 text-sm font-semibold text-slate-500">
                      No asset purchases yet.
                    </td>
                  </tr>
                ) : (
                  assets.slice(0, 15).map((row) => (
                    <tr key={row.asset_purchase_id} className="border-t border-slate-100">
                      <td className="px-2 py-2 text-xs font-semibold text-slate-700">{row.purchase_date}</td>
                      <td className="px-2 py-2 text-xs font-semibold text-slate-700">{row.asset_category}</td>
                      <td className="px-2 py-2 text-xs font-semibold text-slate-700">{row.asset_name}</td>
                      <td className="px-2 py-2 text-xs font-black text-slate-800">PKR {Number(row.amount).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function FinancialsPage() {
  return (
    <Suspense fallback={<div className="py-6 text-sm font-semibold text-slate-500">Loading financials...</div>}>
      <FinancialsPageContent />
    </Suspense>
  );
}
