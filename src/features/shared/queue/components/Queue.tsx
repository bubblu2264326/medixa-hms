"use client";

import { usePatient } from "@/contexts/PatientIdContext";
import { useOptionalDoctorWorkspace } from "@/src/features/doctor/workspace/DoctorWorkspaceContext";
import { Clock3, PanelLeftClose, PanelLeftOpen, Search, Stethoscope, Trash2 } from "lucide-react";
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
      <div className="flex h-full w-full flex-col items-center py-3">
        <button
          type="button"
          onClick={toggleQueueCollapsed}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-foreground shadow-sm transition hover:border-primary/30 hover:text-primary active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Open queue"
        >
          <PanelLeftOpen size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
          {loading && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
        </div>

        <button
          type="button"
          onClick={toggleQueueCollapsed}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition hover:border-primary/30 hover:text-primary active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Collapse queue"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-1 rounded-md bg-muted p-1">
        {["ALL", "OPD", "Emergency"].map((type) => (
          <button
            key={type}
            type="button"
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              selectedQueue === type
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setSelectedQueue(type as "ALL" | "OPD" | "Emergency")}
          >
            {type}
          </button>
        ))}
      </div>

      <label className="relative mt-3 block">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
          <Search size={16} />
        </span>
        <input
          type="text"
          className="h-9 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
          placeholder="Search patient, clinic #, patient ID, or visit ID"
          onChange={(event) => filterByName(event.target.value)}
        />
      </label>

      {errorMessage && (
        <div className="mt-3 rounded-md border border-warning/40 bg-warning/15 px-4 py-2.5 text-xs font-medium text-warning-foreground">
          {isStale
            ? "Queue refresh failed. Showing the last known queue state."
            : "Queue is temporarily unavailable. Please retry in a moment."}
        </div>
      )}

      <div className="mt-3 flex-1 min-h-0 overflow-auto pr-1">
        {loading && safeQueue.length === 0 ? (
          <div className="flex h-full min-h-[12rem] w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/50 text-muted-foreground">
            <div className="h-7 w-7 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <p className="text-sm font-medium">Loading queue...</p>
          </div>
        ) : safeQueue.length === 0 ? (
          <div className="flex h-full min-h-[12rem] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/50 text-muted-foreground">
            <Clock3 size={22} className="text-muted-foreground/40" />
            <p className="text-sm font-medium">Queue is clear</p>
          </div>
        ) : (
          <div className="space-y-2">
            {safeQueue.map((item) => {
            const isSelected =
              String(item.patient_id) === String(patientId) &&
              (!selectedVisitId || String(item.visit_id) === String(selectedVisitId));

            return (
              <div
                key={String(item.visit_id)}
                className={`group relative cursor-pointer overflow-hidden rounded-md border px-3 py-3 transition ${
                  isSelected
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-card hover:border-primary/20 hover:bg-accent"
                } ${deleteEnabled ? "pb-10" : ""}`}
                onClick={() => setPatientVisit(String(item.patient_id), String(item.visit_id))}
              >
                {deleteEnabled && (
                  <button
                    type="button"
                    title="Delete patient from queue"
                    aria-label="Delete patient from queue"
                    className="absolute bottom-2.5 right-2.5 inline-flex h-8 w-8 items-center justify-center rounded-md border border-destructive/20 bg-destructive/10 text-destructive opacity-0 transition group-hover:opacity-100 hover:bg-destructive/20"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteVisit(item.visit_id);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold font-mono tabular-nums uppercase tracking-wide ${
                          item.visit_type === "Emergency"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        #{item.clinic_number}
                      </span>
                      {item.status && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {item.status}
                        </span>
                      )}
                      {item.payment_status && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            item.payment_status === "Paid"
                              ? "bg-success/10 text-success"
                              : item.payment_status === "Partial"
                                ? "bg-warning/15 text-warning-foreground"
                                : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {item.payment_status}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-sm font-semibold tracking-tight text-foreground">
                      {item.patient_name}
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Stethoscope size={13} />
                        Dr. {item.doctor_name}
                      </span>
                      <span>{item.visit_type}</span>
                      <span className="font-mono tabular-nums">Patient #{item.patient_id}</span>
                      <span className="font-mono tabular-nums">Visit #{item.visit_id}</span>
                      {typeof item.due_amount === "number" ? (
                        <span className="font-mono tabular-nums">Due: PKR {Math.max(item.due_amount, 0).toFixed(0)}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <span className="rounded-full border border-primary/20 bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
