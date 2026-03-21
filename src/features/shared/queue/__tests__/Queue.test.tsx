import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { mockUseQueue } = vi.hoisted(() => ({
  mockUseQueue: vi.fn(),
}));

vi.mock("@/contexts/PatientIdContext", () => ({
  usePatient: () => ({
    patientId: null,
    selectedVisitId: null,
    setPatientVisit: vi.fn(),
  }),
}));

vi.mock("@/src/features/doctor/workspace/DoctorWorkspaceContext", () => ({
  useOptionalDoctorWorkspace: () => null,
}));

vi.mock("../hooks/useQueue", () => ({
  useQueue: (...args: unknown[]) => mockUseQueue(...args),
}));

import { Queue } from "../components/Queue";

describe("Queue component", () => {
  it("renders a safe empty state when queue data is malformed", () => {
    mockUseQueue.mockReturnValue({
      allQueue: {} as unknown,
      queue: {} as unknown,
      loading: false,
      selectedQueue: "ALL",
      setSelectedQueue: vi.fn(),
      filterByName: vi.fn(),
      deleteVisit: vi.fn(),
      allowDelete: true,
      errorMessage: "Queue response was not an array",
      isStale: false,
    });

    render(<Queue />);

    expect(screen.getByText("Queue is clear")).toBeTruthy();
    expect(screen.getByText(/queue is temporarily unavailable/i)).toBeTruthy();
  });
});
