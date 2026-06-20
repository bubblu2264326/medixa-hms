"use client";
import {
  usePatient,
} from "@/contexts/PatientIdContext";
import { SessionControls } from "@/src/components/session/SessionControls";
import Image from "next/image";
import { fetchPatientInfo } from "@/src/features/reception/queueManagement/api";
import { useEffect, useState } from "react";
import { SharedSearch } from "@/src/components/reception/SharedSearch";

export default function Receptionist({
  queue,
  queueManagement,
  appointments,
  patientRegistration,
  patientVitals,
  clinicalDetails,
  sidebar: _sidebar,
}: {
  queue: React.ReactNode;
  queueManagement: React.ReactNode;
  appointments: React.ReactNode;
  patientRegistration: React.ReactNode;
  patientVitals: React.ReactNode;
  clinicalDetails: React.ReactNode;
  sidebar: React.ReactNode;
}) {
  const [selectedTab, setSelectedTab] = useState("queue");
  const { patientId } = usePatient();
  const [activePatientData, setActivePatientData] = useState<any>(null);

  void _sidebar;

  // Listen for programmatic tab switches
  useEffect(() => {
    const handleSwitchTab = (e: any) => {
      if (e.detail?.tab) {
        setSelectedTab(e.detail.tab);
      }
    };
    window.addEventListener("switch-reception-tab", handleSwitchTab);
    return () => window.removeEventListener("switch-reception-tab", handleSwitchTab);
  }, []);

  // Fetch patient info when ID changes
  useEffect(() => {
    if (patientId) {
      fetchPatientInfo(patientId)
        .then(data => setActivePatientData(data))
        .catch(() => setActivePatientData(null));
    } else {
      setActivePatientData(null);
    }
  }, [patientId]);


  return (
    <div className="flex flex-col h-screen w-screen bg-[#f8fafc] overflow-hidden font-sans">
      {/* Premium Clinic Header - Restored to match Pharmacy Module */}
      <div className="px-6 py-3 border-b border-slate-200/60 bg-white shadow-sm flex items-center justify-between z-50">
        <div className="flex items-center gap-4">
          <div className="relative h-10 w-10 bg-emerald-50 rounded-xl p-1.5 flex items-center justify-center border border-emerald-100/50">
            <Image src="/logo.png" alt="Clinic Logo" width={28} height={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-700 to-teal-800 bg-clip-text text-transparent leading-none">
              Fouzia Ishaq Clinic
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Reception Portal</p>
          </div>
        </div>

        <SessionControls />
      </div>

      {/* Main Content Area */}
      <main className="flex flex-1 overflow-hidden p-4 gap-4 bg-slate-100/50">
        {/* Left Side: Queue (Fixed width for predictability) */}
        <aside className="w-80 flex flex-col h-full animate-in slide-in-from-left-4 duration-500">
          <div className="flex-1 bg-white/40 backdrop-blur-md border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col">
            {queue}
          </div>
        </aside>

        {/* Right Side: Tabbed Components */}
        <section className="flex-1 flex flex-col h-full space-y-4 min-w-0">
          <div className="flex items-center justify-between gap-4">
            {/* Dashboard Navigation Tabs */}
            <nav className="flex items-center gap-1 p-1 bg-slate-200/50 backdrop-blur-sm rounded-2xl w-fit border border-slate-200/50 shrink-0">
              {[
                { id: "queue", label: "Queue", icon: "📋" },
                { id: "appointments", label: "Appointments", icon: "📅" },
                { id: "patientRegistration", label: "Register", icon: "👤" },
                { id: "patientVitals", label: "Vitals", icon: "🌡️" },
                { id: "clinicalDetails", label: "Clinical", icon: "🩺" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    selectedTab === tab.id
                      ? "bg-white text-emerald-700 shadow-sm border border-slate-100"
                      : "text-slate-500 hover:bg-white/50 hover:text-slate-700"
                  }`}
                >
                  <span className="text-sm">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-4 flex-1 justify-end">
              {/* Active Patient Badge */}
              {activePatientData ? (
                <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl animate-in fade-in slide-in-from-right-4 duration-500 shadow-sm">
                  <div className="h-8 w-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white text-[10px] font-black shadow-sm uppercase">
                    {activePatientData.patient_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-black text-emerald-900 truncate uppercase tracking-tight">
                      {activePatientData.patient_name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-100/50 px-1.5 py-0.5 rounded-md border border-emerald-200/30">
                        ID: {patientId}
                      </span>
                      <span className="text-[9px] font-black text-slate-400 uppercase">
                        • {activePatientData.gender}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                  <div className="h-12 w-48 flex items-center justify-center bg-slate-200/30 border border-dashed border-slate-300 rounded-2xl">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Active Patient</span>
                  </div>
              )}

              <div className="flex-1 max-w-[480px]">
                <SharedSearch />
              </div>
            </div>
          </div>

          {/* Dynamic Content Window */}
          <div className="flex-1 bg-white/40 backdrop-blur-sm border border-slate-200 rounded-[2.5rem] relative overflow-hidden shadow-inner flex flex-col">
            <div className="absolute inset-0 overflow-auto p-4 custom-scrollbar">
              <div className="animate-in fade-in zoom-in-95 duration-300 h-full">
                {selectedTab === "queue" && queueManagement}
                {selectedTab === "appointments" && appointments}
                {selectedTab === "patientRegistration" && patientRegistration}
                {selectedTab === "patientVitals" && patientVitals}
                {selectedTab === "clinicalDetails" && clinicalDetails}
              </div>
            </div>
          </div>
        </section>
      </main>

    </div>
  );
}
