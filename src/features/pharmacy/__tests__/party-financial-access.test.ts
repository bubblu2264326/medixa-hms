import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock, getAuthenticatedUserMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  getAuthenticatedUserMock: vi.fn(),
}));

vi.mock("@/database/db", () => ({
  default: {
    query: queryMock,
  },
  query: queryMock,
}));

vi.mock("@/src/lib/server/auth", () => ({
  getAuthenticatedUser: getAuthenticatedUserMock,
}));

import { GET as getLedger, POST as postLedger } from "@/src/app/api/pharmacy/ledger/route";
import { GET as getPartyInsights } from "@/src/app/api/pharmacy/party/[id]/insights/route";
import { GET as getPartySupplies } from "@/src/app/api/pharmacy/party/[id]/supplies/route";

describe("party financial access controls", () => {
  beforeEach(() => {
    queryMock.mockReset();
    getAuthenticatedUserMock.mockReset();
  });

  it("blocks pharmacist from ledger read and payment write", async () => {
    getAuthenticatedUserMock.mockResolvedValue({
      user_code: "PH1",
      role: "Pharmacist",
      name: "Pharmacist",
    });

    const ledgerRes = await getLedger({
      url: "http://localhost/api/pharmacy/ledger?party_id=1",
    } as any);
    const ledgerBody = await ledgerRes.json();

    expect(ledgerRes.status).toBe(403);
    expect(ledgerBody.success).toBe(false);

    const paymentRes = await postLedger({
      json: async () => ({ party_id: 1, amount: 100 }),
    } as any);
    expect(paymentRes.status).toBe(403);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("returns non-financial insights for pharmacist", async () => {
    getAuthenticatedUserMock.mockResolvedValue({
      user_code: "PH1",
      role: "Pharmacist",
      name: "Pharmacist",
    });

    queryMock
      .mockResolvedValueOnce({
        rows: [
          {
            purchase_count: 3,
            purchase_amount: "1000",
            last_purchase_date: "2026-03-20T10:00:00.000Z",
            unique_products: 2,
            total_units: 12,
            total_sub_units: 5,
            return_amount: "100",
            paid_amount: "200",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            expired_batches_count: 1,
            expired_stock_units: "4",
            dead_stock_batches: 2,
            dead_stock_units: "10",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            active_products: 2,
            purchased_stock_sub_units: 120,
            sold_stock_sub_units: 60,
            fast_moving_products: [],
            slow_moving_products: [],
          },
        ],
      });

    const response = await getPartyInsights(
      {
        nextUrl: new URL("http://localhost/api/pharmacy/party/1/insights"),
      } as any,
      { params: Promise.resolve({ id: "1" }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.canViewFinancials).toBe(false);
    expect(body.data.financial).toBeNull();
    expect(body.data.operational.purchaseCount).toBe(3);
    expect(body.data.inventoryHealth.deadStockBatches).toBe(2);
    expect(body.data.performance.sellThroughPercent).toBe(50);
  });

  it("returns supplies with paging metadata", async () => {
    getAuthenticatedUserMock.mockResolvedValue({
      user_code: "PH1",
      role: "Pharmacist",
      name: "Pharmacist",
    });

    queryMock
      .mockResolvedValueOnce({ rows: [{ total: "1" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            group_id: "5",
            group_type: "batch",
            batch_id: 5,
            batch_number: "LOT-1",
            batch_code: "BATCH-0001",
            expiry_date: "2026-12-01",
            purchase_id: null,
            invoice_no: null,
            invoice_timestamp: null,
            total_units: 20,
            total_sub_units: 0,
            supply_events: 2,
            children_count: 1,
            children: [],
          },
        ],
      });

    const response = await getPartySupplies(
      {
        nextUrl: new URL(
          "http://localhost/api/pharmacy/party/1/supplies?page=1&pageSize=10"
        ),
      } as any,
      { params: Promise.resolve({ id: "1" }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.total).toBe(1);
    expect(body.data.groupBy).toBe("batch");
    expect(body.data.groups).toHaveLength(1);
  });
});
