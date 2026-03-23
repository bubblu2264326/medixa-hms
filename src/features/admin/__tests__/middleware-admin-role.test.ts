import { describe, expect, it, vi } from "vitest";

const { jwtVerifyMock } = vi.hoisted(() => ({
  jwtVerifyMock: vi.fn(),
}));

vi.mock("jose", () => ({
  jwtVerify: jwtVerifyMock,
}));

import { middleware } from "@/src/middleware";

const buildRequest = (pathname: string) =>
  ({
    cookies: {
      get: vi.fn(() => ({ value: "token" })),
    },
    nextUrl: {
      pathname,
      clone: () => {
        const url = new URL(`https://example.com${pathname}`);
        return url;
      },
    },
  }) as any;

describe("middleware admin role compatibility", () => {
  it("does not redirect Super Admin from /admin", async () => {
    jwtVerifyMock.mockResolvedValue({
      payload: { role: "Super Admin" },
    });

    const response = await middleware(buildRequest("/admin"));
    expect(response.headers.get("location")).toBeNull();
  });
});
