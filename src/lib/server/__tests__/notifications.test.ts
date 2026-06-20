import { describe, it, expect, vi } from "vitest";
import { enqueueNotification } from "@/src/lib/server/notifications";

const runner = (rows: any[] = [{ notification_id: 9 }]) => ({ query: vi.fn(async () => ({ rows })) }) as any;

describe("notification outbox — enqueue", () => {
  it("enqueues a message and returns the id", async () => {
    const r = runner();
    const id = await enqueueNotification(r, { channel: "whatsapp", recipient: "03001234567", template: "appointment_booked", payload: { a: 1 } });
    expect(id).toBe(9);
    expect(r.query).toHaveBeenCalledTimes(1);
  });

  it("is a no-op (null, no query) when there is no recipient", async () => {
    const r = runner();
    const id = await enqueueNotification(r, { channel: "sms", recipient: "", template: "x" });
    expect(id).toBeNull();
    expect(r.query).not.toHaveBeenCalled();
  });
});
