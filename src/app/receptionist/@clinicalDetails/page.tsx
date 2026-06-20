"use client";

import { usePatient } from "@/contexts/PatientIdContext";
import { useState, useRef, useEffect } from "react";
import Gynaecologist from "./Gynacologist/Gynaecologist";
import { LayoutGrid, ChevronDown, Check, Stethoscope, Baby, UserRound, Droplet, HeartPulse, ClipboardList, Hash } from "lucide-react";

const SPECIALIZATIONS = [
  { id: "gynaecologist", label: "Gynaecologist", icon: Stethoscope },
  { id: "pediatrician", label: "Pediatrician", icon: Baby },
  { id: "general_physician", label: "General Physician", icon: UserRound },
];

const CLINICAL_TABS = [
  { id: "Menstrual History", icon: Droplet, label: "Menstrual" },
  { id: "Current Pregnancy", icon: HeartPulse, label: "Pregnancy" },
  { id: "Obstetric History", icon: ClipboardList, label: "Obstetric" },
  { id: "Para Details", icon: Hash, label: "Para" },
];

export default function ClinicalRecordsLayout() {
  const { patientId } = usePatient();
  const [layoutMode, setLayoutMode] = useState<"tabbed" | "full">("tabbed");
  const [selectedSpecialization, setSelectedSpecialization] = useState(SPECIALIZATIONS[0]);
  const [selectedTab, setSelectedTab] = useState(CLINICAL_TABS[0].id);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      {/* Premium Header Section: Specialization, Tabs, and Layout Toggle */}
      <div className="px-6 py-4 flex items-center justify-between gap-6 border-b border-slate-200/40 bg-white/40 backdrop-blur-md">
        <div className="flex items-center gap-6">
          {/* Custom Specialization Group */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex flex-col gap-0.5">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                Clinical Specialty
              </label>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-52 h-9 px-4 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold flex items-center justify-between shadow-sm transition-all hover:border-emerald-300 hover:shadow-emerald-900/5 group"
              >
                <span className="text-[12px] flex items-center gap-2">
                  <selectedSpecialization.icon className="h-4 w-4" aria-hidden />
                  {selectedSpecialization.label}
                </span>
                <ChevronDown className={`size-3.5 text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 z-[100] p-1.5 animate-in fade-in zoom-in-95 duration-200">
                {SPECIALIZATIONS.map((spec) => (
                  <button
                    key={spec.id}
                    onClick={() => {
                      setSelectedSpecialization(spec);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      selectedSpecialization.id === spec.id
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                       <spec.icon className="h-4 w-4" aria-hidden />
                       {spec.label}
                    </span>
                    {selectedSpecialization.id === spec.id && <Check className="size-4" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Premium Tab Bar (Only show if not in Full Form mode) */}
          {layoutMode === "tabbed" && (
            <div className="mt-4 flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl border border-slate-200/30 shadow-inner">
              {CLINICAL_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${
                    selectedTab === tab.id
                      ? "bg-white text-emerald-700 shadow-sm border border-slate-100 scale-[1.02]"
                      : "text-slate-400 hover:bg-white/40 hover:text-slate-600"
                  }`}
                >
                  <tab.icon className="h-4 w-4" aria-hidden />
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Layout Toggle (4 squares app icon) */}
        <div className="mt-4">
          <button
            onClick={() => setLayoutMode(layoutMode === "tabbed" ? "full" : "tabbed")}
            className={`flex items-center gap-2 px-4 h-9 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border shrink-0 ${
              layoutMode === "full"
                ? "bg-slate-800 text-white border-slate-900 shadow-lg shadow-slate-900/20"
                : "bg-white text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-600 shadow-sm"
            }`}
          >
            <LayoutGrid className="size-3.5" />
            <span>{layoutMode === "tabbed" ? "View All" : "Tabbed View"}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full">
          {patientId ? (
            <div className="h-full">
              <Gynaecologist 
                 patientId={patientId} 
                 layoutMode={layoutMode} 
                 activeTab={selectedTab} 
                 onTabChange={setSelectedTab}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-white/20">
              <div className="w-24 h-24 bg-white/40 backdrop-blur-xl border border-white/50 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-2xl shadow-slate-300/20 transition-all duration-[2000ms]">
                <Stethoscope className="h-10 w-10 text-emerald-600" aria-hidden />
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest leading-none mb-3">No Clinical Selection</h3>
              <p className="text-xs font-black text-slate-400 uppercase tracking-tighter max-w-xs text-center">
                Search for a patient or select a visit from the queue to start documentation
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
