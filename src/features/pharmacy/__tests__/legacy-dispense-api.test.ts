import { describe, expect, it, vi } from "vitest";

// The legacy dispense routes now import the auth helper, which transitively
// imports the DB pool (`@/database/db`) and throws if DATABASE_URL is unset.
// Provide a self-contained auth mock so these import-only retirement stubs can
// load without a database connection.
vi.mock("@/src/lib/server/auth", () => ({
  getAuthenticatedUser: vi.fn(async () => ({
    user_code: "STAFF-1",
    role: "Pharmacy",
    name: "Test Staff",
  })),
  AuthError: class AuthError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import { POST as postLegacyDispense } from "@/src/app/api/medicine/dispenseMedicine/route";
import { GET as getLegacyDispenseCurrentMeds } from "@/src/app/api/medicine/dispenseMedicine/currentMeds/[patientId]/route";

describe("legacy dispense APIs", () => {
  it("rejects the retired dispense endpoint", async () => {
    const response = await postLegacyDispense({} as any);
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body.error).toContain("retired");
    expect(body.error).toContain("/api/transactions");
  });

  it("rejects the retired current meds endpoint", async () => {
    const response = await getLegacyDispenseCurrentMeds({} as any, {
      params: Promise.resolve({ patientId: "123" }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body.error).toContain("retired");
  });
});
