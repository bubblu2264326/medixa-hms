import { beforeEach, describe, expect, it, vi } from "vitest";

// Mirrors the cashier/reversal H2 guard test for the correct (reverse+repost)
// route: a correction whose replacement no longer fully pays the bill must not
// silently reopen a completed/discharged visit — it requires an explicit admin
// override, and a non-terminal (payment_done) visit reverts automatically.

const { connectMock, queryMock, releaseMock } = vi.hoisted(() => ({
  connectMock: vi.fn(),
  queryMock: vi.fn(),
  releaseMock: vi.fn(),
}));

vi.mock("@/database/db", () => ({ default: { connect: connectMock } }));
vi.mock("@/src/lib/server/cashier", () => ({
  requireCashierAdminOnlyForReversal: vi.fn(async () => ({ user_code: "ADM001", role: "Admin", name: "Admin" })),
  deriveBillPaymentStatus: vi.fn(() => "Partial"),
  getIdempotencyKey: (req: any) => req?.headers?.get?.("idempotency-key") ?? "",
}));
vi.mock("@/src/lib/server/systemTimezone", () => ({
  getSystemTimezone: vi.fn(async () => "Asia/Karachi"),
  getReceiptDateStamp: vi.fn(() => "20260620"),
}));

import { POST } from "@/src/app/api/cashier/correct/route";

let visitStatus = "completed";
let finalPaid = 50; // SUM after reverse+repost; total is 100, so due = 100 - finalPaid

function wire() {
  let billStateCall = 0;
  queryMock.mockImplementation(async (sql: string) => {
    const s = String(sql);
    if (/^\s*(BEGIN|COMMIT|ROLLBACK)/i.test(s)) return { rows: [] };
    if (s.includes("from staff where user_code")) return { rows: [{ staff_id: 1 }] };
    if (s.includes("FROM cashier_payment_txn") && s.includes("FOR UPDATE")) {
      return { rows: [{ txn_type: "payment", bill_id: 71, visit_id: 44, amount: 100 }] };
    }
    if (s.includes("txn_type = 'reversal'")) return { rows: [] }; // not already reversed
    if (s.includes("FROM bill") && s.includes("FOR UPDATE")) return { rows: [{ bill_id: 71, total_amount: 100 }] };
    if (s.includes("INSERT INTO cashier_payment_txn")) return { rows: [{ cashier_payment_txn_id: 900 }] };
    if (s.includes("FROM cashier_payment_allocation")) return { rows: [] };
    if (s.includes("FROM bill_pharmacy_sale")) return { rows: [] };
    // Two identical "GROUP BY b.total_amount" reads: 1st = due-after-reversal
    // (full due, so the replacement validates), 2nd = final state (drives H2).
    if (s.includes("GROUP BY b.total_amount")) {
      billStateCall += 1;
      return { rows: [{ total_amount: 100, paid_total: billStateCall === 1 ? 0 : finalPaid }] };
    }
    if (s.includes("SELECT status FROM visit WHERE visit_id")) return { rows: [{ status: visitStatus }] };
    if (s.includes("FROM visit_status_history")) return { rows: [{ status: "seen_by_doctor" }] };
    return { rows: [] };
  });
}

const correct = (extra: Record<string, unknown> = {}) =>
  POST({ json: async () => ({ cashierPaymentTxnId: 5, reasonCode: "correction", replacementAmount: 50, ...extra }) } as any);

const procCalled = () =>
  queryMock.mock.calls.some((c) => String(c[0]).includes("update_and_log_visit_status"));
const rolledBack = () =>
  queryMock.mock.calls.some((c) => /^\s*ROLLBACK/i.test(String(c[0])));

describe("cashier correct — H2 terminal-visit reopen guard", () => {
  beforeEach(() => {
    queryMock.mockReset();
    connectMock.mockReset();
    releaseMock.mockReset();
    visitStatus = "completed";
    finalPaid = 50;
    connectMock.mockResolvedValue({ query: queryMock, release: releaseMock });
    wire();
  });

  it("refuses to correct down a payment on a completed visit without an explicit override", async () => {
    const res = await correct();
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.code).toBe("TERMINAL_REOPEN_REQUIRED");
    expect(procCalled()).toBe(false); // status untouched
    expect(rolledBack()).toBe(true); // whole correction aborted
  });

  it("reopens a completed visit when allowTerminalReopen is set, reverting to the pre-payment status", async () => {
    const res = await correct({ allowTerminalReopen: true });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.terminalReopen).toBe(true);
    expect(body.data.reopenedFrom).toBe("completed");
    const procCall = queryMock.mock.calls.find((c) => String(c[0]).includes("update_and_log_visit_status"));
    expect(procCall?.[1]).toEqual([44, "seen_by_doctor", null, 1]);
  });

  it("reverts a non-terminal (payment_done) visit automatically — no override needed", async () => {
    visitStatus = "payment_done";
    const res = await correct();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.terminalReopen).toBe(false);
    expect(procCalled()).toBe(true);
  });

  it("leaves a completed visit untouched when the replacement still fully pays the bill", async () => {
    finalPaid = 100; // due = 0 → no reopen, no guard
    const res = await correct();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.terminalReopen).toBe(false);
    expect(procCalled()).toBe(false);
  });
});
