import { beforeEach, describe, expect, it, vi } from "vitest";

const { connectMock, queryMock, releaseMock, getCurrentStaffIdMock } = vi.hoisted(() => ({
  connectMock: vi.fn(),
  queryMock: vi.fn(),
  releaseMock: vi.fn(),
  getCurrentStaffIdMock: vi.fn(() => 1),
}));

vi.mock("@/database/db", () => ({
  default: {
    connect: connectMock,
  },
}));

vi.mock("@/src/lib/utils", () => ({
  getCurrentStaffId: getCurrentStaffIdMock,
}));

import { POST as postTransaction, GET as getInvoices } from "@/src/app/api/transactions/route";
import { GET as getTransaction, PUT as putTransaction } from "@/src/app/api/transactions/[id]/route";
import { GET as getSaleReturn } from "@/src/app/api/transactions/return/[id]/route";

describe("pharmacy transaction detail routes", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue({ rows: [] });
    connectMock.mockReset();
    releaseMock.mockReset();
    getCurrentStaffIdMock.mockReset();
    getCurrentStaffIdMock.mockReturnValue(1);
    connectMock.mockResolvedValue({
      query: queryMock,
      release: releaseMock,
    });
  });

  it("loads sale edit data using pharmacy_sale_detail_id as the cart item id", async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          {
            sale_id: 21,
            payment_reference: "TXN-1772652342850-252",
            sale_timestamp: "2026-03-04T19:25:44.552Z",
            customer_id: null,
            visit_id: null,
            bill_id: null,
            prescription_id: null,
            status: "Completed",
            payment_type: "CASH",
            total_amount: "90.00",
            paid_amount: "10000.00",
            due_amount: "0.00",
            change_amount: "9910.00",
            discount_amount: "0.00",
            discount_percent: "0.00",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            pharmacy_sale_detail_id: 17,
            medicine_id: 5,
            generic_name: "Metformin",
            brand_name: "Glucophage",
            dosage_value: 500,
            dosage_unit: "mg",
            sub_units_per_unit: 10,
            medicine_base_price: "50.00",
            medicine_base_sub_price: "5.00",
            batch_id: 5,
            batch_number: "BCH005",
            expiry_date: "2026-11-11",
            batch_stock_quantity: 38,
            batch_stock_sub_quantity: 2,
            batch_sale_price: "50.00",
            batch_sale_sub_unit_price: "5.00",
            quantity: 1,
            sub_quantity: 8,
            unit_sale_price: "50.00",
            discount_percent: "0.00",
            line_total: "90.00",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [],
      });

    const response = await getTransaction({} as any, {
      params: Promise.resolve({ id: "21" }),
    } as any);

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.items[0].id).toBe("17");
    expect(body.data.items[0].batchId).toBe(5);
    expect(body.data.items[0].discountPercent).toBeTypeOf("number");
    expect(body.data.items[0].discountedPrice).toBe(50);
    expect(body.data.items[0].medicine.price).toBe(50);
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });

  it("searches completed invoices by reference or patient name", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          sale_id: 44,
          payment_reference: "TXN-1774178288599-172",
          sale_timestamp: "2026-03-22T10:44:22.000Z",
          total_amount: "155.50",
          visit_id: 12,
          patient_id: 9,
          patient_name: "Ali Khan",
          items_count: 3,
        },
      ],
    });

    const response = await getInvoices({
      nextUrl: new URL("http://localhost/api/transactions?query=ali"),
    } as any);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([
      {
        id: "44",
        reference: "TXN-1774178288599-172",
        timestamp: "2026-03-22T10:44:22.000Z",
        totalAmount: 155.5,
        itemsCount: 3,
        patientId: 9,
        patientName: "Ali Khan",
        visitId: 12,
      },
    ]);
  });

  it("stores override prescription items in the unified sale detail path", async () => {
    queryMock
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ prescription_id: 13, visit_id: 44 }],
      })
      .mockResolvedValueOnce({
        rows: [{ bill_id: 71 }],
      })
      .mockResolvedValueOnce({
        rows: [{ sale_id: 21, sale_timestamp: "2026-03-19T10:30:00.000Z" }],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ status: "dispensing" }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const response = await postTransaction(
      {
        json: async () => ({
          visitId: 44,
          billId: null,
          payment: {
            payableAmount: 120,
            type: "CASH",
            paidAmount: 120,
            dueAmount: 0,
            changeAmount: 0,
            adjustmentPercent: 0,
            adjustment: 0,
          },
          customerId: 1,
          prescriptionId: 13,
          reference: "TXN-RX-OVERRIDE",
          cashier: "Current User",
          status: "completed",
          mode: "SALE",
          items: [
            {
              medicine: {
                id: 5,
                medicine_id: 5,
                sub_units_per_unit: 10,
                batch_sale_sub_unit_price: 5,
              },
              quantity: 2,
              subQuantity: 0,
              price: 60,
              discountPercent: 0,
              prescriptionMedicineId: 99,
              fulfillmentMode: "override",
              isBillable: true,
              isInventoryBacked: false,
              overrideReasonCode: "purchased_from_other_store",
              overrideReasonNote: "Bought from nearby store",
              availableQuantity: 0,
              lineTotal: 120,
            },
          ],
        }),
      } as any
    );

    expect(response.status).toBe(200);
    expect(queryMock.mock.calls[4]?.[0]).toContain("pharmacy_sale_detail");
    expect(queryMock.mock.calls[5]?.[0]).toContain("prescription_fulfillment_action");
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });

  it("updates existing sale details using the live pharmacy_sale_detail_id key", async () => {
    queryMock
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ pharmacy_sale_detail_id: 17, medicine_id: 5, batch_id: 5, quantity: 1, sub_quantity: 8 }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            batch_id: 5,
            batch_number: "BCH005",
            stock_quantity: 10,
            stock_sub_quantity: 0,
            sub_units_per_unit: 10,
            form: "tab",
            sub_unit: "box",
          },
        ],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const response = await putTransaction(
      {
        json: async () => ({
          visitId: null,
          billId: null,
          payment: {
            payableAmount: 90,
            type: "CASH",
            paidAmount: 10000,
            dueAmount: 0,
            changeAmount: 9910,
            adjustmentPercent: 0,
            adjustment: 0,
          },
          customerId: null,
          prescriptionId: null,
          reference: "TXN-1772652342850-252",
          items: [
            {
              id: "17",
              medicine: {
                id: 5,
                sub_units_per_unit: 10,
                batch_sale_sub_unit_price: 5,
              },
              quantity: 1,
              subQuantity: 8,
              price: 50,
              discountPercent: 0,
              batchId: 5,
            },
          ],
        }),
      } as any,
      { params: Promise.resolve({ id: "21" }) } as any
    );

    expect(response.status).toBe(200);
    expect(queryMock.mock.calls.some((call) => String(call[0]).includes("SELECT pharmacy_sale_detail_id, medicine_id, batch_id, quantity, sub_quantity"))).toBe(true);
    expect(queryMock.mock.calls.some((call) => String(call[0]).includes("WHERE pharmacy_sale_detail_id = $8"))).toBe(true);
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });

  it("updates prescription medicine dispense state when completing a prescription sale", async () => {
    queryMock
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ prescription_id: 13, visit_id: 44 }],
      })
      .mockResolvedValueOnce({
        rows: [{ bill_id: 71 }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            batch_id: 5,
            batch_number: "BCH005",
            stock_quantity: 10,
            stock_sub_quantity: 0,
            sub_units_per_unit: 10,
            form: "tab",
            sub_unit: "box",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ sale_id: 21, sale_timestamp: "2026-03-19T10:30:00.000Z" }],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const response = await postTransaction(
      {
        json: async () => ({
          visitId: 44,
          billId: null,
          payment: {
            payableAmount: 90,
            type: "CASH",
            paidAmount: 90,
            dueAmount: 0,
            changeAmount: 0,
            adjustmentPercent: 0,
            adjustment: 0,
          },
          customerId: 1,
          prescriptionId: 13,
          reference: "TXN-RX-001",
          cashier: "Current User",
          status: "completed",
          mode: "SALE",
          items: [
            {
              medicine: {
                id: 5,
                sub_units_per_unit: 10,
                batch_sale_sub_unit_price: 5,
              },
              quantity: 2,
              subQuantity: 0,
              price: 45,
              discountPercent: 0,
              batchId: 5,
              prescriptionMedicineId: 99,
            },
          ],
        }),
      } as any
    );

    expect(response.status).toBe(200);
    expect(queryMock.mock.calls.some((call) => String(call[0]).includes("FROM prescription"))).toBe(true);
    expect(queryMock.mock.calls.some((call) => String(call[0]).includes("FROM bill"))).toBe(true);
    const dispenseUpdateCall = queryMock.mock.calls.find((call) => String(call[0]).includes("UPDATE prescription_medicines"));
    expect(dispenseUpdateCall?.[1]).toEqual([1, 2, 99, 13, 0, "out_of_stock"]);
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });

  it("uses FEFO allocation for prescription sales even when cart items include a batchId", async () => {
    queryMock
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ prescription_id: 13, visit_id: 44 }],
      })
      .mockResolvedValueOnce({
        rows: [{ bill_id: 71 }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            batch_id: 5,
            batch_number: "LOT-00004",
            stock_quantity: 1,
            stock_sub_quantity: 0,
            unit_price: 45,
            sub_unit_price: 4.5,
            expiry_date: "2026-12-01",
          },
          {
            batch_id: 6,
            batch_number: "LOT-00005",
            stock_quantity: 5,
            stock_sub_quantity: 0,
            unit_price: 45,
            sub_unit_price: 4.5,
            expiry_date: "2027-01-01",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ sale_id: 21, sale_timestamp: "2026-03-19T10:30:00.000Z" }],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ status: "dispensing" }] })
      .mockResolvedValueOnce({});

    const response = await postTransaction(
      {
        json: async () => ({
          visitId: 44,
          billId: null,
          payment: {
            payableAmount: 90,
            type: "CASH",
            paidAmount: 90,
            dueAmount: 0,
            changeAmount: 0,
            adjustmentPercent: 0,
            adjustment: 0,
          },
          customerId: 1,
          prescriptionId: 13,
          reference: "TXN-RX-FEFO-001",
          cashier: "Current User",
          status: "completed",
          mode: "SALE",
          items: [
            {
              medicine: {
                id: 5,
                medicine_id: 5,
                sub_units_per_unit: 1,
                batch_sale_sub_unit_price: 4.5,
              },
              quantity: 2,
              subQuantity: 0,
              price: 45,
              discountPercent: 0,
              batchId: 5,
              prescriptionMedicineId: 99,
            },
          ],
        }),
      } as any
    );

    expect(response.status).toBe(200);

    const fefoAllocationQuery = queryMock.mock.calls.find((call) =>
      String(call[0]).includes("WHERE mb.medicine_id = $1")
      && String(call[0]).includes("ORDER BY mb.expiry_date ASC NULLS LAST")
    );
    expect(fefoAllocationQuery).toBeTruthy();

    const saleDetailInserts = queryMock.mock.calls.filter((call) =>
      String(call[0]).includes("INSERT INTO pharmacy_sale_detail")
    );
    expect(saleDetailInserts.length).toBe(2);
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });

  it("rejects overselling stock before writing a sale", async () => {
    queryMock
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [
          {
            batch_id: 5,
            batch_number: "BCH005",
            stock_quantity: 1,
            stock_sub_quantity: 0,
            sub_units_per_unit: 1,
            form: "tab",
            sub_unit: "box",
          },
        ],
      })
      .mockResolvedValueOnce({});

    const response = await postTransaction(
      {
        json: async () => ({
          visitId: null,
          billId: null,
          payment: {
            payableAmount: 100,
            type: "CASH",
            paidAmount: 100,
            dueAmount: 0,
            changeAmount: 0,
            adjustmentPercent: 0,
            adjustment: 0,
          },
          customerId: null,
          prescriptionId: null,
          reference: "TXN-STOCK-FAIL",
          cashier: "Current User",
          status: "completed",
          mode: "SALE",
          items: [
            {
              medicine: {
                id: 5,
                medicine_id: 5,
                brand_name: "Metformin",
                batch_number: "BCH005",
                sub_units_per_unit: 1,
                form: "tab",
                sub_unit: "box",
              },
              quantity: 2,
              subQuantity: 0,
              price: 50,
              discountPercent: 0,
              batchId: 5,
              lineTotal: 100,
            },
          ],
        }),
      } as any
    );

    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain("Only 1 box available");
    expect(queryMock.mock.calls.some((call) => String(call[0]).includes("INSERT INTO pharmacy_sale"))).toBe(false);
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });

  it("rejects sale edits when the requested quantity exceeds current stock after accounting for the existing reservation", async () => {
    queryMock
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [
          { pharmacy_sale_detail_id: 17, medicine_id: 5, batch_id: 5, quantity: 2, sub_quantity: 0 },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            batch_id: 5,
            batch_number: "BCH005",
            stock_quantity: 1,
            stock_sub_quantity: 0,
            sub_units_per_unit: 1,
            form: "tab",
            sub_unit: "box",
          },
        ],
      })
      .mockResolvedValueOnce({});

    const response = await putTransaction(
      {
        json: async () => ({
          visitId: null,
          billId: null,
          payment: {
            payableAmount: 150,
            type: "CASH",
            paidAmount: 150,
            dueAmount: 0,
            changeAmount: 0,
            adjustmentPercent: 0,
            adjustment: 0,
          },
          customerId: null,
          prescriptionId: null,
          reference: "TXN-EDIT-STOCK-FAIL",
          items: [
            {
              medicine: {
                id: 5,
                medicine_id: 5,
                brand_name: "Metformin",
                batch_number: "BCH005",
                sub_units_per_unit: 1,
                form: "tab",
                sub_unit: "box",
              },
              quantity: 4,
              subQuantity: 0,
              price: 50,
              discountPercent: 0,
              batchId: 5,
            },
          ],
        }),
      } as any,
      { params: Promise.resolve({ id: "21" }) } as any
    );

    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain("Only 3 boxes available");
    expect(queryMock.mock.calls.some((call) => String(call[0]).includes("UPDATE pharmacy_sale SET"))).toBe(false);
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });

  it("loads return edit data using sale_return_detail.id as the cart item id", async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          {
            return_id: 9,
            sale_id: 21,
            payment_type: "CASH",
            payment_reference: "TXN-1772652342850-252",
            return_timestamp: "2026-03-04T20:00:00.000Z",
            reason: "Customer return",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 3,
            medicine_id: 5,
            generic_name: "Metformin",
            brand_name: "Glucophage",
            dosage_value: 500,
            dosage_unit: "mg",
            sub_units_per_unit: 10,
            medicine_base_price: "50.00",
            medicine_base_sub_price: "5.00",
            batch_id: 5,
            batch_number: "BCH005",
            expiry_date: "2026-11-11",
            batch_stock_quantity: 38,
            batch_stock_sub_quantity: 2,
            batch_sale_price: "50.00",
            batch_sale_sub_unit_price: "5.00",
            returned_quantity: 1,
            returned_sub_quantity: 2,
            returned_unit_price: "50.00",
            returned_sub_unit_price: "5.00",
          },
        ],
      });

    const response = await getSaleReturn({} as any, {
      params: Promise.resolve({ id: "9" }),
    } as any);

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.items[0].id).toBe("3");
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });

  it("appends pharmacy dispense to bill without collecting payment at POS", async () => {
    queryMock
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ sale_id: 37, sale_timestamp: "2026-03-23T12:00:00.000Z" }],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ bill_pharmacy_sale_id: 91 }],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const response = await postTransaction(
      {
        json: async () => ({
          visitId: 44,
          billId: 71,
          settlementMode: "append_to_bill",
          payment: {
            payableAmount: 120,
            type: "CASH",
            paidAmount: 0,
            dueAmount: 120,
            changeAmount: 0,
            adjustmentPercent: 0,
            adjustment: 0,
          },
          customerId: null,
          prescriptionId: null,
          reference: "TXN-APPEND-001",
          cashier: "Current User",
          status: "completed",
          mode: "SALE",
          items: [
            {
              medicine: {
                id: 5,
                medicine_id: 5,
                sub_units_per_unit: 10,
              },
              quantity: 2,
              subQuantity: 0,
              price: 60,
              discountPercent: 0,
              isBillable: true,
              isInventoryBacked: false,
              lineTotal: 120,
            },
          ],
        }),
      } as any
    );

    expect(response.status).toBe(200);
    expect(queryMock.mock.calls.some((call) => String(call[0]).includes("INSERT INTO bill_pharmacy_sale"))).toBe(true);
    expect(queryMock.mock.calls.some((call) => String(call[0]).includes("UPDATE bill"))).toBe(true);
    expect(queryMock.mock.calls.some((call) => String(call[0]).includes("INSERT INTO bill_item"))).toBe(true);
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});
