import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchQueueMock, deleteVisitMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  fetchQueueMock: vi.fn(),
  deleteVisitMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock("../api", () => ({
  fetchQueue: fetchQueueMock,
  deleteVisit: deleteVisitMock,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

import { useQueue } from "../hooks/useQueue";

type MockQueueItem = {
  patient_id: number;
  visit_id: number;
  patient_name: string;
  clinic_number: string;
  doctor_name: string;
  visit_type: "OPD";
  status: string;
};

function createQueueItem(visitId: number): MockQueueItem {
  return {
    patient_id: visitId,
    visit_id: visitId,
    patient_name: `Patient ${visitId}`,
    clinic_number: String(visitId),
    doctor_name: "Doctor",
    visit_type: "OPD",
    status: "waiting",
  };
}

class MockEventSource {
  static instances: MockEventSource[] = [];

  url: string;
  onerror: ((event: Event) => void) | null = null;
  listeners = new Map<string, Set<(event: MessageEvent) => void>>();
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(event: string, callback: (event: MessageEvent) => void) {
    const callbacks = this.listeners.get(event) ?? new Set();
    callbacks.add(callback);
    this.listeners.set(event, callbacks);
  }

  emit(event: string, payload: unknown = {}) {
    const message = new MessageEvent(event, {
      data: JSON.stringify(payload),
    });

    for (const callback of this.listeners.get(event) ?? []) {
      callback(message);
    }
  }
}

describe("useQueue", () => {
  beforeEach(() => {
    fetchQueueMock.mockReset();
    deleteVisitMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    MockEventSource.instances = [];
    vi.stubGlobal("EventSource", MockEventSource as unknown as typeof EventSource);
  });

  it("preserves the last good queue after a failed refresh", async () => {
    fetchQueueMock.mockResolvedValueOnce([createQueueItem(1)]).mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() => useQueue("/api/queue"));

    await waitFor(() => expect(result.current.allQueue).toHaveLength(1));

    act(() => {
      MockEventSource.instances[0]?.emit("invalidate", { reason: "visit-updated" });
    });

    await waitFor(() => expect(fetchQueueMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.errorMessage).toBe("boom"));

    expect(result.current.allQueue).toHaveLength(1);
    expect(result.current.isStale).toBe(true);
  });

  it("coalesces overlapping refreshes and applies the newest response", async () => {
    let resolveFirst: ((value: MockQueueItem[]) => void) | null = null;

    fetchQueueMock
      .mockImplementationOnce(
        () =>
          new Promise<MockQueueItem[]>((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockResolvedValueOnce([createQueueItem(2)]);

    const { result } = renderHook(() => useQueue("/api/queue"));

    act(() => {
      MockEventSource.instances[0]?.emit("invalidate", { reason: "visit-updated" });
    });

    act(() => {
      resolveFirst?.([createQueueItem(1)]);
    });

    await waitFor(() => expect(fetchQueueMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.allQueue[0]?.visit_id).toBe(2));
  });
});
