import { beforeEach, describe, expect, it, vi } from "vitest";

const { connectMock, queryMock, releaseMock } = vi.hoisted(() => ({
  connectMock: vi.fn(),
  queryMock: vi.fn(),
  releaseMock: vi.fn(),
}));

vi.mock("@/database/db", () => ({ default: { connect: connectMock } }));
vi.mock("@/src/lib/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/server/auth")>();
  return {
    ...actual,
    getAuthenticatedUser: vi.fn(async () => ({ user_code: "STF002", role: "Pharmacist", name: "Pharm" })),
  };
});
vi.mock("@/src/lib/server/actor", () => ({ resolveActorStaffId: vi.fn(async () => 1) }));

import { POST } from "@/src/app/api/transactions/return/route";

// SQL-aware mock so assertions don't depend on exact call ordering.
function wireQueries() {
  queryMock.mockImplementation(async (sql: string) => {
    const s = String(sql);
    if (s.includes("INSERT INTO pharmacy_sale")) return { rows: [{ sale_id: 55 }] };
    if (s.includes("INSERT INTO sale_return") && s.includes("RETURNING return_id")) {
      return { rows: [{ return_id: 9, return_timestamp: "2026-06-20T00:00:00.000Z" }] };
    }
    return { rows: [] };
  });
}

const saleReturnInsert = () =>
  queryMock.mock.calls.find(
    (c) => String(c[0]).includes("INSERT INTO sale_return") && String(c[0]).includes("refund_amount")
  );

describe("POST /api/transactions/return — records the cash refund (M3)", () => {
  beforeEach(() => {
    queryMock.mockReset();
    connectMock.mockReset();
    releaseMock.mockReset();
    connectMock.mockResolvedValue({ query: queryMock, release: releaseMock });
    wireQueries();
  });

  it("records refund_amount + CASH method for a standalone return", async () => {
    const res = await POST({
      json: async () => ({
        payment: { type: "CASH" },
        items: [
          { medicine: { id: 5, sub_units_per_unit: 10, batch_sale_sub_unit_price: 5 }, quantity: 2, subQuantity: 0, price: 50 },
        ],
      }),
    } as any);
    const body = await res.json();

    expect(body.success).toBe(true);
    // sale_return persisted with the computed refund (2 * 50 = 100) and CASH
    expect(saleReturnInsert()?.[1]).toEqual([55, "Customer return", 1, 100, "CASH"]);
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });

  it("includes sub-unit value and honours the selected tender (CARD)", async () => {
    const res = await POST({
      json: async () => ({
        payment: { type: "CARD" },
        items: [
          { medicine: { id: 5, sub_units_per_unit: 10, batch_sale_sub_unit_price: 5 }, quantity: 1, subQuantity: 4, price: 50 },
        ],
      }),
    } as any);
    const body = await res.json();

    expect(body.success).toBe(true);
    // 1*50 + 4*5 = 70, method CARD
    expect(saleReturnInsert()?.[1]).toEqual([55, "Customer return", 1, 70, "CARD"]);
  });

  it("rejects an empty return with 400 and never opens a transaction", async () => {
    const res = await POST({ json: async () => ({ payment: { type: "CASH" }, items: [] }) } as any);
    expect(res.status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });
});
