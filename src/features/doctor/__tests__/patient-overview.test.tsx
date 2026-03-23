import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PatientForm from "@/src/features/doctor/patientDetails/components/PatientForm";

const { mockUsePatientForm, mockUseDoctorWorkspace } = vi.hoisted(() => ({
  mockUsePatientForm: vi.fn(),
  mockUseDoctorWorkspace: vi.fn(),
}));

vi.mock("@/src/features/doctor/patientDetails/hooks/usePatientForm", () => ({
  usePatientForm: () => mockUsePatientForm(),
}));

vi.mock("@/src/features/doctor/workspace/DoctorWorkspaceContext", () => ({
  useDoctorWorkspace: () => mockUseDoctorWorkspace(),
}));

describe("doctor patient overview", () => {
  beforeEach(() => {
    mockUseDoctorWorkspace.mockReturnValue({
      staleVisitSelection: null,
    });
    mockUsePatientForm.mockReturnValue({
      doctor: {
        doctor_id: 1,
        doctor_name: "Dr. Ahmed Khan",
        specialization: "General Medicine",
        user_code: "DR1",
        role: "doctor",
      },
      contextSummary: {
        patient: {
          patient_id: "1",
          patient_name: "Alice Johnson",
          age: 28,
          gender: "Female",
          cnic: "11111-1111111-1",
          contact_number: "03001234567",
          address: "Model Town",
        },
        activeVisit: {
          visit_id: "47",
          patient_id: "1",
          clinic_number: "47",
          doctor_id: "1",
          doctor_name: "Dr. Ahmed Khan",
          visit_type: "Emergency",
          reason: "High fever and cough for 2 days",
          status: "waiting",
          visit_timestamp: "2026-03-18T12:30:00.000Z",
        },
        capabilities: {
          isQueueActive: true,
          canEditPrescriptions: true,
          canEditLabs: true,
          canSoftDeleteVisit: true,
          canAppendPrescription: true,
          shouldCreateNewPrescription: false,
          lockReason: null,
        },
        encounterNote: {
          visit_id: "47",
          patient_id: "1",
          doctor_id: "1",
          reception_complaint: "High fever and cough for 2 days",
          doctor_note: "Hydrate and monitor temperature",
        },
        vitals: {
          visit_id: "47",
          blood_pressure: "120/80",
          heart_rate: "92",
          temperature: "101 F",
          weight: "62 kg",
          height: "165 cm",
          blood_group: "O+",
        },
        womenHealthSummary: {
          obstetricHistory: {
            gravida: 2,
            para: 1,
            abortions: 0,
            edd: "2026-08-01",
            last_menstrual_cycle: "2025-10-25",
          },
          menstrualHistory: {
            cycle_length_days: 28,
            bleeding_days: 5,
            menstrual_regular: "Regular",
          },
          currentPregnancy: {
            gestational_age_weeks: 20,
            complications: "None",
          },
        },
      },
      recentVisits: [
        {
          visit_id: "46",
          patient_id: "1",
          patient_name: "Alice Johnson",
          age: 28,
          gender: "Female",
          clinic_number: "46",
          doctor_name: "Dr. Ahmed Khan",
          status: "seen_by_doctor",
          reason: "Seasonal allergy review",
          visit_type: "OPD",
          visit_timestamp: "2026-03-12T10:00:00.000Z",
        },
      ],
      recentPrescriptions: [
        {
          prescription_id: "11",
          order_date: "2026-03-12",
          category: "Analgesic",
          generic_name: "Paracetamol",
          brand_name: "Panadol",
          dosage: "500 mg",
          form: "Tablet",
          prescribed_quantity: 10,
          dispensed_quantity: 10,
          frequency: "BD",
          duration: "5 days",
          instructions: "Take after meals",
          prescribed_by: "Dr. Ahmed Khan",
          dispensed_by: "Pharmacy",
        },
      ],
      doctorNoteDraft: "Hydrate and monitor temperature",
      setDoctorNoteDraft: vi.fn(),
      isLoading: false,
      isSaving: false,
      error: null,
      saveDoctorNote: vi.fn(),
      markVisitSeen: vi.fn(),
      reopenVisit: vi.fn(),
      cancelVisit: vi.fn(),
      softDeleteVisit: vi.fn(),
    });
  });

  it("renders a clinical overview instead of a demographics form", () => {
    render(<PatientForm />);

    expect(screen.getByText("Patient Context Summary")).toBeTruthy();
    expect(screen.getByText("Identity")).toBeTruthy();
    expect(screen.getByText("Active Visit")).toBeTruthy();
    expect(screen.getByText("Vitals")).toBeTruthy();
    expect(screen.getByText("Women's Health")).toBeTruthy();
    expect(screen.getByText("Recent clinical context")).toBeTruthy();
    expect(screen.queryByText("Patient Name")).toBeNull();
    expect(screen.queryByText("Clinic Number")).toBeNull();
  });

  it("hides women's health when no conditional summary exists", () => {
    mockUsePatientForm.mockReturnValue({
      ...mockUsePatientForm.mock.results[0]?.value,
      contextSummary: {
        ...mockUsePatientForm.mock.results[0]?.value.contextSummary,
        womenHealthSummary: null,
      },
    });

    render(<PatientForm />);

    expect(screen.queryByText("Women's Health")).toBeNull();
  });

  it("hides women's health for male patients even when payload contains summary data", () => {
    const original = mockUsePatientForm();

    mockUsePatientForm.mockReturnValue({
      ...original,
      contextSummary: {
        ...original.contextSummary,
        patient: {
          ...original.contextSummary.patient,
          gender: "Male",
        },
        womenHealthSummary: {
          obstetricHistory: { gravida: 3, para: 2, abortions: 0 },
          menstrualHistory: { cycle_length_days: 28 },
          currentPregnancy: { gestational_age_weeks: 24 },
        },
      },
    });

    render(<PatientForm />);

    expect(screen.queryByText("Women's Health")).toBeNull();
  });

  it("dispatches workspace navigation from quick actions", () => {
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

    render(<PatientForm />);

    fireEvent.click(screen.getByRole("button", { name: "Start Prescription" }));

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "switch-doctor-tab",
        detail: { tab: "pharmacyOrder" },
      })
    );
  });

  it("shows a blocked stale-selection state when the selected visit disappears", () => {
    mockUseDoctorWorkspace.mockReturnValue({
      staleVisitSelection: {
        visitId: "47",
        message: "The selected visit is no longer available for active doctor work.",
      },
    });

    render(<PatientForm />);

    expect(screen.getByText("Selected visit is stale")).toBeTruthy();
    expect(screen.getByText(/no longer available for active doctor work/i)).toBeTruthy();
  });
});
