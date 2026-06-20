"use client";
import { ChangeEvent, KeyboardEvent, useEffect, useRef } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { usePatientForm } from "../hooks/usePatientForm";
import { Input } from "@/src/components/ui/Input";
import { Label } from "@/src/components/ui/Label";
import toast from "react-hot-toast";

export function PatientForm() {
  const {
    searchQuery,
    setSearchQuery,
    age,
    gender,
    setGender,
    visitReason,
    setVisitReason,
    doctor,
    setDoctor,
    visitType,
    setVisitType,
    clinicNo, doctors, patientName,
    searchResults, highlightedIndex, setHighlightedIndex, isExistingVisit, isSearching, isProcessing,
    getPatientInfo, searchByName, addToQueue, updateInfo, resetInfo,
    patientId,
    selectedVisitId,
  } = usePatientForm();

  const formRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const opdButtonRef = useRef<HTMLButtonElement>(null);

  const canSubmit =
    Boolean(patientId) &&
    Boolean(doctor) &&
    Boolean(visitReason?.trim()) &&
    Boolean(visitType) &&
    (!isExistingVisit || Boolean(selectedVisitId)) &&
    !isProcessing;

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (searchResults.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
      } else if (e.key === "Enter" && highlightedIndex >= 0) {
        e.preventDefault();
        getPatientInfo(searchResults[highlightedIndex].patient_id);
      } else if (e.key === "Escape") {
        setHighlightedIndex(-1);
      }
    }

    if (e.key === "Enter" && highlightedIndex === -1) {
      e.preventDefault();
      // If we already have a patient selected and a doctor assigned, submission should be possible from search too
      if (patientId && doctor && visitReason?.trim()) {
        if (isExistingVisit) {
          updateInfo();
        } else {
          addToQueue();
        }
        return;
      }

      if (!searchQuery) return;
      if (/^\d+$/.test(searchQuery)) {
        getPatientInfo(searchQuery);
      } else {
        searchByName(searchQuery);
      }
    }
  };

  /** Arrow Left/Right navigates between form fields, Up/Down reserved for value changes */
  function handleFormKeyDown(e: React.KeyboardEvent) {
    // Visit Type Toggling with Up/Down
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const active = document.activeElement;
      if (active?.classList.contains("tab-button")) {
        e.preventDefault();
        setVisitType((prev) => (prev === "OPD" ? "Emergency" : "OPD"));
        return;
      }
    }

    if (e.key === "Enter") {

      const active = document.activeElement;
      // Allow enter to trigger button clicks normally, but for inputs/selects we want form submission
      if (active && (active.tagName === "INPUT" || active.tagName === "SELECT" || active.classList.contains("tab-button"))) {
        e.preventDefault();
        if (!patientId) {
          toast.error("Please select a patient first");
          return;
        }
        if (!doctor) {
          toast.error("Please assign a doctor");
          return;
        }
        if (!visitReason?.trim()) {
          toast.error("Please enter chief complaint");
          return;
        }

        if (isExistingVisit) {
          updateInfo();
        } else {
          addToQueue();
        }
        return;
      }
    }

    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;

    const active = document.activeElement;
    if (!active) return;

    // For text inputs: only navigate when cursor is at the boundary
    if ((active.tagName === "INPUT" && (active as HTMLInputElement).type !== "number") || active.tagName === "TEXTAREA") {
      const input = active as HTMLInputElement;
      const pos = input.selectionStart ?? 0;
      const len = (input.value || "").length;
      if (e.key === "ArrowLeft" && pos > 0) return;
      if (e.key === "ArrowRight" && pos < len) return;
    }

    const form = formRef.current;
    if (!form) return;

    // Find focusable elements: skip readOnly and disabled
    const focusable = Array.from(
      form.querySelectorAll<HTMLElement>('input:not([type="hidden"]), select, textarea, button.tab-button')
    ).filter((el): el is HTMLElement =>
      el instanceof HTMLElement &&
      !el.hasAttribute("disabled") &&
      !el.hasAttribute("readOnly") &&
      (el.tabIndex >= 0 || (el as any).type !== "hidden")
    );

    const idx = focusable.indexOf(active as HTMLElement);
    if (idx === -1) return;

    e.preventDefault();
    const next = e.key === "ArrowRight"
      ? focusable[(idx + 1) % focusable.length]
      : focusable[(idx - 1 + focusable.length) % focusable.length];

    if (next instanceof HTMLElement) {
      next.focus();
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const container = dropdownRef.current;
      const item = container.children[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  // Auto-focus on Visit Type after patient selection
  useEffect(() => {
    if (patientId && opdButtonRef.current) {
      // Focus the OPD button if search was the trigger
      const active = document.activeElement;
      if (active?.tagName === "INPUT" && (active as HTMLInputElement).placeholder.includes("Ex: 1001")) {
        opdButtonRef.current.focus();
      }
    }
  }, [patientId]);



  return (
    <div className="w-full h-full p-2">
      <div ref={formRef} onKeyDown={handleFormKeyDown} className="max-w-4xl mx-auto bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2.5rem] shadow-2xl shadow-emerald-900/5 p-8">
        <div className="flex items-center justify-between mb-8 px-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Visit Registration</h2>
            <p className="text-sm text-slate-500">Assign a patient to a doctor&apos;s queue</p>
          </div>
          <div className="text-right">
            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md tracking-wider transition-colors ${visitType === "Emergency"
              ? "text-red-600 bg-red-50"
              : "text-emerald-600 bg-emerald-50"
              }`}>
              {visitType === "Emergency" ? "Emergency Code" : "Today's Clinic No"}
            </span>
            <p className={`text-3xl font-black leading-none mt-1 transition-colors ${visitType === "Emergency" ? "text-red-600" : "text-slate-900"
              }`}>
              #{clinicNo || "---"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {isExistingVisit && (
            <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              Existing active visit found. Updates will only affect visit #{selectedVisitId || "---"}.
            </div>
          )}
          {/* Unified Search Field */}
          <div className="md:col-span-2 space-y-1.5 relative">
            <Label className="text-slate-600 font-semibold ml-1">Search Patient (Name or ID)</Label>
            <div className="relative group">
              <Input
                value={searchQuery}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setSearchQuery(e.target.value);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Ex: 1001 or Patient Name..."
                autoComplete="off"
                className="bg-white/70 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 h-14 rounded-2xl transition-all shadow-sm group-hover:bg-white text-lg font-medium pl-12"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Search className="h-5 w-5" aria-hidden />
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-600/60 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 tracking-wider">
                AUTO-SEARCHING
              </div>
              {isSearching && (
                <div className="absolute right-20 top-1/2 -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full" />
                </div>
              )}
            </div>

            {/* Dropdown for search results */}
            {searchResults && searchResults.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-50 left-0 right-0 mt-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl max-h-64 overflow-y-auto overflow-x-hidden ring-1 ring-slate-900/5 py-2 scrollbar-thin scrollbar-thumb-slate-200"
              >
                {searchResults.map((p, idx) => (
                  <button
                    key={p.patient_id}
                    onClick={() => {
                      getPatientInfo(p.patient_id);
                    }}
                    className={`w-full text-left px-4 py-3 transition-colors border-b border-slate-50 last:border-none group flex items-center justify-between ${highlightedIndex === idx ? "bg-emerald-50" : "hover:bg-slate-50"
                      }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-sm">{p.patient_name}</span>
                      <span className="text-[10px] text-slate-500 font-medium">CNIC: {p.cnic || "N/A"} • ID: {p.patient_id}</span>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{p.gender}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">{p.age} Yrs</span>
                      </div>
                      <span
                        className="opacity-0 group-hover:opacity-100 transition-all bg-emerald-600 text-white text-[10px] font-black px-4 py-2 rounded-xl shadow-lg shadow-emerald-900/10 flex items-center gap-2"
                        aria-hidden="true"
                      >
                        ENTER <span>↵</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No results found - Add Patient button */}
            {searchQuery.length >= 2 && !isSearching && searchQuery !== patientName && (!searchResults || searchResults.length === 0) && highlightedIndex === -1 && (
              <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("switch-reception-tab", { detail: { tab: "patientRegistration" } }));
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-emerald-50 rounded-xl border border-emerald-100 group transition-all hover:bg-emerald-600 hover:border-emerald-600"
                >
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-slate-800 group-hover:text-white transition-colors">Patient Not Found</span>
                    <span className="text-[10px] text-slate-500 group-hover:text-emerald-100 transition-colors uppercase tracking-wider font-bold">Register as new patient?</span>
                  </div>
                  <div className="h-8 w-8 bg-white/80 group-hover:bg-white rounded-lg flex items-center justify-center text-emerald-600 shadow-sm transition-all group-active:scale-90">
                    <span className="text-lg font-black">+</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Age & Gender Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-slate-600 font-semibold ml-1">Age</Label>
              <Input
                type="number"
                value={age}
                readOnly
                placeholder="Years"
                autoComplete="off"
                className="bg-slate-50 border-slate-200 text-slate-500 h-12 rounded-2xl transition-all shadow-sm cursor-not-allowed focus:ring-0"
              />
            </div>
            <div className="space-y-1.5 flex flex-col">
              <Label className="text-slate-600 font-semibold ml-1">Gender</Label>
              <select
                disabled
                className="bg-slate-50 border-slate-200 border rounded-2xl h-12 px-4 shadow-sm text-slate-500 text-sm cursor-not-allowed appearance-none"
                value={gender}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setGender(e.target.value)}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          {/* Visit Type */}
          <div className="space-y-1.5 flex flex-col">
            <Label className="text-slate-600 font-semibold ml-1">Visit Type</Label>
            <div className="flex p-1 bg-slate-100 rounded-2xl h-12 items-center gap-1">
              {["OPD", "Emergency"].map((type) => (
                <button
                  key={type}
                  ref={type === "OPD" ? opdButtonRef : null}
                  type="button"
                  onClick={() => setVisitType(type)}
                  className={`flex-1 h-full rounded-xl text-sm font-bold transition-all tab-button outline-none focus:ring-2 focus:ring-emerald-500/40 ${visitType === type
                    ? "bg-white text-emerald-700 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-700 focus:bg-white/50"
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Select Doctor */}
          <div className="space-y-1.5 flex flex-col">
            <Label className="text-slate-600 font-semibold ml-1">Assign Doctor</Label>
            <select
              className="bg-white/70 border-slate-200 border rounded-2xl h-12 px-4 shadow-sm hover:bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
              value={doctor}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setDoctor(e.target.value)}
            >
              <option value="">Select Practitioner</option>
              {doctors.map((d: { doctor_name: string; doctor_id: string }) => (
                <option key={d.doctor_id} value={d.doctor_id}>
                  Dr. {d.doctor_name}
                </option>
              ))}
            </select>
          </div>

          {/* Visit Reason */}
          <div className="space-y-1.5 flex flex-col">
            <Label className="text-slate-600 font-semibold ml-1">Chief Complaint</Label>
            <Input
              value={visitReason}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setVisitReason(e.target.value)}
              placeholder="Reason for visit..."
              autoComplete="off"
              className="bg-white/70 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 h-12 rounded-2xl transition-all shadow-sm hover:bg-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => isExistingVisit ? updateInfo() : addToQueue()}
              className={`h-14 rounded-2xl font-bold text-lg transition-all active:scale-95 shadow-lg disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100`}
            >
              {isProcessing && <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />}
              {isExistingVisit ? "Update Visit" : "Add to Queue"}
            </button>
            <button
              type="button"
              onClick={() => resetInfo()}
              className="h-14 rounded-2xl font-bold text-lg transition-all border-2 border-slate-200 hover:bg-slate-50 text-slate-500"
            >
              Reset Form
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

