"use client";

import { usePatient } from "@/contexts/PatientIdContext";
import { useDoctorWorkspace } from "@/src/features/doctor/workspace/DoctorWorkspaceContext";
import { ClipboardPlus, FlaskConical, Search, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useLabOrderForm } from "../hooks/useLabOrderForm";
import { StaleVisitNotice } from "../../../workspace/StaleVisitNotice";

export default function NewLabOrderForm() {
  const { patientId, selectedVisitId } = usePatient();
  const { staleVisitSelection, selectedVisitStatus } = useDoctorWorkspace();
  const {
    handleSubmit,
    searchQuery,
    setSearchQuery,
    filteredTests,
    fields,
    watchTests,
    addTest,
    remove,
    clearTests,
    isDraftValid,
    isVisitActionable,
    selectedTestIds,
    onSubmit,
    isSubmitting,
  } = useLabOrderForm();
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setActiveSearchIndex(0);
  }, [searchQuery, filteredTests]);

  if (staleVisitSelection) {
    return (
      <StaleVisitNotice
        title="Lab ordering is blocked"
        message={`${staleVisitSelection.message} Choose a current queue visit before ordering lab tests.`}
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
              Select a patient before ordering tests
            </h3>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Search and add lab tests only after a patient visit is selected from the queue.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const handleAddTest = (index: number) => {
    const test = filteredTests[index];
    if (!test) {
      return;
    }

    addTest(test);
    setActiveSearchIndex(0);
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!filteredTests.length) {
      if (event.key === "Escape") {
        setSearchQuery("");
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSearchIndex((current) => (current + 1) % filteredTests.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSearchIndex((current) => (current - 1 + filteredTests.length) % filteredTests.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      handleAddTest(activeSearchIndex);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setSearchQuery("");
    }
  };

  return (
    <section className="rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700">
              <Sparkles size={13} className="text-sky-600" />
              Search And Add Lab Tests
            </div>
            <div className="text-xs font-semibold text-slate-500">
              {fields.length} {fields.length === 1 ? "test" : "tests"} in draft
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
              placeholder="Search lab tests by name, category, or price"
              aria-label="Search lab tests"
              aria-controls="lab-search-results"
              className="h-12 w-full rounded-[0.9rem] border border-slate-300 bg-white pl-12 pr-16 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10"
            />
          </div>

          {searchQuery.trim() && (
            <div
              id="lab-search-results"
              className="rounded-[0.9rem] border border-slate-200 bg-white p-1.5 shadow-sm"
              role="listbox"
              aria-label="Lab search results"
            >
              {filteredTests.length > 0 ? (
                <div className="grid gap-1">
                  {filteredTests.map((test, index) => {
                    const isActive = index === activeSearchIndex;
                    const alreadyAdded = selectedTestIds.has(String(test.test_id));

                    return (
                      <button
                        key={test.test_id}
                        type="button"
                        onClick={() => handleAddTest(index)}
                        disabled={alreadyAdded}
                        role="option"
                        aria-selected={isActive}
                        className={`flex w-full items-start justify-between gap-3 rounded-[0.75rem] border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                          alreadyAdded
                            ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                            : isActive
                              ? "border-sky-300 bg-sky-50"
                              : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-sky-700">
                              {test.category}
                            </span>
                          </div>
                          <div className="mt-1 truncate text-sm font-black tracking-tight text-slate-900">
                            {test.test_name}
                          </div>
                          <div className="truncate text-xs text-slate-500">Routine lab order</div>
                        </div>

                        <div className="shrink-0 text-right text-xs font-semibold text-slate-500">
                          <div className="font-bold text-slate-700">Rs {test.price}</div>
                          {alreadyAdded && <div className="mt-0.5 text-slate-400">Added</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-3 py-4 text-sm text-slate-500">No lab tests matched this search.</div>
              )}
            </div>
          )}
        </div>

        {fields.length > 0 ? (
          <div className="overflow-hidden rounded-[0.95rem] border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed border-collapse">
                <thead className="bg-slate-50">
                  <tr className="text-left text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    <th className="w-[48%] px-4 py-2">Test</th>
                    <th className="w-[24%] px-2 py-2">Category</th>
                    <th className="w-[18%] px-2 py-2">Price</th>
                    <th className="w-[10%] px-2 py-2 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {watchTests.map((item, index) => (
                    <tr key={fields[index]?.id ?? item.test_id} className="border-t border-slate-200">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                            <FlaskConical size={14} />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-[15px] font-black tracking-tight text-slate-900">
                              {item.test_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-sm text-slate-600">{item.category}</td>
                      <td className="px-2 py-2.5 text-sm font-semibold text-slate-700">Rs {item.price}</td>
                      <td className="px-2 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                          aria-label={`Remove lab row ${index + 1}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[8rem] flex-col items-center justify-center gap-2 rounded-[0.95rem] border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center">
            <FlaskConical size={20} className="text-slate-300" />
            <div>
              <h4 className="text-base font-black tracking-tight text-slate-900">Search and add lab tests to begin</h4>
              <p className="mt-1 text-sm text-slate-500">Build the lab order in the grid below.</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-[0.95rem] border border-slate-200 bg-slate-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex items-center gap-2 text-sm text-slate-500">
            <ClipboardPlus size={16} className="text-sky-600" />
            Submit the selected tests for the currently active patient.
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={clearTests}
              disabled={fields.length === 0 || isSubmitting}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isDraftValid || !isVisitActionable}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-sky-600 px-5 text-sm font-black text-white shadow-[0_10px_24px_rgba(2,132,199,0.22)] transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? "Submitting..." : "Submit Lab Order"}
            </button>
          </div>
        </div>
        {selectedVisitStatus === "medicines_dispensed" && isVisitActionable && (
          <div className="rounded-[0.95rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            Medicines are already dispensed for this encounter. Lab ordering is still actionable.
          </div>
        )}
        {!isVisitActionable && (
          <div className="rounded-[0.95rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This visit is no longer actionable for lab ordering. Current status: {selectedVisitStatus ?? "unknown"}.
          </div>
        )}
      </form>
    </section>
  );
}
