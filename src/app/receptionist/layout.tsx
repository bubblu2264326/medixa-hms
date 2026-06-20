"use client";
import {
  usePatient,
} from "@/contexts/PatientIdContext";
import { SessionControls } from "@/src/components/session/SessionControls";
import Image from "next/image";
import { fetchPatientInfo } from "@/src/features/reception/queueManagement/api";
import { useEffect, useState } from "react";
import { SharedSearch } from "@/src/components/reception/SharedSearch";
import { ClipboardList, CalendarDays, UserPlus, Thermometer, Stethoscope } from "lucide-react";

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
    <div className="flex flex-col h-screen w-screen bg-background overflow-hidden font-sans">
      {/* Premium Clinic Header - Restored to match Pharmacy Module */}
      <div className="px-6 py-3 border-b border-border bg-card shadow-sm flex items-center justify-between z-50">
        <div className="flex items-center gap-4">
          <div className="relative h-10 w-10 bg-primary/10 rounded-md p-1.5 flex items-center justify-center border border-primary/20">
            <Image src="/logo.png" alt="Clinic Logo" width={28} height={28} />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground leading-none">
              Fouzia Ishaq Clinic
            </h1>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-1">Reception Portal</p>
          </div>
        </div>

        <SessionControls />
      </div>

      {/* Main Content Area */}
      <main className="flex flex-1 overflow-hidden p-4 gap-4 bg-muted/50">
        {/* Left Side: Queue (Fixed width for predictability) */}
        <aside className="w-80 flex flex-col h-full">
          <div className="flex-1 bg-card border border-border rounded-lg shadow-sm overflow-hidden flex flex-col">
            {queue}
          </div>
        </aside>

        {/* Right Side: Tabbed Components */}
        <section className="flex-1 flex flex-col h-full space-y-4 min-w-0">
          <div className="flex items-center justify-between gap-4">
            {/* Dashboard Navigation Tabs */}
            <nav className="flex items-center gap-1 p-1 bg-muted rounded-md w-fit border border-border shrink-0">
              {[
                { id: "queue", label: "Queue", icon: ClipboardList },
                { id: "appointments", label: "Appointments", icon: CalendarDays },
                { id: "patientRegistration", label: "Register", icon: UserPlus },
                { id: "patientVitals", label: "Vitals", icon: Thermometer },
                { id: "clinicalDetails", label: "Clinical", icon: Stethoscope },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-xs font-semibold uppercase tracking-wide transition-all ${
                    selectedTab === tab.id
                      ? "bg-card text-primary shadow-sm border border-border"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-4 w-4" aria-hidden />
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-4 flex-1 justify-end">
              {/* Active Patient Badge */}
              {activePatientData ? (
                <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 border border-primary/20 rounded-md shadow-sm">
                  <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground text-[10px] font-semibold shadow-sm uppercase">
                    {activePatientData.patient_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-foreground truncate tracking-tight">
                      {activePatientData.patient_name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-semibold font-mono tabular-nums text-primary bg-primary/10 px-1.5 py-0.5 rounded-md border border-primary/20">
                        ID: {patientId}
                      </span>
                      <span className="text-[9px] font-semibold text-muted-foreground uppercase">
                        • {activePatientData.gender}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                  <div className="h-12 w-48 flex items-center justify-center bg-muted border border-dashed border-border rounded-md">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">No Active Patient</span>
                  </div>
              )}

              <div className="flex-1 max-w-[480px]">
                <SharedSearch />
              </div>
            </div>
          </div>

          {/* Dynamic Content Window */}
          <div className="flex-1 bg-card border border-border rounded-lg relative overflow-hidden shadow-sm flex flex-col">
            <div className="absolute inset-0 overflow-auto p-4 custom-scrollbar">
              <div className="h-full">
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
