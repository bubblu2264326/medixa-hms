// features/patient-registration/hooks/usePatientForm.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useReactToPrint } from "react-to-print";
import { usePatient } from "@/contexts/PatientIdContext";
import {
  fetchDoctors,
  fetchNewClinicNo,
  fetchPatientInfo,
  fetchPatientVisit,
  updateVisitInfo,
  createVisit,
  searchPatients,
} from "../api";
import { Doctor, Patient } from "../types";

const ACTIVE_RECEPTION_VISIT_STATUSES = new Set(["waiting", "dispensing"]);

export function usePatientForm() {
  const { patientId, selectedVisitId, setPatientId, setPatientVisit, setSelectedVisitId } = usePatient();
  const syncedPatientIdRef = useRef<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(""); // Unified search for ID or Name
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [visitReason, setVisitReason] = useState("");
  const [doctor, setDoctor] = useState("");
  const [visitType, setVisitType] = useState("OPD");
  const [clinicNo, setClinicNo] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isExistingVisit, setIsExistingVisit] = useState(false);
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const reactToPrintFn = useReactToPrint({ contentRef, documentTitle: `QueueSlip ${patientId}` });

  // Fetch doctors on mount
  useEffect(() => {
    async function init() {
      const docs = await fetchDoctors();
      setDoctors(docs);
    }
    init();
  }, []);

  // Fetch clinic no when visit type changes
  useEffect(() => {
    if (!visitType) return;
    fetchNewClinicNo(visitType).then(setClinicNo);
  }, [visitType]);

  const getPatientVisitInfo = useCallback(async (id: string) => {
    if (!id) return;
    try {
      const data = await fetchPatientVisit(id);
      const normalizedStatus = String(data?.status ?? "").toLowerCase();
      const isActiveVisit = ACTIVE_RECEPTION_VISIT_STATUSES.has(normalizedStatus);
      if (data && data.clinic_number && isActiveVisit) {
        setVisitReason(data.reason);
        setDoctor(data.doctor_id);
        setVisitType(data.visit_type || "OPD");
        setClinicNo(data.clinic_number);
        setIsExistingVisit(true);
        setSelectedVisitId(String(data.visit_id));
      } else {
        setIsExistingVisit(false);
        setVisitReason("");
        setDoctor("");
        setVisitType("OPD");
        setSelectedVisitId(null);
      }
    } catch {
      setIsExistingVisit(false);
      setVisitReason("");
      setDoctor("");
      setVisitType("OPD");
      setSelectedVisitId(null);
    }
  }, [setSelectedVisitId]);

  const resetInfo = useCallback((full = true) => {
    syncedPatientIdRef.current = null;
    if (full) {
      setPatientId("");
      setSearchQuery("");
    }
    setSelectedVisitId(null);
    setPatientName("");
    setSearchQuery("");
    setAge("");
    setGender("");
    setDoctor("");
    setVisitReason("");
    setVisitType("OPD");
    setIsExistingVisit(false);
    setSearchResults([]);
    setHighlightedIndex(-1);
  }, [setPatientId, setSelectedVisitId]);

  const getPatientInfo = useCallback(async (id: string | number) => {
    if (!id) return;
    const sid = id.toString();
    try {
      const data = await fetchPatientInfo(sid);

      if (data && data.patient_id) {
        syncedPatientIdRef.current = sid;
        setPatientName(data.patient_name || "");
        setAge(data.age != null ? String(data.age) : "");
        setGender(data.gender || "");
        setSearchResults([]); // Clear search after selection
        setHighlightedIndex(-1);

        // Update local and global ID
        const displayName = data.patient_name || sid;
        setSearchQuery(displayName);
        setPatientName(displayName); // Set this so the effect can skip searching this specific name
        const hasExplicitVisitSelectionForPatient =
          sid === patientId && Boolean(selectedVisitId);

        if (!hasExplicitVisitSelectionForPatient && sid !== patientId) {
          setPatientId(sid);
        }

        toast.success("Patient Found");
        await getPatientVisitInfo(sid);
      } else {
        syncedPatientIdRef.current = null;
        toast.error("Patient not found");
        resetInfo(false); // Clear demographic fields but keep ID
      }
    } catch (err) {
      console.error("Fetch Patient Error:", err);
      syncedPatientIdRef.current = null;
      toast.error("Error fetching patient");
      resetInfo(false);
    }
  }, [getPatientVisitInfo, patientId, resetInfo, selectedVisitId, setPatientId]);

  const searchByName = useCallback(async (name: string) => {
    if (name.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const data = await searchPatients(name);
      setSearchResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    setHighlightedIndex(-1);
    if (searchQuery.length < 2 || searchQuery === patientName) {
      setSearchResults([]);
      return;
    }

    const handler = setTimeout(() => {
      searchByName(searchQuery);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery, patientName, searchByName]);


  async function addToQueue(idOverride?: string) {
    const targetId = idOverride || patientId;
    if (!targetId || !visitReason?.trim() || !doctor || !visitType) {
      toast.error(targetId ? "Incomplete form" : "Please select a patient");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await createVisit({
        patient_id: targetId,
        clinic_number: clinicNo,
        reason: visitReason,
        doctor_id: doctor,
        visit_type: visitType,
      });

      if (res.ok) {
        const visit = await res.json();
        setPatientVisit(String(targetId), String(visit.visit_id));
        setIsExistingVisit(true);
        toast.success("Patient added to queue");
        // Dispatch instant UI refresh event
        window.dispatchEvent(new Event("refresh-queue"));
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to add to queue");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error");
    } finally {
      setIsProcessing(false);
    }
  }

  async function updateInfo() {
    setIsProcessing(true);
    try {
      if (!selectedVisitId) {
        toast.error("Select the exact visit before updating");
        return;
      }
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
      if (!visitType) {
        toast.error("Select visit type");
        return;
      }
      const res = await updateVisitInfo({
        visit_id: selectedVisitId,
        clinic_number: clinicNo,
        reason: visitReason,
        doctor_id: doctor,
        visit_type: visitType,
        status: "waiting",
      });
      if (res.ok) {
        toast.success(`Visit #${selectedVisitId} updated`);
        await getPatientVisitInfo(patientId);
      } else {
        toast.error(`Update failed`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error");
    } finally {
      setIsProcessing(false);
    }
  }

  useEffect(() => {
    if (!patientId) {
      syncedPatientIdRef.current = null;
      return;
    }

    if (syncedPatientIdRef.current === patientId) {
      return;
    }

    void getPatientInfo(patientId);
  }, [patientId, getPatientInfo]);

  return {
    searchQuery, setSearchQuery,
    age, setAge,
    gender, setGender,
    visitReason, setVisitReason,
    doctor, setDoctor,
    visitType, setVisitType,
    clinicNo, doctors, patientName,
    searchResults, highlightedIndex, setHighlightedIndex, isExistingVisit, isSearching, isProcessing,
    getPatientInfo, searchByName, addToQueue, updateInfo, resetInfo,
    reactToPrintFn, contentRef,
    patientId, selectedVisitId, setPatientId,
  };
}
