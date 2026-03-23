"use client";

import { PatientContextProvider, usePatient } from "@/contexts/PatientIdContext";
import { SessionControls } from "@/src/components/session/SessionControls";
import { DoctorWorkspaceProvider, useDoctorWorkspace } from "@/src/features/doctor/workspace/DoctorWorkspaceContext";
import {
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  Pill,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type PatientBadge = {
  patient_name: string;
  gender: string | null;
  age: string | number | null;
};

type DoctorTabId =
  | "patientDetails"
  | "pharmacyOrder"
  | "labOrder"
  | "pastVisits"
  | "dashboard";

function DoctorWorkspace({
  queue,
  patientDetails,
  pharmacyOrder,
  labOrder,
  pastVisits,
  dashboard,
}: {
  queue: React.ReactNode;
  patientDetails: React.ReactNode;
  pharmacyOrder: React.ReactNode;
  labOrder: React.ReactNode;
  pastVisits: React.ReactNode;
  dashboard: React.ReactNode;
}) {
  const { patientId, selectedVisitId } = usePatient();
  const { isQueueCollapsed, staleVisitSelection } = useDoctorWorkspace();
  const [selectedTab, setSelectedTab] = useState<DoctorTabId>("patientDetails");
  const [activePatient, setActivePatient] = useState<PatientBadge | null>(null);

  useEffect(() => {
    async function loadActivePatient() {
      if (!patientId) {
        setActivePatient(null);
        return;
      }

      try {
        const res = await fetch(`/api/patient/${patientId}`);
        if (!res.ok) {
          setActivePatient(null);
          return;
        }

        const data = await res.json();
        setActivePatient({
          patient_name: data.patient_name,
          gender: data.gender,
          age: data.age,
        });
      } catch (error) {
        console.error(error);
        setActivePatient(null);
      }
    }

    loadActivePatient();
  }, [patientId]);

  useEffect(() => {
    function handleSwitchTab(event: Event) {
      const customEvent = event as CustomEvent<{ tab?: DoctorTabId }>;
      if (customEvent.detail?.tab) {
        setSelectedTab(customEvent.detail.tab);
      }
    }

    window.addEventListener("switch-doctor-tab", handleSwitchTab);
    return () => window.removeEventListener("switch-doctor-tab", handleSwitchTab);
  }, []);

  const tabs = useMemo(
    () => [
      { id: "patientDetails" as const, label: "Patient", icon: UserRound },
      { id: "pharmacyOrder" as const, label: "Medicines", icon: Pill },
      { id: "labOrder" as const, label: "Labs", icon: FlaskConical },
      { id: "pastVisits" as const, label: "History", icon: ClipboardList },
      { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    ],
    []
  );

  const selectedTabLabel = tabs.find((tab) => tab.id === selectedTab)?.label ?? "Workspace";
  const workspaceSubtitle = staleVisitSelection
    ? staleVisitSelection.message
    : activePatient
      ? "Queue-driven clinical workspace for the selected patient."
      : "Select a patient from the queue to begin clinical work.";

  return (
    <div className="flex min-h-screen w-screen flex-col overflow-hidden bg-[linear-gradient(180deg,#f8fcfb_0%,#eef6f4_48%,#e7f0ef_100%)] text-slate-900">
      <header className="relative z-20 flex h-20 items-center justify-between border-b border-emerald-100/80 bg-white/85 px-6 backdrop-blur-xl xl:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 p-2 shadow-sm">
            <Image src="/logo.png" alt="Clinic Logo" width={32} height={32} className="object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black tracking-tight text-slate-900">
              Dr. Fauzia Ishaq&apos;s Clinic
            </h1>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600">
              Doctor Care Workspace
            </p>
          </div>
        </div>

        <SessionControls />
      </header>

      <main className="flex flex-1 gap-4 overflow-hidden p-4 xl:p-5">
        <aside
          className={`flex h-full min-h-0 min-w-0 items-stretch ${
            isQueueCollapsed
              ? "w-[44px] rounded-[1.25rem] border border-slate-200/80 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
              : "w-[320px] xl:w-[348px]"
          } overflow-hidden transition-[width,background-color,border-color,box-shadow,border-radius] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]`}
        >
          {queue}
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="sticky top-0 z-10 rounded-[1.75rem] border border-white/70 bg-white/88 px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.05)] backdrop-blur-xl">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                      {selectedTabLabel}
                    </span>
                    {selectedVisitId && (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                        Visit #{selectedVisitId}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="truncate text-base font-black tracking-tight text-slate-900">
                      {activePatient?.patient_name ?? "No patient selected"}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-600">ID {patientId ?? "None"}</span>
                    <span className="text-slate-600">{activePatient?.gender ?? "Gender unavailable"}</span>
                    <span className="text-slate-600">
                      Age {activePatient?.age != null && activePatient?.age !== "" ? activePatient.age : "-"}
                    </span>
                  </div>
                </div>
                <p
                  className={`text-xs xl:max-w-sm ${
                    staleVisitSelection ? "font-semibold text-amber-700" : "text-slate-500"
                  }`}
                >
                  {workspaceSubtitle}
                </p>
              </div>

              <nav className="flex min-w-0 flex-wrap items-center gap-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = selectedTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedTab(tab.id)}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                        isActive
                          ? "border border-emerald-200 bg-emerald-600 text-white shadow-lg shadow-emerald-900/10"
                          : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-white hover:text-slate-900"
                      }`}
                    >
                      <Icon size={15} />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 shadow-[0_24px_80px_rgba(15,23,42,0.07)] backdrop-blur-xl">
            <div className="absolute inset-0 overflow-auto p-4 xl:p-5">
              <div className="h-full animate-in fade-in zoom-in-95 duration-300">
                {selectedTab === "patientDetails" && patientDetails}
                {selectedTab === "pharmacyOrder" && pharmacyOrder}
                {selectedTab === "labOrder" && labOrder}
                {selectedTab === "pastVisits" && pastVisits}
                {selectedTab === "dashboard" && dashboard}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function DoctorLayout(props: {
  queue: React.ReactNode;
  patientDetails: React.ReactNode;
  pharmacyOrder: React.ReactNode;
  labOrder: React.ReactNode;
  pastVisits: React.ReactNode;
  dashboard: React.ReactNode;
}) {
  return (
    <PatientContextProvider>
      <DoctorWorkspaceProvider>
        <DoctorWorkspace {...props} />
      </DoctorWorkspaceProvider>
    </PatientContextProvider>
  );
}
