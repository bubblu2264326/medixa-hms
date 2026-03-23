"use client";

import { usePatient } from "@/contexts/PatientIdContext";
import { useDoctorWorkspace } from "@/src/features/doctor/workspace/DoctorWorkspaceContext";
import { ClipboardCheck, Pill, Search, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { usePrescriptionForm } from "../hooks/usePrescriptionForm";
import { DURATION_UNIT_OPTIONS, FREQUENCY_LABELS, FREQUENCY_OPTIONS } from "../types";
import { StaleVisitNotice } from "../../../workspace/StaleVisitNotice";

function getPrescriptionIssues(
  prescription: {
    dosage: string;
    frequency: string;
    duration_value: number | null;
    duration_unit: string;
    prescribed_quantity: number;
  },
  isValid: boolean
) {
  if (isValid) {
    return [];
  }

  const issues: string[] = [];
  if (!prescription.dosage.trim()) issues.push("Dose required");
  if (!prescription.frequency) issues.push("Frequency required");
  if (!prescription.duration_value || prescription.duration_value <= 0) issues.push("Duration required");
  if (!prescription.duration_unit) issues.push("Duration unit required");
  if (!prescription.prescribed_quantity || prescription.prescribed_quantity <= 0) {
    issues.push("Quantity must be greater than 0");
  }
  return issues;
}

function inputTone(isDirty: boolean, hasIssue: boolean) {
  if (hasIssue) {
    return "border-red-200 bg-red-50/50 text-red-800 focus:border-red-300 focus:ring-red-500/10";
  }

  if (!isDirty) {
    return "border-emerald-200 bg-emerald-50/40 text-slate-800 focus:border-emerald-300 focus:ring-emerald-500/10";
  }

  return "border-slate-200 bg-white text-slate-700 focus:border-emerald-300 focus:ring-emerald-500/10";
}

function getAvailabilityBadge(
  status?: "available" | "low_stock" | "out_of_stock" | "insufficient_stock",
  availableQuantity?: number
) {
  switch (status) {
    case "out_of_stock":
      return {
        tone: "bg-rose-100 text-rose-700",
        label: "Out of stock",
        detail: "No pharmacy stock available",
      };
    case "insufficient_stock":
      return {
        tone: "bg-amber-100 text-amber-700",
        label: "Insufficient stock",
        detail: `${availableQuantity ?? 0} in stock`,
      };
    case "low_stock":
      return {
        tone: "bg-amber-100 text-amber-700",
        label: "Low stock",
        detail: `${availableQuantity ?? 0} in stock`,
      };
    default:
      return {
        tone: "bg-emerald-100 text-emerald-700",
        label: "In stock",
        detail: `${availableQuantity ?? 0} available`,
      };
  }
}

export default function NewPrescriptionForm() {
  const { patientId, selectedVisitId } = usePatient();
  const { staleVisitSelection, selectedVisitStatus } = useDoctorWorkspace();
  const {
    formMethods,
    fields,
    prescriptions,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    isSubmitting,
    isDraftValid,
    isVisitActionable,
    isPrescriptionRowValid,
    addMedicine,
    remove,
    clearPrescription,
    onSubmit,
  } = usePrescriptionForm();
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const { dirtyFields, submitCount } = formMethods.formState;

  useEffect(() => {
    setActiveSearchIndex(0);
  }, [searchResults, searchQuery]);

  useEffect(() => {
    function handleSlashFocus(event: KeyboardEvent) {
      if (event.key !== "/") {
        return;
      }

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isEditable =
        target?.isContentEditable ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select";

      if (isEditable) {
        return;
      }

      event.preventDefault();
      searchInputRef.current?.focus();
    }

    window.addEventListener("keydown", handleSlashFocus);
    return () => window.removeEventListener("keydown", handleSlashFocus);
  }, []);

  const addedMedicineIds = useMemo(
    () => new Set(prescriptions.map((item) => String(item.medicine_id))),
    [prescriptions]
  );

  const handleAddMedicine = (index: number) => {
    const medicine = searchResults[index];
    if (!medicine || addedMedicineIds.has(String(medicine.medicine_id))) {
      return;
    }

    addMedicine(medicine);
    setActiveSearchIndex(0);
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchResults.length) {
      if (event.key === "Escape") {
        setSearchQuery("");
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSearchIndex((current) => (current + 1) % searchResults.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSearchIndex((current) => (current - 1 + searchResults.length) % searchResults.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      handleAddMedicine(activeSearchIndex);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setSearchQuery("");
    }
  };

  if (staleVisitSelection) {
    return (
      <StaleVisitNotice
        title="Prescription entry is blocked"
        message={`${staleVisitSelection.message} Choose a current queue visit before prescribing medicines.`}
      />
    );
  }

  if (!patientId || !selectedVisitId) {
    return (
      <section className="rounded-[1.1rem] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <div className="flex min-h-[16rem] flex-col items-center justify-center gap-4 rounded-[1rem] border border-dashed border-slate-200 bg-slate-50/80 px-6 text-center">
          <ShieldAlert size={28} className="text-slate-300" />
          <div>
            <h3 className="text-xl font-black tracking-tight text-slate-900">
              Select a patient before prescribing
            </h3>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Search and add medicines only after a patient visit is selected from the queue.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <form onSubmit={formMethods.handleSubmit(onSubmit)} className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700">
              <Sparkles size={13} className="text-emerald-600" />
              Search And Add Medicines
            </div>
            <div className="text-xs font-semibold text-slate-500">
              {fields.length} {fields.length === 1 ? "medicine" : "medicines"} in draft
            </div>
          </div>

          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <Search size={18} />
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search medicines by category, generic, brand, or dosage"
              aria-label="Search medicines"
              aria-controls="medicine-search-results"
              className="h-12 w-full rounded-[0.9rem] border border-slate-300 bg-white pl-12 pr-20 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
            />
            <div className="absolute inset-y-0 right-0 flex items-center gap-3 pr-4 text-xs font-bold">
              <span className="hidden text-slate-400 md:inline">`/`</span>
              {isSearching && <span className="text-emerald-700">Searching...</span>}
            </div>
          </div>

          {searchQuery.trim() && (
            <div
              id="medicine-search-results"
              className="rounded-[0.9rem] border border-slate-200 bg-white p-1.5 shadow-sm"
              role="listbox"
              aria-label="Medicine search results"
            >
              {searchResults.length > 0 ? (
                <div className="grid gap-1">
                  {searchResults.map((medicine, index) => {
                    const isActive = index === activeSearchIndex;
                    const alreadyAdded = addedMedicineIds.has(String(medicine.medicine_id));
                    const availability = getAvailabilityBadge(medicine.availability_status, medicine.available_quantity);

                    const detailParts = [
                      medicine.generic_name,
                      medicine.form,
                      medicine.category,
                      medicine.manufacturer,
                    ].filter(Boolean);

                    return (
                      <button
                        key={medicine.medicine_id}
                        type="button"
                        onClick={() => handleAddMedicine(index)}
                        disabled={alreadyAdded}
                        role="option"
                        aria-selected={isActive}
                        className={`flex w-full items-start justify-between gap-3 rounded-[0.75rem] border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                          alreadyAdded
                            ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                            : isActive
                              ? "border-emerald-300 bg-emerald-50"
                              : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {medicine.category && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                                {medicine.category}
                              </span>
                            )}
                            {medicine.form && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                                {medicine.form}
                              </span>
                            )}
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${availability.tone}`}>
                              {availability.label}
                            </span>
                          </div>
                          <div className="mt-1 truncate text-sm font-black tracking-tight text-slate-900">
                            {medicine.brand_name}
                          </div>
                          <div className="truncate text-xs text-slate-500">
                            {detailParts.join(" • ")}
                          </div>
                          <div className="mt-1 text-[11px] font-semibold text-slate-500">
                            {availability.detail}
                          </div>
                        </div>

                        <div className="shrink-0 text-right text-xs font-semibold text-slate-500">
                          <div className="font-bold text-slate-700">
                            {medicine.dosage_value} {medicine.dosage_unit}
                          </div>
                          {medicine.price != null && <div className="mt-0.5">Rs {medicine.price}</div>}
                          {alreadyAdded && <div className="mt-0.5 text-slate-400">Added</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : !isSearching ? (
                <div className="px-3 py-4 text-sm text-slate-500">No medicines matched this search.</div>
              ) : null}
            </div>
          )}
        </div>

        {fields.length > 0 ? (
          <div className="overflow-hidden rounded-[0.95rem] border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed border-collapse">
                <thead className="bg-slate-50">
                  <tr className="text-left text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    <th className="w-[28%] px-4 py-2">Medicine</th>
                    <th className="w-[11%] px-2 py-2">Dose</th>
                    <th className="w-[10%] px-2 py-2">Freq</th>
                    <th className="w-[18%] px-2 py-2">Duration</th>
                    <th className="w-[7%] px-2 py-2">Qty</th>
                    <th className="w-[18%] px-2 py-2">Notes</th>
                    <th className="w-[8%] px-2 py-2 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {fields.map((field, index) => {
                    const current = prescriptions[index];
                    const isRowValid = isPrescriptionRowValid(current);
                    const issues = getPrescriptionIssues(current, isRowValid);
                    const dirtyRow = dirtyFields.prescriptions?.[index];
                    const quantityAvailabilityStatus =
                      (current.available_quantity ?? 0) <= 0
                        ? "out_of_stock"
                        : (current.prescribed_quantity ?? 0) > (current.available_quantity ?? 0)
                          ? "insufficient_stock"
                          : current.availability_status === "low_stock"
                            ? "low_stock"
                            : "available";
                    const availability = getAvailabilityBadge(quantityAvailabilityStatus, current.available_quantity);

                    return (
                      <tr
                        key={field.id}
                        className={`border-t border-slate-200 align-top ${
                          !isRowValid && (submitCount > 0 || issues.length > 0) ? "bg-red-50/20" : ""
                        }`}
                      >
                          <td className="px-4 py-2">
                            <div className="min-w-0">
                              <div
                                className="truncate text-[15px] font-black tracking-tight text-slate-900"
                              title={`${current.brand_name} / ${current.generic_name}`}
                            >
                              {current.brand_name}
                            </div>
                            <div className="truncate text-xs text-slate-500">{current.generic_name}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${availability.tone}`}>
                                {availability.label}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-500">
                                {availability.detail}
                              </span>
                            </div>
                            {!isRowValid && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5" role="alert" aria-live="polite">
                                {issues.map((issue) => (
                                  <span
                                    key={issue}
                                    className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700"
                                  >
                                    {issue}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            {...formMethods.register(`prescriptions.${index}.dosage`)}
                            className={`h-9 w-full rounded-lg border px-2.5 text-sm outline-none transition ${inputTone(Boolean(dirtyRow?.dosage), !current.dosage.trim())}`}
                            placeholder="Dose"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            {...formMethods.register(`prescriptions.${index}.frequency`)}
                            className={`h-9 w-full rounded-lg border px-2.5 text-sm outline-none transition ${inputTone(Boolean(dirtyRow?.frequency), !current.frequency)}`}
                          >
                            <option value="">Select</option>
                            {FREQUENCY_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {FREQUENCY_LABELS[option]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              {...formMethods.register(`prescriptions.${index}.duration_value`, {
                                valueAsNumber: true,
                              })}
                              className={`h-9 min-w-0 flex-[0_0_56px] rounded-lg border px-2 text-sm outline-none transition ${inputTone(Boolean(dirtyRow?.duration_value), !current.duration_value || current.duration_value <= 0)}`}
                              placeholder="5"
                            />
                            <select
                              {...formMethods.register(`prescriptions.${index}.duration_unit`)}
                              className={`h-9 min-w-0 flex-1 rounded-lg border px-2 text-sm outline-none transition ${inputTone(Boolean(dirtyRow?.duration_unit), !current.duration_unit)}`}
                            >
                              <option value="">Unit</option>
                              {DURATION_UNIT_OPTIONS.map((unit) => (
                                <option key={unit} value={unit}>
                                  {unit}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={1}
                            {...formMethods.register(`prescriptions.${index}.prescribed_quantity`, {
                              valueAsNumber: true,
                            })}
                            className={`h-9 w-full rounded-lg border px-2.5 text-sm outline-none transition ${inputTone(Boolean(dirtyRow?.prescribed_quantity), !current.prescribed_quantity || current.prescribed_quantity <= 0)}`}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            {...formMethods.register(`prescriptions.${index}.instructions`)}
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-500/10"
                            placeholder="Notes"
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                            aria-label={`Remove medicine row ${index + 1}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[8rem] flex-col items-center justify-center gap-2 rounded-[0.95rem] border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center">
            <Pill size={20} className="text-slate-300" />
            <div>
              <h4 className="text-base font-black tracking-tight text-slate-900">Search and add medicines to begin</h4>
              <p className="mt-1 text-sm text-slate-500">Build the prescription in the grid below.</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-[0.95rem] border border-slate-200 bg-slate-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex items-center gap-2 text-sm text-slate-500">
            <ClipboardCheck size={16} className="text-emerald-600" />
            Every row needs dose, frequency, duration, and quantity before prescribing.
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={clearPrescription}
              disabled={fields.length === 0 || isSubmitting}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isDraftValid || !isVisitActionable}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-600 px-5 text-sm font-black text-white shadow-[0_10px_24px_rgba(5,150,105,0.22)] transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? "Prescribing..." : "Prescribe"}
            </button>
          </div>
        </div>
        {!isVisitActionable && (
          <div className="rounded-[0.95rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This visit is no longer actionable for prescribing. Current status:{" "}
            {selectedVisitStatus ?? "unknown"}.
          </div>
        )}
        {selectedVisitStatus === "medicines_dispensed" && isVisitActionable && (
          <div className="rounded-[0.95rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            Medicines have been dispensed. You can still append/amend prescription orders for this encounter until hard-close.
          </div>
        )}
      </form>
    </section>
  );
}
