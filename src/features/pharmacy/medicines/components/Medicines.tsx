"use client";

import React, { useState, useEffect } from "react";
import { PlusCircle, Search, Edit2, Package, Tags, Factory, Pill, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import MedicineForm from "./MedicineForm";

interface Medicine {
  medicine_id: number;
  id?: number;
  generic_name: string;
  brand_name: string;
  category: string;
  dosage_value?: number;
  dosage_unit?: string;
  form?: string;
  manufacturer?: string;
  stock_quantity?: number;
  stock_sub_quantity?: number;
  is_active?: boolean;
}

type MasterType = "category" | "manufacturer" | "form";

type MasterRecord = {
  id: number;
  name: string;
};

const MASTER_META: Record<MasterType, { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  category: { label: "Categories", icon: Tags },
  manufacturer: { label: "Manufacturers", icon: Factory },
  form: { label: "Forms", icon: Pill },
};

export const Medicines: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [activeMasterType, setActiveMasterType] = useState<MasterType | null>(null);
  const [masterItems, setMasterItems] = useState<MasterRecord[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterSaving, setMasterSaving] = useState(false);
  const [masterDeletingId, setMasterDeletingId] = useState<number | null>(null);
  const [masterSearch, setMasterSearch] = useState("");
  const [newMasterName, setNewMasterName] = useState("");

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/medicine");
      if (!res.ok) throw new Error("Failed to fetch medicines");
      const data = await res.json();
      setMedicines(data);
    } catch (error) {
      toast.error("Failed to load medicines");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  useEffect(() => {
    if (!activeMasterType) {
      return;
    }

    const controller = new AbortController();

    const fetchMasters = async () => {
      try {
        setMasterLoading(true);

        const params = new URLSearchParams({
          type: activeMasterType,
          q: masterSearch,
        });

        const res = await fetch(`/api/medicine/masters?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch ${MASTER_META[activeMasterType].label.toLowerCase()}`);
        }

        const payload = (await res.json()) as { success: boolean; data?: MasterRecord[]; error?: string };

        if (!controller.signal.aborted) {
          setMasterItems(payload.data ?? []);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        toast.error("Failed to load master records");
        console.error(error);
      } finally {
        if (!controller.signal.aborted) {
          setMasterLoading(false);
        }
      }
    };

    void fetchMasters();

    return () => controller.abort();
  }, [activeMasterType, masterSearch]);

  const handleAdd = () => {
    setEditingMedicine(null);
    setIsFormOpen(true);
  };

  const handleEdit = (medicine: Medicine) => {
    setEditingMedicine(medicine);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingMedicine(null);
  };

  const handleFormSuccess = () => {
    fetchMedicines();
    handleFormClose();
  };

  const openMasterManager = (type: MasterType) => {
    setActiveMasterType(type);
    setMasterSearch("");
    setNewMasterName("");
    setMasterItems([]);
  };

  const closeMasterManager = () => {
    setActiveMasterType(null);
    setMasterSearch("");
    setNewMasterName("");
    setMasterItems([]);
    setMasterDeletingId(null);
  };

  const handleCreateMaster = async () => {
    if (!activeMasterType || !newMasterName.trim()) {
      return;
    }

    try {
      setMasterSaving(true);

      const res = await fetch("/api/medicine/masters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeMasterType,
          name: newMasterName,
        }),
      });

      const payload = (await res.json()) as { success: boolean; data?: MasterRecord; error?: string };

      if (!res.ok || !payload.data) {
        throw new Error(payload.error || "Failed to create record");
      }

      setMasterItems((previous) => {
        const next = [payload.data as MasterRecord, ...previous.filter((item) => item.id !== payload.data?.id)];
        next.sort((left, right) => left.name.localeCompare(right.name));
        return next;
      });
      setNewMasterName("");
      toast.success(`${MASTER_META[activeMasterType].label.slice(0, -1)} saved`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create record";
      toast.error(message);
    } finally {
      setMasterSaving(false);
    }
  };

  const handleDeleteMaster = async (item: MasterRecord) => {
    if (!activeMasterType) {
      return;
    }

    try {
      setMasterDeletingId(item.id);

      const res = await fetch("/api/medicine/masters", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeMasterType,
          id: item.id,
        }),
      });

      const payload = (await res.json()) as { success: boolean; error?: string };

      if (!res.ok) {
        throw new Error(payload.error || "Failed to delete record");
      }

      setMasterItems((previous) => previous.filter((record) => record.id !== item.id));
      toast.success(`${item.name} deleted`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete record";
      toast.error(message);
    } finally {
      setMasterDeletingId(null);
    }
  };

  const filteredMedicines = medicines.filter(
    (m) =>
      m.brand_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.generic_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20">
            <Package size={20} />
          </div>
          Products Management
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          {(Object.keys(MASTER_META) as MasterType[]).map((type) => {
            const meta = MASTER_META[type];
            const Icon = meta.icon;

            return (
              <button
                key={type}
                onClick={() => openMasterManager(type)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
              >
                <Icon size={16} />
                <span>{meta.label}</span>
              </button>
            );
          })}
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md shadow-indigo-200"
          >
            <PlusCircle size={18} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 flex flex-col flex-1 overflow-hidden p-6 gap-6">
        <div className="relative w-full max-w-md">
          <label className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
            <Search size={18} />
          </label>
          <input
            type="text"
            placeholder="Search by product/brand, base/generic name, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex-1 overflow-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-4 px-6 font-semibold text-slate-600 border-b border-slate-200">ID</th>
                <th className="py-4 px-6 font-semibold text-slate-600 border-b border-slate-200">Brand Name</th>
                <th className="py-4 px-6 font-semibold text-slate-600 border-b border-slate-200">Generic Name</th>
                <th className="py-4 px-6 font-semibold text-slate-600 border-b border-slate-200">Category</th>
                <th className="py-4 px-6 font-semibold text-slate-600 border-b border-slate-200 text-center">Stock</th>
                <th className="py-4 px-6 font-semibold text-slate-600 border-b border-slate-200 text-center">Active</th>
                <th className="py-4 px-6 font-semibold text-slate-600 border-b border-slate-200 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading products...
                  </td>
                </tr>
              ) : filteredMedicines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredMedicines.map((medicine) => (
                  <tr key={medicine.medicine_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-6 text-slate-500 text-sm">#{medicine.medicine_id}</td>
                    <td className="py-3 px-6 font-medium text-slate-800">{medicine.brand_name}</td>
                    <td className="py-3 px-6 text-slate-600">{medicine.generic_name}</td>
                    <td className="py-3 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        {medicine.category}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-center text-slate-600 font-mono text-sm">
                      {medicine.stock_quantity || 0}
                    </td>
                    <td className="py-3 px-6 text-center">
                      <span className={`inline-flex items-center justify-center w-3 h-3 rounded-full ${medicine.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} title={medicine.is_active ? 'Active' : 'Inactive'} />
                    </td>
                    <td className="py-3 px-6 text-right">
                      <button
                        onClick={() => handleEdit(medicine)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit Product"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <MedicineForm 
          medicine={editingMedicine} 
          onClose={handleFormClose} 
          onSuccess={handleFormSuccess} 
        />
      )}

      {activeMasterType ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="flex h-[min(760px,calc(100dvh-2rem))] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Master records</p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-900">{MASTER_META[activeMasterType].label}</h3>
                <p className="mt-1 text-sm text-slate-500">Browse existing records and add new ones directly to the database.</p>
              </div>
              <button
                type="button"
                onClick={closeMasterManager}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 border-b border-slate-200 px-6 py-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <div className="relative">
                <label className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <Search size={18} />
                </label>
                <input
                  type="text"
                  value={masterSearch}
                  onChange={(event) => setMasterSearch(event.target.value)}
                  placeholder={`Search ${MASTER_META[activeMasterType].label.toLowerCase()}...`}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
              </div>
              <input
                type="text"
                value={newMasterName}
                onChange={(event) => setNewMasterName(event.target.value)}
                placeholder={`New ${MASTER_META[activeMasterType].label.slice(0, -1).toLowerCase()} name`}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
              <button
                type="button"
                onClick={handleCreateMaster}
                disabled={masterSaving || !newMasterName.trim()}
                className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {masterSaving ? "Saving..." : "Add"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {masterLoading ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-500">
                  Loading {MASTER_META[activeMasterType].label.toLowerCase()}...
                </div>
              ) : masterItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-500">
                  No records found.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {masterItems.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{item.name}</div>
                        <div className="mt-1 text-xs text-slate-500">ID #{item.id}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteMaster(item)}
                        disabled={masterDeletingId === item.id}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-wait disabled:opacity-60"
                        title={`Delete ${item.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
