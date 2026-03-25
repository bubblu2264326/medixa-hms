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

import { GET } from "@/src/app/api/admin/financials/route";

describe("admin financials aggregation", () => {
  beforeEach(() => {
    queryMock.mockReset();
    requireAdminOrSuperAdminMock.mockReset();
  });

  it("uses created_at for pharmacy purchases and returns extended net metrics", async () => {
    requireAdminOrSuperAdminMock.mockResolvedValue({
      user_code: "SADM001",
      role: "Super Admin",
    });

    queryMock.mockImplementation(async (sql: unknown) => {
      const text = String(sql);
      if (text.includes("FROM bill") && text.includes("GROUP BY payment_status")) {
        return { rows: [{ payment_status: "Paid", total: "100000" }] };
      }
      if (text.includes("FROM bill_item")) {
        return { rows: [{ category: "Consultation", total: "40000" }] };
      }
      if (text.includes("FROM medicine_purchase")) {
        return { rows: [{ total: "5000" }] };
      }
      if (text.includes("FROM payroll_line_item")) {
        return { rows: [{ total: "20000" }] };
      }
      if (text.includes("FROM finance_expense_entry")) {
        return { rows: [{ total: "7000" }] };
      }
      if (text.includes("FROM finance_asset_purchase")) {
        return { rows: [{ total: "3000" }] };
      }
      if (text.includes("TO_CHAR((created_at AT TIME ZONE $3), 'Dy')")) {
        return { rows: [{ day: "Mon", total: "12000", full_date: "2026-03-23" }] };
      }
      return { rows: [] };
    });

    const response = await GET(new Request("http://localhost/api/admin/financials?period=30") as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.scope).toBe("combined");
    expect(body.gross_revenue).toBe(100000);
    expect(body.payroll_expense).toBe(20000);
    expect(body.operational_expense).toBe(7000);
    expect(body.capex).toBe(3000);
    expect(body.expenses).toBe(5000);
    expect(body.total_expense).toBe(35000);
    expect(body.net_operating_profit).toBe(65000);

    const sqlText = queryMock.mock.calls.map((call) => String(call[0])).join("\n");
    expect(sqlText).toContain("FROM medicine_purchase");
    expect(sqlText).toContain("created_at >= $1::timestamptz");
    expect(sqlText).toContain("created_at < $2::timestamptz");
    expect(sqlText).toContain("purchase_date >=");
  });

  it("supports non_pharmacy scope by excluding pharmacy revenue and medicine purchases", async () => {
    requireAdminOrSuperAdminMock.mockResolvedValue({
      user_code: "SADM001",
      role: "Super Admin",
    });

    queryMock.mockImplementation(async (sql: unknown) => {
      const text = String(sql);
      if (text.includes("GROUP BY b.payment_status")) {
        return { rows: [{ payment_status: "Paid", total: "60000" }] };
      }
      if (text.includes("FROM bill_item bi") && text.includes("GROUP BY category")) {
        return { rows: [{ category: "Consultation", total: "60000" }] };
      }
      if (text.includes("FROM medicine_purchase")) {
        return { rows: [{ total: "5000" }] };
      }
      if (text.includes("FROM payroll_line_item")) {
        return { rows: [{ total: "20000" }] };
      }
      if (text.includes("FROM finance_expense_entry")) {
        return { rows: [{ total: "7000" }] };
      }
      if (text.includes("FROM finance_asset_purchase")) {
        return { rows: [{ total: "3000" }] };
      }
      if (text.includes("TO_CHAR((bi.created_at AT TIME ZONE $3), 'Dy')")) {
        return { rows: [{ day: "Mon", total: "9000", full_date: "2026-03-23" }] };
      }
      return { rows: [] };
    });

    const response = await GET(new Request("http://localhost/api/admin/financials?period=30&scope=non_pharmacy") as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.scope).toBe("non_pharmacy");
    expect(body.gross_revenue).toBe(60000);
    expect(body.payroll_expense).toBe(20000);
    expect(body.operational_expense).toBe(7000);
    expect(body.capex).toBe(3000);
    expect(body.expenses).toBe(0);
    expect(body.total_expense).toBe(30000);
    expect(body.net_operating_profit).toBe(30000);

    const sqlText = queryMock.mock.calls.map((call) => String(call[0])).join("\n");
    expect(sqlText).toContain("GROUP BY b.payment_status");
    expect(sqlText).toContain("TO_CHAR((bi.created_at AT TIME ZONE $3), 'Dy')");
    expect(sqlText).toContain("NOT (");
  });
});
