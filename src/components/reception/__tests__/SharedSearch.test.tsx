import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SharedSearch } from "@/src/components/reception/SharedSearch";

const mocks = vi.hoisted(() => {
  const toastFn = vi.fn() as unknown as ReturnType<typeof vi.fn> & {
    success: ReturnType<typeof vi.fn>;
  };
  toastFn.success = vi.fn();

  return {
    setPatientVisit: vi.fn(),
    searchPatients: vi.fn(),
    fetchPatientVisit: vi.fn(),
    toast: toastFn,
  };
});

vi.mock("@/contexts/PatientIdContext", () => ({
  usePatient: () => ({
    setPatientVisit: mocks.setPatientVisit,
  }),
}));

vi.mock("@/src/features/reception/queueManagement/api", () => ({
  searchPatients: (...args: unknown[]) => mocks.searchPatients(...args),
  fetchPatientVisit: (...args: unknown[]) => mocks.fetchPatientVisit(...args),
}));

vi.mock("react-hot-toast", () => ({
  default: mocks.toast,
}));

describe("SharedSearch visit selection sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets patient + visit when active visit exists", async () => {
    mocks.searchPatients.mockResolvedValue([
      { patient_id: "1", patient_name: "Alice Johnson", age: "28", gender: "Female", cnic: "" },
    ]);
    mocks.fetchPatientVisit.mockResolvedValue({ visit_id: 64 });

    render(<SharedSearch />);

    fireEvent.change(screen.getByPlaceholderText(/search by name, id, or cnic/i), {
      target: { value: "Ali" },
    });

    await new Promise((resolve) => setTimeout(resolve, 650));

    fireEvent.click(await screen.findByText("Alice Johnson"));

    await waitFor(() => {
      expect(mocks.fetchPatientVisit).toHaveBeenCalledWith("1");
      expect(mocks.setPatientVisit).toHaveBeenCalledWith("1", "64");
    });

    expect(mocks.toast.success).toHaveBeenCalledWith(
      expect.stringContaining("Visit #64")
    );
  });

  it("keeps patient but clears visit when no active visit exists", async () => {
    mocks.searchPatients.mockResolvedValue([
      { patient_id: "2", patient_name: "No Visit Patient", age: "35", gender: "Male", cnic: "" },
    ]);
    mocks.fetchPatientVisit.mockRejectedValue(new Error("No visit found for today"));

    render(<SharedSearch />);

    fireEvent.change(screen.getByPlaceholderText(/search by name, id, or cnic/i), {
      target: { value: "No" },
    });

    await new Promise((resolve) => setTimeout(resolve, 650));

    fireEvent.click(await screen.findByText("No Visit Patient"));

    await waitFor(() => {
      expect(mocks.fetchPatientVisit).toHaveBeenCalledWith("2");
      expect(mocks.setPatientVisit).toHaveBeenCalledWith("2", null);
    });

    expect(mocks.toast).toHaveBeenCalledWith(
      "Patient selected. No active queued visit found.",
      { icon: "ℹ️" }
    );
  });
});
