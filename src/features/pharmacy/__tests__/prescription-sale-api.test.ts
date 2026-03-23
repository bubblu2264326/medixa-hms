import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock("@/database/db", () => ({
  query: queryMock,
}));

import { GET as getPrescriptionSale } from "@/src/app/api/pharmacy/prescription-sale/route";

describe("pharmacy prescription-sale route", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("marks an item unavailable when total stock across batches is below the pending prescribed quantity", async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [{ visit_id: 58, patient_id: 10, clinic_number: "CL-10", visit_type: "OPD", status: "dispensing", bill_id: 71 }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            prescription_id: 4,
            prescription_medicine_id: 101,
            prescribed_quantity: 3,
            dispensed_quantity: 0,
            frequency: "BID",
            duration: "5 days",
            instructions: "After meal",
            medicine_id: 1,
            generic_name: "Paracetamol",
            brand_name: "Panadol",
            category: "prescription",
            dosage_value: 500,
            dosage_unit: "mg",
            form: "tablet",
            pos_medicine_id: 1,
            price: 15.5,
            sub_unit: "blister",
            sub_units_per_unit: 1,
            allow_sub_unit_sale: false,
            batch_id: 16,
            batch_number: "LOT-00004",
            expiry_date: "2026-12-01",
            batch_stock_quantity: 1,
            batch_stock_sub_quantity: 0,
            batch_sale_price: 15.5,
            batch_sale_sub_unit_price: 0,
            total_stock_quantity: 2,
            total_stock_sub_quantity: 0,
          },
        ],
      });

    const request = {
      nextUrl: new URL("http://localhost/api/pharmacy/prescription-sale?patientId=10&visitId=58"),
    } as any;

    const response = await getPrescriptionSale(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.availableItems).toHaveLength(0);
    expect(body.data.unavailableItems).toHaveLength(1);
    expect(body.data.unavailableItems[0].availabilityStatus).toBe("insufficient_stock");
    expect(body.data.unavailableItems[0].availabilityNote).toContain("required 3 unit(s)");
  });

  it("keeps an item available when aggregate stock is sufficient even if the FEFO batch alone is smaller", async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [{ visit_id: 58, patient_id: 10, clinic_number: "CL-10", visit_type: "OPD", status: "dispensing", bill_id: 71 }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            prescription_id: 4,
            prescription_medicine_id: 101,
            prescribed_quantity: 2,
            dispensed_quantity: 0,
            frequency: "BID",
            duration: "5 days",
            instructions: "After meal",
            medicine_id: 1,
            generic_name: "Paracetamol",
            brand_name: "Panadol",
            category: "prescription",
            dosage_value: 500,
            dosage_unit: "mg",
            form: "tablet",
            pos_medicine_id: 1,
            price: 15.5,
            sub_unit: "blister",
            sub_units_per_unit: 1,
            allow_sub_unit_sale: false,
            batch_id: 16,
            batch_number: "LOT-00004",
            expiry_date: "2026-12-01",
            batch_stock_quantity: 1,
            batch_stock_sub_quantity: 0,
            batch_sale_price: 15.5,
            batch_sale_sub_unit_price: 0,
            total_stock_quantity: 3,
            total_stock_sub_quantity: 0,
          },
        ],
      });

    const request = {
      nextUrl: new URL("http://localhost/api/pharmacy/prescription-sale?patientId=10&visitId=58"),
    } as any;

    const response = await getPrescriptionSale(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.availableItems).toHaveLength(1);
    expect(body.data.unavailableItems).toHaveLength(0);
    expect(body.data.availableItems[0].prescribedQuantity).toBe(2);
    expect(body.data.availableItems[0].medicine.batch_id).toBe(16);
  });
});
