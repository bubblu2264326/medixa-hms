import type { ImgHTMLAttributes } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DoctorLayout from "@/src/app/doctor/layout";
import NewPrescriptionForm from "@/src/features/doctor/pharmacyOrder/prescriptionForm/components/NewPrescriptionForm";
import PreviousPrescriptions from "@/src/features/doctor/pharmacyOrder/previous/components/PreviousPrescriptions";
import { Queue } from "@/src/features/shared/queue/components/Queue";

const {
  mockSearchMedicines,
  mockCreatePrescription,
  mockUsePatient,
  mockUseDoctorWorkspace,
  mockUseQueue,
  mockUsePreviousPrescriptions,
  toast,
} = vi.hoisted(() => ({
  mockSearchMedicines: vi.fn(),
  mockCreatePrescription: vi.fn(),
  mockUsePatient: vi.fn(),
  mockUseDoctorWorkspace: vi.fn(),
  mockUseQueue: vi.fn(),
  mockUsePreviousPrescriptions: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ""} />,
}));

vi.mock("@/src/components/session/SessionControls", () => ({
  SessionControls: () => <div>Session Controls</div>,
}));

vi.mock("react-hot-toast", () => ({
  default: toast,
}));

vi.mock("@/contexts/PatientIdContext", async () => {
  const actual = await vi.importActual<typeof import("@/contexts/PatientIdContext")>(
    "@/contexts/PatientIdContext"
  );

  return {
    ...actual,
    usePatient: () => mockUsePatient(),
  };
});

vi.mock("@/src/features/doctor/workspace/DoctorWorkspaceContext", async () => {
  const actual = await vi.importActual<
    typeof import("@/src/features/doctor/workspace/DoctorWorkspaceContext")
  >("@/src/features/doctor/workspace/DoctorWorkspaceContext");

  return {
    ...actual,
    useDoctorWorkspace: () => mockUseDoctorWorkspace(),
    useOptionalDoctorWorkspace: () => mockUseDoctorWorkspace(),
  };
});

vi.mock("@/src/features/shared/queue/hooks/useQueue", () => ({
  useQueue: (...args: unknown[]) => mockUseQueue(...args),
}));

vi.mock("@/src/features/doctor/pharmacyOrder/prescriptionForm/api", () => ({
  searchMedicines: (...args: unknown[]) => mockSearchMedicines(...args),
  createPrescription: (...args: unknown[]) => mockCreatePrescription(...args),
  fetchCategories: vi.fn(),
  fetchMedicinesByCategory: vi.fn(),
}));

vi.mock("@/src/features/doctor/pharmacyOrder/previous/hooks/usePreviousPrescriptions", () => ({
  usePreviousPrescriptions: () => mockUsePreviousPrescriptions(),
}));

describe("doctor medicines workspace", () => {
  beforeEach(() => {
    mockUsePatient.mockReturnValue({
      patientId: "1",
      selectedVisitId: "47",
      setPatientId: vi.fn(),
      setSelectedVisitId: vi.fn(),
      setPatientVisit: vi.fn(),
      clearSelection: vi.fn(),
    });
    mockUseDoctorWorkspace.mockReturnValue({
      isQueueCollapsed: false,
      toggleQueueCollapsed: vi.fn(),
      setQueueCollapsed: vi.fn(),
      staleVisitSelection: null,
      setStaleVisitSelection: vi.fn(),
      clearStaleVisitSelection: vi.fn(),
      selectedVisitStatus: "waiting",
      setSelectedVisitStatus: vi.fn(),
    });
    mockUseQueue.mockReturnValue({
      allQueue: [],
      queue: [],
      loading: false,
      selectedQueue: "ALL",
      setSelectedQueue: vi.fn(),
      filterByName: vi.fn(),
      deleteVisit: vi.fn(),
      allowDelete: false,
    });
    mockUsePreviousPrescriptions.mockReturnValue({
      prescriptions: [],
      loading: false,
      error: null,
    });
    mockSearchMedicines.mockResolvedValue([]);
    mockCreatePrescription.mockResolvedValue({ ok: true });
    toast.success.mockReset();
    toast.error.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          patient_name: "Alice Johnson",
          gender: "Female",
          age: 29,
        }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("renders a minimal collapsed queue rail with only the open control", () => {
    mockUseDoctorWorkspace.mockReturnValue({
      isQueueCollapsed: true,
      toggleQueueCollapsed: vi.fn(),
      setQueueCollapsed: vi.fn(),
      staleVisitSelection: null,
      setStaleVisitSelection: vi.fn(),
      clearStaleVisitSelection: vi.fn(),
      selectedVisitStatus: "waiting",
      setSelectedVisitStatus: vi.fn(),
    });
    mockUseQueue.mockReturnValue({
      allQueue: [
        {
          patient_id: "1",
          visit_id: "47",
          patient_name: "Alice Johnson",
          clinic_number: "2",
          doctor_name: "Ahmed Khan",
          visit_type: "OPD",
        },
      ],
      queue: [
        {
          patient_id: "1",
          visit_id: "47",
          patient_name: "Alice Johnson",
          clinic_number: "2",
          doctor_name: "Ahmed Khan",
          visit_type: "OPD",
        },
      ],
      loading: false,
      selectedQueue: "ALL",
      setSelectedQueue: vi.fn(),
      filterByName: vi.fn(),
      deleteVisit: vi.fn(),
      allowDelete: false,
    });

    render(<Queue endpoint="/api/doctor/queue" allowDelete={false} title="My Queue" />);

    expect(screen.getByRole("button", { name: "Open queue" })).toBeTruthy();
    expect(screen.queryByText(/waiting/i)).toBeNull();
    expect(screen.queryByText(/active/i)).toBeNull();
    expect(screen.queryByText("Alice Johnson")).toBeNull();
  });

  it("renders compact patient context with age in the doctor shell", async () => {
    render(
      <DoctorLayout
        queue={<div>Queue Slot</div>}
        patientDetails={<div>Patient Details</div>}
        pharmacyOrder={<div>Pharmacy Order</div>}
        labOrder={<div>Lab Order</div>}
        pastVisits={<div>Past Visits</div>}
        dashboard={<div>Dashboard</div>}
      />
    );

    expect(screen.queryByText("Fullscreen")).toBeNull();
    expect(await screen.findByText("Alice Johnson")).toBeTruthy();
    expect(screen.getByText("Age 29")).toBeTruthy();
    expect(screen.getByText("ID 1")).toBeTruthy();
    expect(screen.getByText("Visit #47")).toBeTruthy();
  });

  it("searches medicines with keyboard enter, adds a row, and submits the unchanged API payload", async () => {
    mockSearchMedicines.mockResolvedValue([
      {
        medicine_id: "101",
        generic_name: "Paracetamol",
        brand_name: "Panadol",
        category: "Analgesic",
        dosage_value: 500,
        dosage_unit: "mg",
        form: "tablet",
        manufacturer: "GSK",
        stock_quantity: 20,
      },
    ]);

    render(<NewPrescriptionForm />);

    const searchInput = screen.getByPlaceholderText(
      "Search medicines by category, generic, brand, or dosage"
    );

    fireEvent.change(searchInput, {
      target: { value: "pana" },
    });

    await waitFor(() => expect(mockSearchMedicines).toHaveBeenCalledWith("pana"));

    fireEvent.keyDown(searchInput, { key: "Enter" });

    expect((await screen.findAllByText("Panadol")).length).toBeGreaterThan(0);

    fireEvent.change(screen.getAllByDisplayValue("500 mg")[0], {
      target: { value: "650 mg" },
    });
    fireEvent.change(screen.getAllByDisplayValue("Twice daily (BD)")[0], {
      target: { value: "TID" },
    });
    fireEvent.change(screen.getAllByDisplayValue("5")[0], {
      target: { value: "7" },
    });
    fireEvent.change(screen.getAllByDisplayValue("days")[0], {
      target: { value: "weeks" },
    });
    fireEvent.change(screen.getAllByDisplayValue("10")[0], {
      target: { value: "12" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("Notes")[0], {
      target: { value: "Take after meals" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Prescribe" }));

    await waitFor(() =>
      expect(mockCreatePrescription).toHaveBeenCalledWith("1", [
        {
          medicine_id: "101",
          dosage: "650 mg",
          instructions: "Take after meals",
          prescribed_quantity: 12,
          dispensed_quantity: 0,
          frequency: "TID",
          duration: "7 weeks",
          available_quantity: 20,
          availability_status: "available",
          availability_note: null,
        },
      ], "47")
    );
  });

  it("renders the renamed dashboard slot prop", async () => {
    render(
      <DoctorLayout
        queue={<div>Queue Slot</div>}
        patientDetails={<div>Patient Details</div>}
        pharmacyOrder={<div>Pharmacy Order</div>}
        labOrder={<div>Lab Order</div>}
        pastVisits={<div>Past Visits</div>}
        dashboard={<div>Dashboard Slot</div>}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Dashboard" }));

    expect(await screen.findByText("Dashboard Slot")).toBeTruthy();
  });

  it("shows an explicit blocked state when the selected visit is stale", async () => {
    mockUseDoctorWorkspace.mockReturnValue({
      isQueueCollapsed: false,
      toggleQueueCollapsed: vi.fn(),
      setQueueCollapsed: vi.fn(),
      staleVisitSelection: {
        visitId: "47",
        message: "The selected visit is no longer in your queue.",
      },
      setStaleVisitSelection: vi.fn(),
      clearStaleVisitSelection: vi.fn(),
      selectedVisitStatus: null,
      setSelectedVisitStatus: vi.fn(),
    });

    render(<NewPrescriptionForm />);

    expect(screen.getByText("Prescription entry is blocked")).toBeTruthy();
    expect(screen.getByText(/no longer in your queue/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Prescribe" })).toBeNull();
  });

  it("shows inline validation and keeps prescribe disabled until all rows are valid", async () => {
    mockSearchMedicines.mockResolvedValue([
      {
        medicine_id: "101",
        generic_name: "Paracetamol",
        brand_name: "Panadol",
        category: "Analgesic",
        dosage_value: 500,
        dosage_unit: "mg",
        form: "tablet",
      },
    ]);

    render(<NewPrescriptionForm />);

    const searchInput = screen.getByPlaceholderText(
      "Search medicines by category, generic, brand, or dosage"
    );
    fireEvent.change(searchInput, { target: { value: "pana" } });

    await waitFor(() => expect(mockSearchMedicines).toHaveBeenCalledWith("pana"));
    fireEvent.keyDown(searchInput, { key: "Enter" });

    const prescribeButton = await screen.findByRole("button", { name: "Prescribe" });
    expect((prescribeButton as HTMLButtonElement).disabled).toBe(false);

    fireEvent.change(screen.getAllByDisplayValue("500 mg")[0], {
      target: { value: "" },
    });

    expect(screen.getByText("Dose required")).toBeTruthy();
    expect((prescribeButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("clears the draft when the selected patient changes", async () => {
    mockSearchMedicines.mockResolvedValue([
      {
        medicine_id: "101",
        generic_name: "Paracetamol",
        brand_name: "Panadol",
        category: "Analgesic",
        dosage_value: 500,
        dosage_unit: "mg",
        form: "tablet",
      },
    ]);

    const view = render(<NewPrescriptionForm />);

    const searchInput = screen.getByPlaceholderText(
      "Search medicines by category, generic, brand, or dosage"
    );
    fireEvent.change(searchInput, { target: { value: "pana" } });

    await waitFor(() => expect(mockSearchMedicines).toHaveBeenCalledWith("pana"));
    fireEvent.keyDown(searchInput, { key: "Enter" });
    expect((await screen.findAllByText("Panadol")).length).toBeGreaterThan(0);

    mockUsePatient.mockReturnValue({
      patientId: "2",
      selectedVisitId: "99",
      setPatientId: vi.fn(),
      setSelectedVisitId: vi.fn(),
      setPatientVisit: vi.fn(),
      clearSelection: vi.fn(),
    });

    view.rerender(<NewPrescriptionForm />);

    await waitFor(() =>
      expect(screen.getByText("Search and add medicines to begin")).toBeTruthy()
    );
    expect(screen.queryByText("Panadol")).toBeNull();
  });

  it("renders dense prescription table and supports fast lookup", () => {
    mockUsePreviousPrescriptions.mockReturnValue({
      loading: false,
      error: null,
      prescriptions: [
        {
          visit_id: "58",
          visit_timestamp: "2026-03-17 10:10",
          order_date: "2026-03-17",
          category: "Analgesic",
          generic_name: "Paracetamol",
          brand_name: "Panadol",
          dosage: "1 tab",
          instructions: "Take after meals",
          prescribed_quantity: 10,
          dispensed_quantity: 8,
          frequency: "BID",
          duration: "5 days",
          unit: "",
          prescribed_by: "Dr. Ahmed Khan",
          dispensed_by: "",
          form: "tablet",
        },
        {
          visit_id: "57",
          visit_timestamp: "2026-03-12 09:20",
          order_date: "2026-03-12",
          category: "Antibiotic",
          generic_name: "Amoxicillin",
          brand_name: "Amoxil",
          dosage: "500mg",
          instructions: "",
          prescribed_quantity: 14,
          dispensed_quantity: 14,
          frequency: "TID",
          duration: "7 days",
          unit: "",
          prescribed_by: "Dr. Ahmed Khan",
          dispensed_by: "",
          form: "capsule",
        },
      ],
    });

    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    render(<PreviousPrescriptions />);

    expect(screen.getByText("Patient Prescription History")).toBeTruthy();
    expect(screen.queryByText("Panadol • Amoxil")).toBeNull();
    expect(screen.getByText("Take after meals")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "View Full History" }));
    expect(dispatchSpy).toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText("Search medicine, doctor, visit, date..."), {
      target: { value: "amoxil" },
    });

    expect(screen.getByText("Amoxil")).toBeTruthy();
    expect(screen.queryByText("Panadol")).toBeNull();
    expect(screen.getAllByText("Dr. Ahmed Khan").length).toBeGreaterThan(0);
  });
});
