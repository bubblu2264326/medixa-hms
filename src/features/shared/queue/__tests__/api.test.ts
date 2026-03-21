import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchQueue } from "../api";

describe("shared queue api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects non-array payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ error: "not-an-array" }),
      })
    );

    await expect(fetchQueue("/api/queue")).rejects.toThrow("Queue response was not an array");
  });
});
