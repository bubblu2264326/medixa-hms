// features/reception/appointments/hooks/useAppointments.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  bookAppointment,
  fetchAppointments,
  fetchDoctors,
  searchPatients,
  updateAppointmentStatus,
} from "../api";
import { Appointment, AppointmentStatus, Doctor, PatientHit } from "../types";
import { getTimezoneNowDateInput } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

export function useAppointments() {
  const systemTimezone = useSystemTimezone();

  // Reference data
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // Booking form state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PatientHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientHit | null>(null);
  const [doctorId, setDoctorId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMin, setDurationMin] = useState("15");
  const [reason, setReason] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [clashError, setClashError] = useState<string | null>(null);

  // Day list state
  const [listDate, setListDate] = useState(() => getTimezoneNowDateInput(systemTimezone));
  const [filterDoctorId, setFilterDoctorId] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);

  useEffect(() => {
    fetchDoctors()
      .then(setDoctors)
      .catch(() => toast.error("Could not load doctors"));
  }, []);

  const loadAppointments = useCallback(async () => {
    if (!listDate) return;
    setIsLoadingList(true);
    try {
      const data = await fetchAppointments(listDate, filterDoctorId || undefined);
      setAppointments(data);
    } catch {
      toast.error("Could not load appointments");
    } finally {
      setIsLoadingList(false);
    }
  }, [listDate, filterDoctorId]);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  // Debounced patient search
  useEffect(() => {
    if (selectedPatient && searchQuery === selectedPatient.patient_name) {
      setSearchResults([]);
      return;
    }
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setIsSearching(true);
      try {
        setSearchResults(await searchPatients(searchQuery.trim()));
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [searchQuery, selectedPatient]);

  const selectPatient = useCallback((patient: PatientHit) => {
    setSelectedPatient(patient);
    setSearchQuery(patient.patient_name);
    setSearchResults([]);
  }, []);

  const resetForm = useCallback(() => {
    setSelectedPatient(null);
    setSearchQuery("");
    setSearchResults([]);
    setDoctorId("");
    setScheduledAt("");
    setDurationMin("15");
    setReason("");
    setClashError(null);
  }, []);

  const canBook =
    Boolean(selectedPatient) && Boolean(doctorId) && Boolean(scheduledAt) && !isBooking;

  const book = useCallback(async () => {
    setClashError(null);
    if (!selectedPatient || !doctorId || !scheduledAt) {
      toast.error("Select a patient, doctor, and date/time");
      return;
    }
    setIsBooking(true);
    try {
      const result = await bookAppointment({
        patient_id: selectedPatient.patient_id,
        doctor_id: doctorId,
        scheduled_at: scheduledAt,
        duration_min: durationMin ? Number(durationMin) : undefined,
        reason: reason.trim() || undefined,
      });
      if (result.ok) {
        toast.success("Appointment booked");
        resetForm();
        await loadAppointments();
      } else if (result.status === 409) {
        // Slot clash — surface inline so the user can pick another time.
        setClashError(result.error);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Network error while booking");
    } finally {
      setIsBooking(false);
    }
  }, [selectedPatient, doctorId, scheduledAt, durationMin, reason, resetForm, loadAppointments]);

  const changeStatus = useCallback(
    async (appointmentId: number, status: AppointmentStatus) => {
      const ok = await updateAppointmentStatus(appointmentId, status);
      if (ok) {
        toast.success(`Marked ${status.replace("_", " ")}`);
        await loadAppointments();
      } else {
        toast.error("Could not update appointment");
      }
    },
    [loadAppointments]
  );

  return {
    systemTimezone,
    doctors,
    // booking form
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    selectedPatient,
    selectPatient,
    doctorId,
    setDoctorId,
    scheduledAt,
    setScheduledAt,
    durationMin,
    setDurationMin,
    reason,
    setReason,
    isBooking,
    clashError,
    canBook,
    book,
    resetForm,
    // day list
    listDate,
    setListDate,
    filterDoctorId,
    setFilterDoctorId,
    appointments,
    isLoadingList,
    loadAppointments,
    changeStatus,
  };
}
