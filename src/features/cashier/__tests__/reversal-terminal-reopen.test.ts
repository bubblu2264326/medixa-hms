import { beforeEach, describe, expect, it, vi } from "vitest";

const { connectMock, queryMock, releaseMock } = vi.hoisted(() => ({
  connectMock: vi.fn(),
  queryMock: vi.fn(),
  releaseMock: vi.fn(),
}));

vi.mock("@/database/db", () => ({ default: { connect: connectMock } }));
vi.mock("@/src/lib/server/cashier", () => ({
  requireCashierAdminOnlyForReversal: vi.fn(async () => ({ user_code: "ADM001", role: "Admin", name: "Admin" })),
  deriveBillPaymentStatus: vi.fn(() => "Unpaid"),
}));
vi.mock("@/src/lib/server/audit", () => ({ logAuditEvent: vi.fn(async () => {}) }));
vi.mock("@/src/lib/server/systemTimezone", () => ({
  getSystemTimezone: vi.fn(async () => "Asia/Karachi"),
  getReceiptDateStamp: vi.fn(() => "20260620"),
}));

import { POST } from "@/src/app/api/cashier/reversal/route";

let visitStatus = "completed";

function wire() {
  queryMock.mockImplementation(async (sql: string) => {
    const s = String(sql);
    if (/^\s*(BEGIN|COMMIT|ROLLBACK)/i.test(s)) return { rows: [] };
    if (s.includes("from staff where user_code")) return { rows: [{ staff_id: 1 }] };
    if (s.includes("INSERT INTO cashier_payment_txn")) return { rows: [{ cashier_payment_txn_id: 999 }] };
    if (s.includes("txn_type = 'reversal'")) return { rows: [] }; // already-reversed check
    if (s.includes("FROM cashier_payment_txn") && s.includes("FOR UPDATE")) {
      return { rows: [{ txn_type: "payment", bill_id: 71, visit_id: 44, amount: 100 }] };
    }
    if (s.includes("FROM bill") && s.includes("FOR UPDATE")) return { rows: [{ bill_id: 71 }] };
    if (s.includes("SELECT total_amount FROM bill")) return { rows: [{ total_amount: 100 }] };
    if (s.includes("SUM(amount)")) return { rows: [{ paid_total: 0 }] };
    if (s.includes("FROM cashier_payment_allocation")) return { rows: [] };
    if (s.includes("SELECT status FROM visit WHERE visit_id")) return { rows: [{ status: visitStatus }] };
    if (s.includes("FROM visit_status_history")) return { rows: [{ status: "seen_by_doctor" }] };
    return { rows: [] };
  });
}

const reverse = (extra: Record<string, unknown> = {}) =>
  POST({ json: async () => ({ cashierPaymentTxnId: 5, reasonCode: "correction", ...extra }) } as any);

const procCalled = () =>
  queryMock.mock.calls.some((c) => String(c[0]).includes("update_and_log_visit_status"));
const rolledBack = () =>
  queryMock.mock.calls.some((c) => /^\s*ROLLBACK/i.test(String(c[0])));

describe("cashier reversal — H2 terminal-visit reopen guard", () => {
  beforeEach(() => {
    queryMock.mockReset();
    connectMock.mockReset();
    releaseMock.mockReset();
    connectMock.mockResolvedValue({ query: queryMock, release: releaseMock });
    wire();
  });

  it("refuses to reverse a payment on a completed visit without an explicit override", async () => {
    visitStatus = "completed";
    const res = await reverse();
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.code).toBe("TERMINAL_REOPEN_REQUIRED");
    expect(procCalled()).toBe(false); // status not touched
    expect(rolledBack()).toBe(true); // whole reversal aborted
  });

  it("reopens a completed visit when allowTerminalReopen is set, reverting to the pre-payment status", async () => {
    visitStatus = "completed";
    const res = await reverse({ allowTerminalReopen: true });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.terminalReopen).toBe(true);
    expect(body.data.reopenedFrom).toBe("completed");
    const procCall = queryMock.mock.calls.find((c) => String(c[0]).includes("update_and_log_visit_status"));
    expect(procCall?.[1]).toEqual([44, "seen_by_doctor", null, 1]);
  });

  it("reverts a non-terminal (payment_done) visit automatically — no override needed", async () => {
    visitStatus = "payment_done";
    const res = await reverse();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.terminalReopen).toBe(false);
    expect(procCalled()).toBe(true);
  });
});
