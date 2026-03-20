import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock("@/database/db", () => ({
  query: queryMock,
}));

import { GET as searchMedicines } from "@/src/app/api/medicine/search/route";

describe("medicine search route", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("uses aggregated medicine search rows instead of returning raw batch entries", async () => {
    queryMock.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: 1,
          medicine_id: 1,
          generic_name: "Paracetamol",
          brand_name: "Panadol",
          stock_quantity: "127",
          stock_sub_quantity: "9",
          total_stock_quantity: "127",
          total_stock_sub_quantity: "9",
          sub_unit_price: "3.10",
          batch_id: null,
          batch_number: "BCH001",
          expiry_date: "2029-12-29",
          batch_stock_quantity: null,
          batch_stock_sub_quantity: null,
          batch_sale_price: "15.25",
          batch_sale_sub_unit_price: "3.10",
          min_stock_level: "5",
          is_low_stock: false,
          is_out_of_stock: false,
        },
      ],
    });

    const request = {
      nextUrl: new URL("http://localhost:3000/api/medicine/search?query=panadol&type=name"),
    } as any;

    const response = await searchMedicines(request);
    const body = await response.json();
    const sql = String(queryMock.mock.calls[0]?.[0] ?? "");

    expect(response.status).toBe(200);
    expect(sql).toContain("active_batch_totals");
    expect(sql).toContain("fefo_batch");
    expect(sql).not.toContain("SELECT * FROM v_medicine_pos");
    expect(body.data.total).toBe(1);
    expect(body.data.medicines).toHaveLength(1);
    expect(body.data.medicines[0]).toMatchObject({
      id: 1,
      medicine_id: 1,
      brand_name: "Panadol",
      generic_name: "Paracetamol",
      stock_quantity: 127,
      stock_sub_quantity: 9,
      total_stock_quantity: 127,
      total_stock_sub_quantity: 9,
      batch_number: "BCH001",
      batch_sale_price: 15.25,
      batch_id: null,
    });
  });
});
