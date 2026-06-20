import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminDashboard from "@/src/app/admin/page";
import toast from "react-hot-toast";

type TrendRange = "7d" | "30d" | "1y" | "5y" | "lifetime";

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

class MockEventSource {
  static instances: MockEventSource[] = [];
  listeners = new Map<string, Array<(event: MessageEvent) => void>>();
  onerror: ((this: EventSource, ev: Event) => any) | null = null;
  url: string;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    const current = this.listeners.get(type) ?? [];
    current.push(listener);
    this.listeners.set(type, current);
  }

  emit(type: string, payload: unknown = {}) {
    const message = { data: JSON.stringify(payload) } as MessageEvent;
    const current = this.listeners.get(type) ?? [];
    for (const listener of current) listener(message);
  }

  close() {}
}

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

function makePayload(range: TrendRange, activitiesCount = 0) {
  return {
    metrics: {
      revenue: 11079.04,
      previousRevenue30d: 2500,
      revenueChangePct30d: 343.16,
      dailyPatients: 5,
      activeStaff: 2,
      totalStaff: 6,
      criticalLowStockCount: 4,
    },
    trendMeta: {
      range,
      bucket: range === "1y" ? "month" : "day",
      points: range === "1y" ? 12 : 7,
    },
    trend:
      range === "1y"
        ? [
            { date: "2026-01-01", day: "Jan", value: 0 },
            { date: "2026-02-01", day: "Feb", value: 265 },
            { date: "2026-03-01", day: "Mar", value: 11079.04 },
          ]
        : [
            { date: "2026-03-17", day: "Mon", value: 0 },
            { date: "2026-03-18", day: "Tue", value: 1250 },
            { date: "2026-03-19", day: "Wed", value: 980 },
            { date: "2026-03-20", day: "Thu", value: 0 },
            { date: "2026-03-21", day: "Fri", value: 3500 },
            { date: "2026-03-22", day: "Sat", value: 1200 },
            { date: "2026-03-23", day: "Sun", value: 4149.04 },
          ],
    activities: Array.from({ length: activitiesCount }).map((_, idx) => ({
      id: idx + 1,
      type: "system",
      status: "info",
      action: `Event ${idx + 1}`,
      staff: "System",
      entityType: null,
      entityId: null,
      time: new Date(Date.now() - idx * 60_000).toISOString(),
    })),
  };
}

function makeAuditRows(count = 1) {
  return Array.from({ length: count }).map((_, idx) => ({
    log_id: `log-${idx + 1}`,
    action: `Attendance check-in marked ${idx + 1}`,
    entity_type: "staff_attendance",
    entity_id: `att-${idx + 1}`,
    created_at: new Date(Date.now() - idx * 60_000).toISOString(),
    staff_name: "Bilal",
  }));
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("AdminDashboard pulse feed + realtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockEventSource.instances = [];
    vi.stubGlobal("EventSource", MockEventSource as unknown as typeof EventSource);
  });

  it("keeps page mounted when range changes", async () => {
    const nextRangeResponse = createDeferred<Response>();

    // The dashboard also fetches /api/public/system-timezone on mount (via
    // useSystemTimezone), so route by URL instead of relying on call order: the
    // initial summary resolves with 30d data, and the range-change summary fetch
    // is deferred to assert the page stays mounted while it is in flight.
    let summaryCalls = 0;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/dashboard/summary")) {
        summaryCalls += 1;
        if (summaryCalls === 1) {
          return Promise.resolve(jsonResponse(makePayload("30d", 3)));
        }
        return nextRangeResponse.promise;
      }
      return Promise.resolve(jsonResponse({}));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AdminDashboard />);

    await screen.findByText("Hospital Overview");
    fireEvent.click(screen.getByRole("button", { name: "1Y" }));

    await waitFor(() => {
      const summaryUrls = fetchMock.mock.calls
        .map((call) => String(call[0]))
        .filter((url) => url.includes("/api/admin/dashboard/summary"));
      expect(summaryUrls.some((url) => url.includes("range=1y"))).toBe(true);
    });

    expect(screen.getByText("Hospital Overview")).toBeTruthy();
    expect(screen.getByText("Pulse Feed")).toBeTruthy();

    nextRangeResponse.resolve(jsonResponse(makePayload("1y", 2)));
    await waitFor(() => {
      expect(screen.getByText("Revenue Trends")).toBeTruthy();
    });
  });

  it("keeps View all logs button pinned and list scrollable", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(makePayload("30d", 25))) as unknown as typeof fetch;

    render(<AdminDashboard />);
    await screen.findByText("Hospital Overview");

    const scrollArea = screen.getByTestId("pulse-feed-scroll");
    expect(scrollArea.className).toContain("overflow-y-auto");

    const viewAllLogsButton = screen.getByRole("button", { name: /view all logs/i });
    expect(viewAllLogsButton.className).toContain("shrink-0");
  });

  it("renders revenue summary and modern trend elements", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(makePayload("30d", 3))) as unknown as typeof fetch;

    render(<AdminDashboard />);
    await screen.findByText("Hospital Overview");

    expect(screen.getByTestId("revenue-summary-total").textContent).toContain("PKR");
    expect(screen.getByTestId("revenue-summary-change").textContent).toContain("%");
    expect(screen.getByTestId("trend-area-fill")).toBeTruthy();
    expect(screen.getByTestId("trend-active-line")).toBeTruthy();
  });

  it("shows tooltip on hover layer and highlights spikes", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(makePayload("30d", 3))) as unknown as typeof fetch;

    render(<AdminDashboard />);
    await screen.findByText("Hospital Overview");

    const hoverLayer = screen.getByTestId("trend-hover-layer");
    fireEvent.mouseMove(hoverLayer, { clientX: 200 });

    await waitFor(() => {
      expect(screen.getByTestId("trend-tooltip")).toBeTruthy();
    });
    expect(screen.getByTestId("trend-tooltip").textContent).toContain("PKR");

    expect(screen.getAllByTestId(/trend-spike-marker-/).length).toBeGreaterThan(0);
  });

  it("subscribes to SSE and updates activities with toast on invalidate", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/dashboard/summary")) {
        return Promise.resolve(jsonResponse(makePayload("30d", 1)));
      }
      if (url.includes("/api/admin/audit-logs?limit=10")) {
        return Promise.resolve(jsonResponse(makeAuditRows(2)));
      }
      return Promise.resolve(jsonResponse({}));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AdminDashboard />);
    await screen.findByText("Hospital Overview");

    const source = MockEventSource.instances[0];
    expect(source).toBeTruthy();
    source.emit("invalidate", { reason: "audit_log_inserted" });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/audit-logs?limit=10",
        expect.objectContaining({ credentials: "include" })
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
  });
});
