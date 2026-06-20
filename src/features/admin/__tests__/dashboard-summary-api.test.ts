import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock, requireAdminOrSuperAdminMock, getAdminInventorySummaryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  requireAdminOrSuperAdminMock: vi.fn(),
  getAdminInventorySummaryMock: vi.fn(),
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

vi.mock("@/src/lib/server/adminInventory", () => ({
  getAdminInventorySummary: getAdminInventorySummaryMock,
}));

import { GET } from "@/src/app/api/admin/dashboard/summary/route";
import { AuthError } from "@/src/lib/server/auth";

type QueryRouterOptions = {
  viewAvailable?: boolean;
  revenue?: string;
  previousRevenue30d?: string;
  dailyPatients?: string;
  activeStaff?: string;
  totalStaff?: string;
  trendRows?: Array<{ bucket_key: string; value: string }>;
  activityRows?: Array<Record<string, unknown>>;
  lifetimeMinDate?: string | null;
};

function installQueryRouter({
  viewAvailable = true,
  revenue = "0",
  previousRevenue30d = "0",
  dailyPatients = "0",
  activeStaff = "0",
  totalStaff = "0",
  trendRows = [],
  activityRows = [],
  lifetimeMinDate = null,
}: QueryRouterOptions = {}) {
  queryMock.mockImplementation(async (sql: unknown) => {
    const text = String(sql);

    if (text.includes("SELECT 1") && text.includes("admin_cash_collected_ledger_v1")) {
      if (!viewAvailable) {
        throw new Error("relation admin_cash_collected_ledger_v1 does not exist");
      }
      return { rows: [{ "?column?": 1 }] };
    }

    if (text.includes("revenue_30d")) {
      return { rows: [{ revenue_30d: revenue, revenue_prev_30d: previousRevenue30d }] };
    }

    if (text.includes("WITH patient_visits AS") && text.includes("staff_summary AS")) {
      return {
        rows: [
          {
            daily_patients: dailyPatients,
            active_staff: activeStaff,
            total_staff: totalStaff,
          },
        ],
      };
    }

    if (
      text.includes("SELECT") &&
      text.includes("AS bucket_key") &&
      text.includes("FROM ledger") &&
      text.includes("ORDER BY bucket_key ASC")
    ) {
      return { rows: trendRows };
    }

    if (text.includes("FROM audit_logs l")) {
      return { rows: activityRows };
    }

    if (text.includes("MIN(collected_at)::date AS min_date")) {
      return { rows: [{ min_date: lifetimeMinDate }] };
    }

    return { rows: [] };
  });
}

describe("admin dashboard summary API", () => {
  // The route derives trend buckets from the real `new Date()`. The fixtures use
  // March 2026 bucket keys, so freeze the clock to that era to keep the
  // trend-bucket assertions deterministic regardless of the real calendar date.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T08:00:00.000Z"));
    queryMock.mockReset();
    requireAdminOrSuperAdminMock.mockReset();
    getAdminInventorySummaryMock.mockReset();
    getAdminInventorySummaryMock.mockResolvedValue({
      totalItems: 10,
      healthyItems: 8,
      lowStockCount: 2,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 403 when role is not authorized", async () => {
    requireAdminOrSuperAdminMock.mockRejectedValue(new AuthError("Forbidden", 403));

    const response = await GET({} as any);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });

  it("returns normalized metrics, trend and activities", async () => {
    requireAdminOrSuperAdminMock.mockResolvedValue({
      user_code: "SADM-1",
      role: "Super Admin",
      name: "Root",
    });

    installQueryRouter({
      revenue: "12345",
      previousRevenue30d: "5000",
      dailyPatients: "9",
      activeStaff: "3",
      totalStaff: "5",
      trendRows: [{ bucket_key: "2026-03-23", value: "5000" }],
      activityRows: [
        {
          log_id: 1,
          action: "Update Setting",
          entity_type: "System",
          entity_id: "theme",
          created_at: "2026-03-23T10:00:00.000Z",
          staff_name: "Management Admin",
        },
      ],
    });

    const response = await GET({} as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.metrics).toEqual({
      revenue: 12345,
      previousRevenue30d: 5000,
      revenueChangePct30d: 146.9,
      dailyPatients: 9,
      activeStaff: 3,
      totalStaff: 5,
      criticalLowStockCount: 2,
    });
    expect(body.trendMeta).toMatchObject({ range: "7d", bucket: "day", points: 7 });
    expect(body.trend).toHaveLength(7);
    expect(body.trend.some((row: any) => Number(row.value) === 5000)).toBe(true);
    expect(body.activities[0]).toMatchObject({
      id: 1,
      type: "system",
      status: "warning",
      staff: "Management Admin",
    });
  });

  it("supports OTC-only pharmacy cash collected revenue", async () => {
    requireAdminOrSuperAdminMock.mockResolvedValue({
      user_code: "SADM-1",
      role: "Super Admin",
      name: "Root",
    });

    installQueryRouter({
      revenue: "8191.04",
      trendRows: [{ bucket_key: "2026-03-23", value: "8191.04" }],
    });

    const response = await GET({} as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.metrics.revenue).toBe(8191.04);
  });

  it("supports cashier-only cash collected revenue", async () => {
    requireAdminOrSuperAdminMock.mockResolvedValue({
      user_code: "SADM-1",
      role: "Super Admin",
      name: "Root",
    });

    installQueryRouter({
      revenue: "2500",
      dailyPatients: "2",
      activeStaff: "1",
      totalStaff: "4",
      trendRows: [{ bucket_key: "2026-03-23", value: "2500" }],
    });

    const response = await GET({} as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.metrics.revenue).toBe(2500);
  });

  it("uses anti-double-count revenue SQL for mixed cashier and pharmacy collections", async () => {
    requireAdminOrSuperAdminMock.mockResolvedValue({
      user_code: "SADM-1",
      role: "Super Admin",
      name: "Root",
    });

    installQueryRouter({
      revenue: "10900",
      dailyPatients: "4",
      activeStaff: "2",
      totalStaff: "6",
      trendRows: [{ bucket_key: "2026-03-23", value: "10900" }],
    });

    const response = await GET({} as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.metrics.revenue).toBe(10900);

    const sql = queryMock.mock.calls.map((call) => String(call[0])).join("\n");
    expect(sql).toContain("admin_cash_collected_ledger_v1");
    expect(sql).toContain("AS revenue_30d");
    expect(sql).toContain("AS revenue_prev_30d");
    expect(sql).toContain("FROM ledger");
  });

  it("falls back to inline ledger SQL when view is unavailable", async () => {
    requireAdminOrSuperAdminMock.mockResolvedValue({
      user_code: "SADM-1",
      role: "Super Admin",
      name: "Root",
    });

    installQueryRouter({
      viewAvailable: false,
      revenue: "10900",
      trendRows: [{ bucket_key: "2026-03-23", value: "10900" }],
    });

    const response = await GET({} as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.metrics.revenue).toBe(10900);

    const sql = queryMock.mock.calls.map((call) => String(call[0])).join("\n");
    expect(sql).toContain("FROM cashier_payment_txn txn");
    expect(sql).toContain("FROM pharmacy_sale sale");
  });

  it("returns zero-safe payload when no collected revenue exists", async () => {
    requireAdminOrSuperAdminMock.mockResolvedValue({
      user_code: "SADM-1",
      role: "Super Admin",
      name: "Root",
    });

    installQueryRouter({
      revenue: "0",
      trendRows: [],
    });
    getAdminInventorySummaryMock.mockResolvedValue({
      totalItems: 0,
      healthyItems: 0,
      lowStockCount: 0,
    });

    const response = await GET({} as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.metrics).toEqual({
      revenue: 0,
      previousRevenue30d: 0,
      revenueChangePct30d: 0,
      dailyPatients: 0,
      activeStaff: 0,
      totalStaff: 0,
      criticalLowStockCount: 0,
    });
    expect(body.trendMeta).toMatchObject({ range: "7d", bucket: "day", points: 7 });
    expect(body.trend).toHaveLength(7);
    expect(body.trend.every((row: any) => Number(row.value) === 0)).toBe(true);
    expect(Array.isArray(body.activities)).toBe(true);
    expect(body.activities.length).toBeGreaterThan(0);
    expect(body.activities[0]).toMatchObject({
      type: "system",
      status: "info",
      staff: "System",
    });
  });

  it("supports 30d range with day buckets", async () => {
    requireAdminOrSuperAdminMock.mockResolvedValue({
      user_code: "SADM-1",
      role: "Super Admin",
      name: "Root",
    });

    installQueryRouter({ revenue: "10", trendRows: [] });

    const response = await GET({ url: "http://localhost/api/admin/dashboard/summary?range=30d" } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.trendMeta).toMatchObject({ range: "30d", bucket: "day", points: 30 });
  });

  it("supports 1y range with month buckets", async () => {
    requireAdminOrSuperAdminMock.mockResolvedValue({
      user_code: "SADM-1",
      role: "Super Admin",
      name: "Root",
    });

    installQueryRouter({ revenue: "10", trendRows: [] });

    const response = await GET({ url: "http://localhost/api/admin/dashboard/summary?range=1y" } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.trendMeta).toMatchObject({ range: "1y", bucket: "month", points: 12 });
    const sql = queryMock.mock.calls.map((call) => String(call[0])).join("\n");
    expect(sql).toContain("to_char(date_trunc('month', collected_at), 'YYYY-MM-DD') AS bucket_key");
  });

  it("supports 5y range with year buckets", async () => {
    requireAdminOrSuperAdminMock.mockResolvedValue({
      user_code: "SADM-1",
      role: "Super Admin",
      name: "Root",
    });

    installQueryRouter({ revenue: "10", trendRows: [] });

    const response = await GET({ url: "http://localhost/api/admin/dashboard/summary?range=5y" } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.trendMeta).toMatchObject({ range: "5y", bucket: "year", points: 5 });
    const sql = queryMock.mock.calls.map((call) => String(call[0])).join("\n");
    expect(sql).toContain("to_char(date_trunc('year', collected_at), 'YYYY-MM-DD') AS bucket_key");
  });

  it("supports lifetime range with year buckets", async () => {
    requireAdminOrSuperAdminMock.mockResolvedValue({
      user_code: "SADM-1",
      role: "Super Admin",
      name: "Root",
    });

    installQueryRouter({
      revenue: "10",
      trendRows: [{ bucket_key: "2026-01-01", value: "11079.04" }],
      lifetimeMinDate: "2022-01-01",
    });

    const response = await GET({ url: "http://localhost/api/admin/dashboard/summary?range=lifetime" } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.trendMeta.range).toBe("lifetime");
    expect(body.trendMeta.bucket).toBe("year");
    expect(body.trendMeta.points).toBeGreaterThanOrEqual(1);
    expect(body.trend.some((row: any) => Number(row.value) === 11079.04)).toBe(true);
    const sql = queryMock.mock.calls.map((call) => String(call[0])).join("\n");
    expect(sql).toContain("MIN(collected_at)::date AS min_date");
    expect(sql).toContain("to_char(date_trunc('year', collected_at), 'YYYY-MM-DD') AS bucket_key");
  });
});
