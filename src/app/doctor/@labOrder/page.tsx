"use client";

import { usePatient } from "@/contexts/PatientIdContext";
import NewLabOrderForm from "@/src/features/doctor/labOrder/orderForm/components/NewLabOrderForm";
import PreviousLabOrders from "@/src/features/doctor/labOrder/previous/components/PreviousLabOrders";

export default function LabOrderPage() {
  const { patientId } = usePatient();

  return (
    <div className="space-y-4">
      <div className="px-1 text-sm text-muted-foreground">
        {patientId
          ? "Review recent lab orders, search tests, then submit from the live order table."
          : "Select a patient from the queue to begin ordering tests."}
      </div>
      <PreviousLabOrders />
      <NewLabOrderForm />
    </div>
  );
}
