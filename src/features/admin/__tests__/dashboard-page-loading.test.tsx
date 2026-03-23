import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminDashboard from "@/src/app/admin/page";

type TrendRange = "7d" | "30d" | "1y" | "5y" | "lifetime";

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

function makePayload(range: TrendRange) {
  return {
    metrics: {
      revenue: 11079.04,
      dailyPatients: 5,
      activeStaff: 0,
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
    activities: [],
  };
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

describe("AdminDashboard trend loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps page mounted and only chart section loading on range change", async () => {
    const nextRangeResponse = createDeferred<Response>();

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(makePayload("7d")))
      .mockImplementationOnce(() => nextRangeResponse.promise) as unknown as typeof fetch;

    render(<AdminDashboard />);

    await screen.findByText("Hospital Overview");
    expect(screen.getByText("Revenue Trends")).toBeTruthy();
    expect(screen.getByText("Cash Collected (30d)")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "1Y" }));

    await waitFor(() => {
      expect((global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[1][0]).toContain("range=1y");
    });

    expect(screen.getByText("Hospital Overview")).toBeTruthy();
    expect(screen.getByText("Revenue Trends")).toBeTruthy();
    expect(screen.getByText("Cash Collected (30d)")).toBeTruthy();
    expect(document.querySelectorAll(".animate-spin").length).toBeGreaterThan(0);

    nextRangeResponse.resolve(jsonResponse(makePayload("1y")));

    await waitFor(() => {
      expect(screen.getByText("Last 12 months cash collected")).toBeTruthy();
    });
  });

  it("renders SVG line chart and shows tooltip on point hover", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(makePayload("30d"))) as unknown as typeof fetch;

    render(<AdminDashboard />);

    await screen.findByText("Hospital Overview");
    expect(screen.getByTestId("trend-line-chart")).toBeTruthy();

    const point = await screen.findByTestId("trend-point-1");
    fireEvent.mouseEnter(point);

    await waitFor(() => {
      expect(screen.getByTestId("trend-tooltip")).toBeTruthy();
    });
  });
});
