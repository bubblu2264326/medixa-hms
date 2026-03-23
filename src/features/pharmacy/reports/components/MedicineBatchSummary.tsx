"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Filter,
  Package,
  RefreshCcw,
  Search,
  X,
} from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";

type BatchSummary = {
  batch_id: number;
  batch_number: string | null;
  expiry_date: string | null;
  stock_quantity: number;
  stock_sub_quantity: number;
};

type MedicineStockItem = {
  medicine_id: number;
  brand_name: string;
  generic_name: string;
  is_active: boolean;
  sub_unit: string | null;
  sub_units_per_unit: number;
  total_stock_units: number;
  total_stock_sub_units: number;
  batches: BatchSummary[];
};

type MedicineStockApiResponse = {
  success: boolean;
  data?: MedicineStockItem[];
  error?: string;
};

type Filters = {
  includeZeroStock: boolean;
  includeExpired: boolean;
  includeInactive: boolean;
};

const INITIAL_FILTERS: Filters = {
  includeZeroStock: false,
  includeExpired: false,
  includeInactive: false,
};

const formatDate = (value: string | null) => {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const isExpired = (value: string | null) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return date < now;
};

export function MedicineBatchSummary() {
  const [items, setItems] = useState<MedicineStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("q", searchTerm.trim());
    params.set("includeZeroStock", String(filters.includeZeroStock));
    params.set("includeExpired", String(filters.includeExpired));
    params.set("includeInactive", String(filters.includeInactive));
    return params.toString();
  }, [filters.includeExpired, filters.includeInactive, filters.includeZeroStock, searchTerm]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/pharmacy/reports/medicine-stock?${queryString}`);
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const payload = (await res.json()) as MedicineStockApiResponse;
      if (!payload.success) {
        throw new Error(payload.error || "Failed to load medicine stock summary");
      }

      setItems(payload.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load medicine stock summary";
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void fetchData();
    setExpandedRows(new Set());
  }, [fetchData]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!showFilterMenu) {
        return;
      }

      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showFilterMenu]);

  const toggleRow = (medicineId: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(medicineId)) {
        next.delete(medicineId);
      } else {
        next.add(medicineId);
      }
      return next;
    });
  };

  const toggleFilter = (key: keyof Filters) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Medicine Stock (Batch Summary)</h3>
          <p className="text-xs text-slate-500 mt-1">
            Expand any medicine row to view batch-level stock and expiry details.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search medicine..."
              className="pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-64"
            />
          </div>

          <div ref={filterMenuRef} className="relative">
            <Button
              type="button"
              variant="outline"
              className="flex items-center gap-2 border-slate-200"
              onClick={() => setShowFilterMenu((prev) => !prev)}
            >
              <Filter size={15} />
              Filters
            </Button>

            {showFilterMenu ? (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-lg z-20">
                <div className="flex items-center justify-between pb-2 mb-1 border-b border-slate-100">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filter Options</span>
                  <button
                    type="button"
                    aria-label="Close filters"
                    onClick={() => setShowFilterMenu(false)}
                    className="rounded-md p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X size={14} />
                  </button>
                </div>
                <label className="flex items-center gap-2 py-1.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={filters.includeZeroStock}
                    onChange={() => toggleFilter("includeZeroStock")}
                  />
                  Include zero-stock medicines
                </label>
                <label className="flex items-center gap-2 py-1.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={filters.includeExpired}
                    onChange={() => toggleFilter("includeExpired")}
                  />
                  Include expired batches
                </label>
                <label className="flex items-center gap-2 py-1.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={filters.includeInactive}
                    onChange={() => toggleFilter("includeInactive")}
                  />
                  Include inactive medicines
                </label>
              </div>
            ) : null}
          </div>

          <Button
            type="button"
            variant="ghost"
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl"
            onClick={() => void fetchData()}
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="flex items-center justify-center gap-3 p-8">
          <RefreshCcw className="animate-spin text-emerald-500" size={20} />
          <p className="text-sm text-slate-500 font-medium">Loading medicine stock summary...</p>
        </Card>
      ) : null}

      {!loading && error ? (
        <Card className="p-8 text-center space-y-3 border-red-100 bg-red-50/40">
          <p className="text-sm font-semibold text-red-600">{error}</p>
          <Button type="button" variant="outline" onClick={() => void fetchData()}>
            Retry
          </Button>
        </Card>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-10 text-center border-dashed border-2">
          <Package size={36} className="text-slate-300" />
          <h4 className="text-base font-bold text-slate-700 mt-3">No medicines found</h4>
          <p className="text-sm text-slate-500 mt-1">
            Try changing search text or filter selections.
          </p>
        </Card>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Medicine</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Total Stock</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Batches</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const expanded = expandedRows.has(item.medicine_id);

                return (
                  <Fragment key={item.medicine_id}>
                    <tr
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                      onClick={() => toggleRow(item.medicine_id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {expanded ? (
                            <ChevronDown size={16} className="text-slate-400" />
                          ) : (
                            <ChevronRight size={16} className="text-slate-400" />
                          )}
                          <div>
                            <div className="font-bold text-slate-800">{item.brand_name}</div>
                            <div className="text-xs text-slate-400 font-medium italic">{item.generic_name}</div>
                            {!item.is_active ? (
                              <span className="inline-block mt-1 text-[10px] font-bold uppercase text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                                Inactive
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-bold text-slate-700">{item.total_stock_units} Units</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">
                          {item.total_stock_sub_units} {item.sub_unit || "Sub-units"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {item.batches.length}
                        </span>
                      </td>
                    </tr>

                    {expanded ? (
                      <tr className="bg-slate-50/40">
                        <td colSpan={3} className="px-6 py-4">
                          {item.batches.length === 0 ? (
                            <p className="text-sm text-slate-500">No batch records available for this medicine.</p>
                          ) : (
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                              <table className="w-full border-collapse text-sm">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Batch</th>
                                    <th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Expiry</th>
                                    <th className="px-4 py-2.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Stock</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {item.batches.map((batch) => (
                                    <tr key={batch.batch_id} className="border-b border-slate-100 last:border-b-0">
                                      <td className="px-4 py-2.5 font-medium text-slate-700">#{batch.batch_number || "N/A"}</td>
                                      <td className="px-4 py-2.5">
                                        <span className={`text-xs font-semibold ${isExpired(batch.expiry_date) ? "text-red-600" : "text-slate-600"}`}>
                                          {formatDate(batch.expiry_date)}
                                          {isExpired(batch.expiry_date) ? " (Expired)" : ""}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-right">
                                        <span className="font-semibold text-slate-700">{batch.stock_quantity} Units</span>
                                        <span className="block text-[11px] text-slate-500">{batch.stock_sub_quantity} {item.sub_unit || "Sub-units"}</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
