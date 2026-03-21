"use client";

import { usePatient } from "@/contexts/PatientIdContext";
import { useOptionalDoctorWorkspace } from "@/src/features/doctor/workspace/DoctorWorkspaceContext";
import { Clock3, PanelLeftOpen, Search, Stethoscope } from "lucide-react";
import { useEffect } from "react";
import { useQueue } from "../hooks/useQueue";

type QueueProps = {
  endpoint?: string;
  allowDelete?: boolean;
  title?: string;
};

export function Queue({
  endpoint = "/api/queue",
  allowDelete = true,
  title = "Patient Queue",
}: QueueProps) {
  const { patientId, selectedVisitId, setPatientVisit } = usePatient();
  const workspace = useOptionalDoctorWorkspace();
  const isQueueCollapsed = workspace?.isQueueCollapsed ?? false;
  const toggleQueueCollapsed = workspace?.toggleQueueCollapsed ?? (() => {});
  const {
    allQueue,
    queue,
    loading,
    selectedQueue,
    setSelectedQueue,
    filterByName,
    deleteVisit,
    allowDelete: deleteEnabled,
    errorMessage,
    isStale,
  } = useQueue(endpoint, allowDelete);
  const safeQueue = Array.isArray(queue) ? queue : [];

  useEffect(() => {
    const normalizedQueue = Array.isArray(allQueue) ? allQueue : [];

    if (!workspace) {
      return;
    }

    if (!selectedVisitId) {
      workspace.clearStaleVisitSelection();
      return;
    }

    if (loading) {
      return;
    }

    const selectedItem = normalizedQueue.find(
      (item) => String(item.visit_id) === String(selectedVisitId)
    );

    if (!selectedItem) {
      workspace.setStaleVisitSelection({
        visitId: String(selectedVisitId),
        message:
          "The selected visit is no longer in your queue. Refresh or choose another queued visit before continuing.",
      });
      return;
    }

    workspace.clearStaleVisitSelection();
  }, [allQueue, loading, selectedVisitId, workspace]);

  if (isQueueCollapsed) {
    return (
      <div className="flex h-full w-full flex-col items-center rounded-[2rem] border border-white/70 bg-white/80 px-2 py-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <button
          type="button"
          onClick={toggleQueueCollapsed}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700"
          aria-label="Open queue"
        >
          <PanelLeftOpen size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-[2rem] border border-white/70 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black tracking-tight text-slate-900">{title}</h2>
            {loading && <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />}
          </div>
        </div>

        <button
          type="button"
          onClick={toggleQueueCollapsed}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700"
        >
          Collapse
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-100 p-1">
        {["ALL", "OPD", "Emergency"].map((type) => (
          <button
            key={type}
            type="button"
            className={`flex-1 rounded-[1rem] px-3 py-2 text-sm font-bold transition ${
              selectedQueue === type
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
            onClick={() => setSelectedQueue(type as "ALL" | "OPD" | "Emergency")}
          >
            {type}
          </button>
        ))}
      </div>

      <label className="relative mt-4 block">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          <Search size={16} />
        </span>
        <input
          type="text"
          className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-500/10"
          placeholder="Search patient, clinic #, patient ID, or visit ID"
          onChange={(event) => filterByName(event.target.value)}
        />
      </label>

      {errorMessage && (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
          {isStale
            ? "Queue refresh failed. Showing the last known queue state."
            : "Queue is temporarily unavailable. Please retry in a moment."}
        </div>
      )}

      <div className="mt-4 flex-1 space-y-3 overflow-auto pr-1">
        {loading && safeQueue.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 text-slate-500">
            <div className="h-8 w-8 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin" />
            <p className="text-sm font-medium">Loading queue...</p>
          </div>
        ) : safeQueue.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 text-slate-500">
            <Clock3 size={24} className="text-slate-300" />
            <p className="text-sm font-medium">Queue is clear</p>
          </div>
        ) : (
          safeQueue.map((item) => {
            const isSelected =
              String(item.patient_id) === String(patientId) &&
              (!selectedVisitId || String(item.visit_id) === String(selectedVisitId));

            return (
              <div
                key={String(item.visit_id)}
                className={`group relative cursor-pointer overflow-hidden rounded-[1.5rem] border px-4 py-4 transition ${
                  isSelected
                    ? "border-emerald-200 bg-emerald-50 shadow-[0_10px_30px_rgba(5,150,105,0.12)]"
                    : "border-slate-200 bg-white hover:border-emerald-100 hover:bg-emerald-50/40"
                }`}
                onClick={() => setPatientVisit(String(item.patient_id), String(item.visit_id))}
              >
                {deleteEnabled && (
                  <button
                    type="button"
                    className="absolute right-3 top-3 opacity-0 transition group-hover:opacity-100 rounded-xl border border-red-100 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-600"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteVisit(item.visit_id);
                    }}
                  >
                    Remove
                  </button>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                          item.visit_type === "Emergency"
                            ? "bg-red-100 text-red-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        #{item.clinic_number}
                      </span>
                      {item.status && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                          {item.status}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 text-base font-black tracking-tight text-slate-900">
                      {item.patient_name}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Stethoscope size={13} />
                        Dr. {item.doctor_name}
                      </span>
                      <span>{item.visit_type}</span>
                      <span>Patient #{item.patient_id}</span>
                      <span>Visit #{item.visit_id}</span>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
                      Active
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
