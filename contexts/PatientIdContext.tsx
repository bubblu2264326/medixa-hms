"use client"
import { createContext, useContext, useMemo, useState } from "react";

type PatientContextType = {
    patientId: string | null;
    setPatientId: (id: string | null) => void;
    selectedVisitId: string | null;
    setSelectedVisitId: (id: string | null) => void;
    setPatientVisit: (patientId: string | null, visitId: string | null) => void;
    clearSelection: () => void;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export function PatientContextProvider({ children }: { children: React.ReactNode }) {
    const [patientId, setPatientId] = useState<string | null>("");
    const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);

    const handleSetPatientId = (id: string | null) => {
        if (id !== patientId) {
            setPatientId(id);
            setSelectedVisitId(null);
        }
    };

    const setPatientVisit = (nextPatientId: string | null, nextVisitId: string | null) => {
        setPatientId(nextPatientId);
        setSelectedVisitId(nextVisitId);
    };

    const clearSelection = () => {
        setPatientId(null);
        setSelectedVisitId(null);
    };

    const value = useMemo(
        () => ({
            patientId,
            setPatientId: handleSetPatientId,
            selectedVisitId,
            setSelectedVisitId,
            setPatientVisit,
            clearSelection,
        }),
        [patientId, selectedVisitId]
    );

    return (
        <PatientContext.Provider value={value}>
            {children}
        </PatientContext.Provider>
    )
}

export function usePatient(): PatientContextType {
    const ctx = useContext(PatientContext);
    if (!ctx) {
        throw new Error("usePatient must be used within a patientProvider");
    }
    return ctx;
}
