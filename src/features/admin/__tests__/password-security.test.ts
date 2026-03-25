import { describe, expect, it } from "vitest";
import { hashPassword, isPasswordHash, verifyPassword } from "@/src/lib/server/password";

describe("password security utils", () => {
  it("hashes passwords using scrypt format", () => {
    const hash = hashPassword("StrongPass#123");
    expect(isPasswordHash(hash)).toBe(true);
    expect(hash).not.toBe("StrongPass#123");
  });

  it("verifies hashed passwords", () => {
    const hash = hashPassword("StrongPass#123");
    expect(verifyPassword("StrongPass#123", hash)).toBe(true);
    expect(verifyPassword("wrong", hash)).toBe(false);
  });

  it("supports legacy plaintext comparison during transition", () => {
    expect(verifyPassword("abc123", "abc123")).toBe(true);
    expect(verifyPassword("abc123", "def456")).toBe(false);
  });
});

