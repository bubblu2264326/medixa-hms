import { beforeEach, describe, expect, it, vi } from "vitest";

// The correct (reverse+repost) route accepts an optional Idempotency-Key: the
// first call caches its response; a retry with the same key replays it without
// performing a second reversal — so a network retry can't double-correct.

const { connectMock, queryMock, releaseMock } = vi.hoisted(() => ({
  connectMock: vi.fn(),
  queryMock: vi.fn(),
  releaseMock: vi.fn(),
}));

vi.mock("@/database/db", () => ({ default: { connect: connectMock } }));
vi.mock("@/src/lib/server/cashier", () => ({
  requireCashierAdminOnlyForReversal: vi.fn(async () => ({ user_code: "ADM001", role: "Admin", name: "Admin" })),
  deriveBillPaymentStatus: vi.fn(() => "Paid"),
  getIdempotencyKey: (req: any) => req?.headers?.get?.("idempotency-key") ?? "",
}));
vi.mock("@/src/lib/server/systemTimezone", () => ({
  getSystemTimezone: vi.fn(async () => "Asia/Karachi"),
  getReceiptDateStamp: vi.fn(() => "20260620"),
}));

import { POST } from "@/src/app/api/cashier/correct/route";

let cachedResponse: unknown = null; // when set, the idempotency SELECT returns a hit

function wire() {
  let billStateCall = 0;
  queryMock.mockImplementation(async (sql: string) => {
    const s = String(sql);
    if (/^\s*(BEGIN|COMMIT|ROLLBACK)/i.test(s)) return { rows: [] };
    if (s.includes("from staff where user_code")) return { rows: [{ staff_id: 1 }] };
    if (s.includes("FROM cashier_payment_txn") && s.includes("FOR UPDATE")) {
      return { rows: [{ txn_type: "payment", bill_id: 71, visit_id: 44, amount: 100 }] };
    }
    if (s.includes("FROM cashier_idempotency")) {
      return cachedResponse
        ? { rows: [{ response_json: cachedResponse, status_code: 200 }] }
        : { rows: [] };
    }
    if (s.includes("txn_type = 'reversal'")) return { rows: [] };
    if (s.includes("FROM bill") && s.includes("FOR UPDATE")) return { rows: [{ bill_id: 71, total_amount: 100 }] };
    if (s.includes("INSERT INTO cashier_payment_txn")) return { rows: [{ cashier_payment_txn_id: 900 }] };
    if (s.includes("FROM cashier_payment_allocation")) return { rows: [] };
    if (s.includes("FROM bill_pharmacy_sale")) return { rows: [] };
    // 1st GROUP BY = due-after-reversal (full due, so the 100 replacement
    // validates); 2nd = final state fully paid → due 0 → no H2 path.
    if (s.includes("GROUP BY b.total_amount")) {
      billStateCall += 1;
      return { rows: [{ total_amount: 100, paid_total: billStateCall === 1 ? 0 : 100 }] };
    }
    return { rows: [] };
  });
}

const correct = (key: string | null) =>
  POST({
    headers: { get: (k: string) => (k.toLowerCase() === "idempotency-key" ? key : null) },
    json: async () => ({ cashierPaymentTxnId: 5, reasonCode: "fix", replacementAmount: 100 }),
  } as any);

const reversalInserts = () =>
  queryMock.mock.calls.filter((c) => String(c[0]).includes("INSERT INTO cashier_payment_txn")).length;

describe("cashier correct — optional idempotency", () => {
  beforeEach(() => {
    queryMock.mockReset();
    connectMock.mockReset();
    releaseMock.mockReset();
    cachedResponse = null;
    connectMock.mockResolvedValue({ query: queryMock, release: releaseMock });
    wire();
  });

  it("caches the response under the idempotency key on success", async () => {
    const res = await correct("KEY-1");
    expect(res.status).toBe(200);
    const insert = queryMock.mock.calls.find((c) => String(c[0]).includes("INSERT INTO cashier_idempotency"));
    expect(insert).toBeTruthy();
    expect(insert![1]?.[0]).toBe("KEY-1");
    expect(insert![1]?.[1]).toBe("/api/cashier/correct");
  });

  it("replays the cached response on a repeat key without a second reversal", async () => {
    cachedResponse = { success: true, data: { replayed: true } };
    const res = await correct("KEY-1");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, data: { replayed: true } });
    expect(reversalInserts()).toBe(0); // no reverse/repost performed on replay
  });

  it("runs normally (no caching) when no key is supplied", async () => {
    const res = await correct(null);
    expect(res.status).toBe(200);
    const insert = queryMock.mock.calls.find((c) => String(c[0]).includes("INSERT INTO cashier_idempotency"));
    expect(insert).toBeFalsy();
  });
});
