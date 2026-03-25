import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock, requireAdminOrSuperAdminMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  requireAdminOrSuperAdminMock: vi.fn(),
}));

vi.mock("@/database/db", () => ({
  query: queryMock,
}));

vi.mock("@/src/lib/server/auth", () => ({
  AuthError: class AuthError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  requireAdminOrSuperAdmin: requireAdminOrSuperAdminMock,
}));

vi.mock("@/src/lib/server/systemTimezone", () => ({
  getSystemTimezone: vi.fn(async () => "Asia/Karachi"),
  getUtcDayRangeForTimezone: vi.fn(() => ({
    startUtcIso: "2026-03-24T00:00:00.000Z",
    endUtcIso: "2026-03-25T00:00:00.000Z",
  })),
  getUtcRollingDayRangeForTimezone: vi.fn(() => ({
    startUtcIso: "2026-02-24T00:00:00.000Z",
    endUtcIso: "2026-03-25T00:00:00.000Z",
  })),
  getCurrentDateInTimezone: vi.fn(() => "2026-03-24"),
}));

import { GET } from "@/src/app/api/admin/cashier/kpis/route";

describe("cashier kpis route uses pharmacy_sale truth", () => {
  beforeEach(() => {
    queryMock.mockReset();
    requireAdminOrSuperAdminMock.mockReset();
  });

  it("returns today + last30 metrics from pharmacy_sale with backward-compatible keys", async () => {
    requireAdminOrSuperAdminMock.mockResolvedValue({
      user_code: "SADM001",
      role: "Super Admin",
    });

    queryMock
      .mockResolvedValueOnce({ rows: [{ total: "1500" }] }) // todayCollections
      .mockResolvedValueOnce({ rows: [{ outstanding_due: "300" }] }) // outstanding
      .mockResolvedValueOnce({
        rows: [{ staff_id: 1, cashier_name: "Sara Ahmed", total: "1500" }],
      }) // cashierWise
      .mockResolvedValueOnce({ rows: [{ reversal_count: 1, reversal_amount: "250" }] }) // reversals
      .mockResolvedValueOnce({ rows: [{ open_shifts: 0, today_variance: "0" }] }) // shifts
      .mockResolvedValueOnce({
        rows: [{ day: "2026-03-24", outstanding_due: "300" }],
      }) // aging trend
      .mockResolvedValueOnce({ rows: [{ txn_count: 18, collections: "22000", outstanding: "1200" }] }); // last30

    const response = await GET(new Request("http://localhost/api/admin/cashier/kpis") as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.todayCollections).toBe(1500);
    expect(body.outstandingDue).toBe(300);
    expect(body.last30Collections).toBe(22000);
    expect(body.last30Outstanding).toBe(1200);
    expect(body.last30TxnCount).toBe(18);
    expect(body.cashierWiseTotals[0]).toEqual({
      staffId: 1,
      cashierName: "Sara Ahmed",
      total: 1500,
    });
    expect(body.reversalsToday).toEqual({ count: 1, amount: 250 });

    const sqlText = queryMock.mock.calls.map((c) => String(c[0])).join("\n");
    expect(sqlText).toContain("FROM pharmacy_sale");
    expect(sqlText).toContain("sale_timestamp");
  });
});
