"use client";

import { usePatient } from "@/contexts/PatientIdContext";
import NewPrescriptionForm from "@/src/features/doctor/pharmacyOrder/prescriptionForm/components/NewPrescriptionForm";
import PreviousPrescriptions from "@/src/features/doctor/pharmacyOrder/previous/components/PreviousPrescriptions";

export default function PharmacyPage() {
  const { patientId } = usePatient();

  return (
    <div className="space-y-4">
      <div className="px-1 text-sm text-muted-foreground">
        {patientId
          ? "Review recent prescriptions, search medicines, then prescribe from the live order table."
          : "Select a patient from the queue to begin prescribing."}
      </div>
      <PreviousPrescriptions />
      <NewPrescriptionForm />
    </div>
  );
}
