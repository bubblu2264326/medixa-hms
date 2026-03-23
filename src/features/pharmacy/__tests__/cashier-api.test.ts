import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock, connectMock, clientQueryMock, releaseMock, getAuthenticatedUserMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  connectMock: vi.fn(),
  clientQueryMock: vi.fn(),
  releaseMock: vi.fn(),
  getAuthenticatedUserMock: vi.fn(),
}));

vi.mock("@/database/db", () => ({
  default: {
    connect: connectMock,
  },
  query: queryMock,
}));

vi.mock("@/src/lib/server/auth", async () => {
  const actual = await vi.importActual<typeof import("@/src/lib/server/auth")>("@/src/lib/server/auth");
  return {
    ...actual,
    getAuthenticatedUser: getAuthenticatedUserMock,
  };
});

import { GET as getOutstanding } from "@/src/app/api/cashier/outstanding/route";
import { POST as postSettle } from "@/src/app/api/cashier/settle/route";

describe("cashier APIs", () => {
  beforeEach(() => {
    queryMock.mockReset();
    connectMock.mockReset();
    clientQueryMock.mockReset();
    releaseMock.mockReset();
    getAuthenticatedUserMock.mockReset();
    getAuthenticatedUserMock.mockResolvedValue({
      user_code: "ST-1",
      role: "Admin",
      name: "Admin",
    });

    connectMock.mockResolvedValue({
      query: clientQueryMock,
      release: releaseMock,
    });
  });

  it("returns cashier outstanding for a visit", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ bill_id: 71, visit_id: 44, patient_id: 8, total_amount: 500, payment_status: "Unpaid" }] })
      .mockResolvedValueOnce({ rows: [{ paid_total: 120 }] })
      .mockResolvedValueOnce({ rows: [{ bill_pharmacy_sale_id: 1, sale_id: 10, amount: 200, settled_amount: 0, settlement_status: "pending", payment_reference: "TXN-10", sale_timestamp: "2026-03-23T10:00:00.000Z" }] });

    const response = await getOutstanding({
      url: "http://localhost/api/cashier/outstanding?visitId=44",
    } as any);

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.bill.billId).toBe(71);
    expect(body.bill.dueAmount).toBe(380);
    expect(body.lines).toHaveLength(1);
  });

  it("settles pending pharmacy dues and updates bill payment status", async () => {
    clientQueryMock
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ staff_id: 7 }] })
      .mockResolvedValueOnce({ rows: [{ bill_id: 71, visit_id: 44, total_amount: 300, payment_status: "Unpaid" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ paid_total: 100 }] })
      .mockResolvedValueOnce({ rows: [{ cashier_payment_txn_id: 55, created_at: "2026-03-23T12:00:00.000Z" }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ bill_pharmacy_sale_id: 2, sale_id: 20, amount: 120, settled_amount: 0, settlement_status: "pending", due_amount: 120, paid_amount: 0 }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ paid_total: 300 }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const response = await postSettle({
      headers: {
        get: (key: string) => (key.toLowerCase() === "idempotency-key" ? "test-key-1" : null),
      },
      json: async () => ({
        billId: 71,
        amount: 200,
        paymentType: "CASH",
      }),
    } as any);

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.paymentStatus).toBe("Paid");
    expect(clientQueryMock.mock.calls.some((call) => String(call[0]).includes("INSERT INTO cashier_payment_allocation"))).toBe(true);
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});
