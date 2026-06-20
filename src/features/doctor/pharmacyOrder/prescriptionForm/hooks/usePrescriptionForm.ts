import { useEffect, useState } from "react";
import { useFieldArray, useForm, UseFormReturn } from "react-hook-form";
import toast from "react-hot-toast";

import { usePatient } from "@/contexts/PatientIdContext";
import { useDoctorWorkspace } from "@/src/features/doctor/workspace/DoctorWorkspaceContext";

import * as api from "../api";
import { AllergyWarning, FormValues, MedicineSearchResult } from "../types";

const EMPTY_SEARCH_RESULTS: MedicineSearchResult[] = [];

function buildDefaultMedicineEntry(medicine: MedicineSearchResult) {
  return {
    medicine_id: medicine.medicine_id,
    generic_name: medicine.generic_name,
    brand_name: medicine.brand_name,
    category: medicine.category,
    form: medicine.form,
    dosage: `${medicine.dosage_value} ${medicine.dosage_unit}`.trim(),
    instructions: "",
    prescribed_quantity: 10,
    dispensed_quantity: 0,
    frequency: "BD" as const,
    duration_value: 5,
    duration_unit: "days" as const,
    available_quantity: medicine.available_quantity ?? medicine.stock_quantity ?? 0,
    availability_status: medicine.availability_status ?? "available",
    availability_note: medicine.availability_note,
  };
}

function isPrescriptionRowValid(item: FormValues["prescriptions"][number]) {
  return Boolean(
    item.medicine_id &&
      item.dosage.trim() &&
      item.frequency &&
      item.duration_value &&
      item.duration_value > 0 &&
      item.duration_unit &&
      Number(item.prescribed_quantity) > 0
  );
}

export function usePrescriptionForm() {
  const { patientId, selectedVisitId } = usePatient();
  const { selectedVisitStatus, staleVisitSelection } = useDoctorWorkspace();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MedicineSearchResult[]>(EMPTY_SEARCH_RESULTS);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allergyWarnings, setAllergyWarnings] = useState<AllergyWarning[]>([]);

  const formMethods: UseFormReturn<FormValues> = useForm<FormValues>({
    defaultValues: {
      prescriptions: [],
    },
  });

  const { control, watch } = formMethods;
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "prescriptions",
  });

  const prescriptions = watch("prescriptions");
  const isDraftValid =
    prescriptions.length > 0 && prescriptions.every((prescription) => isPrescriptionRowValid(prescription));
  const isVisitActionable =
    Boolean(selectedVisitId) &&
    !staleVisitSelection &&
    (!selectedVisitStatus || !["completed", "discharged"].includes(selectedVisitStatus));

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(EMPTY_SEARCH_RESULTS);
      setIsSearching(false);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await api.searchMedicines(searchQuery.trim());
        setSearchResults(results);
      } catch (error) {
        console.error(error);
        toast.error("Failed to search medicines");
        setSearchResults(EMPTY_SEARCH_RESULTS);
      } finally {
        setIsSearching(false);
      }
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    replace([]);
    setSearchQuery("");
    setSearchResults(EMPTY_SEARCH_RESULTS);
    setAllergyWarnings([]);
  }, [patientId, replace]);

  const addMedicine = (medicine: MedicineSearchResult) => {
    const alreadyAdded = prescriptions.some(
      (prescription) => String(prescription.medicine_id) === String(medicine.medicine_id)
    );

    if (alreadyAdded) {
      toast.error("Medicine already added to this prescription");
      return;
    }

    append(buildDefaultMedicineEntry(medicine));
    setSearchQuery("");
    setSearchResults(EMPTY_SEARCH_RESULTS);
  };

  const clearPrescription = () => {
    replace([]);
    setSearchQuery("");
    setSearchResults(EMPTY_SEARCH_RESULTS);
    setAllergyWarnings([]);
  };

  const onSubmit = async (data: FormValues) => {
    if (!patientId || !selectedVisitId || !isVisitActionable) {
      toast.error("Select a patient visit before prescribing");
      return;
    }

    if (data.prescriptions.length === 0) {
      toast.error("Add at least one medicine");
      return;
    }

    setIsSubmitting(true);
    setAllergyWarnings([]);

    try {
      const invalid = data.prescriptions.filter(
        (item) =>
          !item.medicine_id ||
          !item.dosage.trim() ||
          !item.frequency ||
          !item.duration_value ||
          item.duration_value <= 0 ||
          !item.duration_unit ||
          !Number(item.prescribed_quantity)
      );

      if (invalid.length > 0) {
        throw new Error("Complete dosage, frequency, duration, and quantity for each medicine");
      }

      const payload = data.prescriptions.map((item) => ({
        medicine_id: item.medicine_id,
        dosage: item.dosage,
        instructions: item.instructions,
        prescribed_quantity: item.prescribed_quantity,
        dispensed_quantity: item.dispensed_quantity,
        frequency: item.frequency,
        duration: `${item.duration_value} ${item.duration_unit}`.trim(),
        available_quantity: item.available_quantity ?? 0,
        availability_status: item.availability_status ?? 'available',
        availability_note: item.availability_note ?? null,
      }));

      const result = await api.createPrescription(patientId, payload, selectedVisitId);
      if (result.mode === "new_thread") {
        toast.success("New prescription thread created for this encounter.");
      } else {
        toast.success("Prescription updated on existing encounter thread.");
      }
      clearPrescription();
      // Non-blocking: surface any drug-vs-allergy conflicts the API flagged so the
      // doctor sees them after the order is recorded (clearPrescription resets first).
      setAllergyWarnings(result.allergy_warnings ?? []);
      window.dispatchEvent(new Event("refresh-queue"));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to submit prescription";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formMethods,
    fields,
    prescriptions,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    isSubmitting,
    isDraftValid,
    isVisitActionable,
    isPrescriptionRowValid,
    allergyWarnings,
    dismissAllergyWarnings: () => setAllergyWarnings([]),
    addMedicine,
    remove,
    clearPrescription,
    onSubmit,
  };
}
