"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { usePatient } from "@/contexts/PatientIdContext";
import { useDoctorWorkspace } from "@/src/features/doctor/workspace/DoctorWorkspaceContext";
import {
  PatientContextSummary,
  DoctorProfile,
  RecentPrescription,
  RecentVisit,
} from "../types";
import * as api from "../api";

export function usePatientForm() {
  const { patientId, selectedVisitId, clearSelection } = usePatient();
  const {
    clearStaleVisitSelection,
    setSelectedVisitStatus,
    setStaleVisitSelection,
  } = useDoctorWorkspace();
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [contextSummary, setContextSummary] = useState<PatientContextSummary | null>(null);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);
  const [recentPrescriptions, setRecentPrescriptions] = useState<RecentPrescription[]>([]);
  const [doctorNoteDraft, setDoctorNoteDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDoctor() {
      try {
        const profile = await api.fetchDoctorProfile();
        setDoctor(profile);
      } catch (err) {
        console.error(err);
      }
    }

    loadDoctor();
  }, []);

  useEffect(() => {
    async function loadPatientContext() {
      if (!patientId || !selectedVisitId) {
        setContextSummary(null);
        setRecentVisits([]);
        setRecentPrescriptions([]);
        setDoctorNoteDraft("");
        setError(null);
        setSelectedVisitStatus(null);
        clearStaleVisitSelection();
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [summary, visits, prescriptions] = await Promise.all([
          api.fetchPatientContextSummary(patientId, selectedVisitId),
          api.fetchPastVisits(patientId).catch(() => []),
          api.fetchPreviousPrescriptions(patientId).catch(() => []),
        ]);

        setContextSummary(summary);
        setRecentVisits(
          visits.filter((item) => item.visit_id !== summary.activeVisit.visit_id).slice(0, 3)
        );
        setRecentPrescriptions(prescriptions.slice(0, 4));
        setDoctorNoteDraft(summary.encounterNote?.doctor_note ?? "");
        setSelectedVisitStatus(summary.activeVisit.status);
        clearStaleVisitSelection();
      } catch (err) {
        console.error(err);
        const message =
          err instanceof Error ? err.message : "Failed to load patient visit";
        setContextSummary(null);
        setRecentVisits([]);
        setRecentPrescriptions([]);
        setDoctorNoteDraft("");
        setError(message);

        if (message.toLowerCase().includes("visit not found")) {
          setSelectedVisitStatus(null);
          setStaleVisitSelection({
            visitId: selectedVisitId,
            message:
              "The selected visit is no longer available for active doctor work. Refresh the queue or choose another visit.",
          });
          return;
        }

        setSelectedVisitStatus(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadPatientContext();
  }, [
    clearStaleVisitSelection,
    patientId,
    selectedVisitId,
    setSelectedVisitStatus,
    setStaleVisitSelection,
  ]);

  async function saveDoctorNote() {
    if (!contextSummary?.activeVisit) return;

    setIsSaving(true);
    try {
      const encounterNote = await api.saveDoctorEncounterNote(
        contextSummary.activeVisit.visit_id,
        doctorNoteDraft
      );

      setContextSummary((current) =>
        current
          ? {
              ...current,
              encounterNote,
            }
          : current
      );
      toast.success("Doctor note updated");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to save doctor note");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateVisitStatus(status: "seen_by_doctor" | "waiting" | "discharged") {
    if (!contextSummary?.activeVisit) return;

    setIsSaving(true);
    try {
      const response = await api.updateVisitStatus(contextSummary.activeVisit.visit_id, status);
      setContextSummary((current) =>
        current
          ? {
              ...current,
              activeVisit: { ...current.activeVisit, ...response.visit },
            }
          : current
      );
      setSelectedVisitStatus(response.visit.status);
      window.dispatchEvent(new Event("refresh-queue"));
      if (status === "seen_by_doctor") {
        toast.success("Encounter marked as seen");
      } else if (status === "waiting") {
        toast.success("Encounter reopened for amendment");
      } else {
        toast.success("Encounter cancelled");
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsSaving(false);
    }
  }

  async function softDeleteVisit() {
    if (!contextSummary?.activeVisit) return;
    if (!contextSummary.capabilities?.canSoftDeleteVisit) {
      toast.error(
        contextSummary.capabilities?.lockReason ||
          "Encounter cannot be deleted in the current state"
      );
      return;
    }

    setIsSaving(true);
    try {
      await api.softDeleteVisit(contextSummary.activeVisit.visit_id);
      toast.success("Encounter soft deleted");
      clearSelection();
      setContextSummary(null);
      setRecentVisits([]);
      setRecentPrescriptions([]);
      setDoctorNoteDraft("");
      setSelectedVisitStatus(null);
      window.dispatchEvent(new Event("refresh-queue"));
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to soft delete encounter");
    } finally {
      setIsSaving(false);
    }
  }

  return {
    doctor,
    contextSummary,
    recentVisits,
    recentPrescriptions,
    doctorNoteDraft,
    setDoctorNoteDraft,
    isLoading,
    isSaving,
    error,
    saveDoctorNote,
    markVisitSeen: () => updateVisitStatus("seen_by_doctor"),
    reopenVisit: () => updateVisitStatus("waiting"),
    cancelVisit: () => updateVisitStatus("discharged"),
    softDeleteVisit,
  };
}
