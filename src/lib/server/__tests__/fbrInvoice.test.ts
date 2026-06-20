import { describe, it, expect, vi } from "vitest";
import { enqueueFbrInvoice } from "@/src/lib/server/fbrInvoice";

const runner = (rows: any[] = [{ submission_id: 3 }]) => ({ query: vi.fn(async () => ({ rows })) }) as any;

describe("FBR invoice enqueue", () => {
  it("enqueues a bill and returns the submission id", async () => {
    const r = runner();
    expect(await enqueueFbrInvoice(r, 71)).toBe(3);
    expect(r.query).toHaveBeenCalledTimes(1);
    expect(String(r.query.mock.calls[0][0])).toContain("ON CONFLICT (bill_id)");
  });

  it("is a no-op (null, no query) without a bill id", async () => {
    const r = runner();
    expect(await enqueueFbrInvoice(r, null)).toBeNull();
    expect(r.query).not.toHaveBeenCalled();
  });
});
