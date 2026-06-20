import { beforeEach, describe, expect, it, vi } from "vitest";

const { connectMock, queryMock, releaseMock } = vi.hoisted(() => ({
  connectMock: vi.fn(),
  queryMock: vi.fn(),
  releaseMock: vi.fn(),
}));

vi.mock("@/database/db", () => ({
  default: {
    connect: connectMock,
  },
}));

// The return route now requires an authenticated user. The stub request below
// has no `cookies`, so mock the auth helper to resolve a valid user and let the
// route exercise its transaction logic.
vi.mock("@/src/lib/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/server/auth")>();
  return {
    ...actual,
    getAuthenticatedUser: vi.fn(async () => ({
      user_code: "STAFF-1",
      role: "Pharmacy",
      name: "Test Staff",
    })),
  };
});

import { POST as returnMedicine } from "@/src/app/api/medicine/returnMedicine/route";

describe("medicine return route", () => {
  beforeEach(() => {
    queryMock.mockReset();
    connectMock.mockReset();
    releaseMock.mockReset();
    connectMock.mockResolvedValue({
      query: queryMock,
      release: releaseMock,
    });
  });

  it("writes live sale_return_detail columns and marks a fully returned sale", async () => {
    queryMock
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [
          {
            pharmacy_sale_detail_id: 17,
            sale_id: 21,
            medicine_id: 5,
            quantity: 2,
            sub_quantity: 0,
            unit_sale_price: "50.00",
            sub_unit_sale_price: "5.00",
            batch_id: null,
            prescription_medicine_id: 99,
            reason_code: "purchased_from_other_store",
            reason_note: "Outside purchase",
            available_quantity_snapshot: 0,
            availability_status: "override_fulfilled",
            sub_units_per_unit: 1,
            sold_total_sub_units: 2,
            returned_total_sub_units: 0,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ return_id: 11 }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ sold_total_sub_units: 2, returned_total_sub_units: 2 }],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const response = await returnMedicine({
      json: async () => ({
        reason: "Patient returned medicine",
        created_by: 1,
        items: [
          {
            sale_id: 21,
            sale_detail_id: 17,
            medicine_id: 5,
            prescription_medicine_id: 99,
            quantity: 2,
            sub_quantity: 0,
            unit_sale_price: 50,
            sub_unit_sale_price: 5,
            batch_id: null,
            reason_code: "purchased_from_other_store",
            reason_note: "Outside purchase",
          },
        ],
      }),
    } as any);

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(queryMock.mock.calls.some((call) => String(call[0]).includes("INSERT INTO sale_return_detail"))).toBe(true);
    expect(queryMock.mock.calls.some((call) => String(call[0]).includes("returned_quantity"))).toBe(true);
    expect(queryMock.mock.calls.some((call) => String(call[0]).includes("UPDATE pharmacy_sale SET status = 'Returned'"))).toBe(true);
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});
