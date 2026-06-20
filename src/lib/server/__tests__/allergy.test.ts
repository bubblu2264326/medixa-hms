import { describe, it, expect, vi } from "vitest";
import { findAllergyConflict, listActiveAllergies } from "@/src/lib/server/allergy";

const runner = (rows: any[]) => ({ query: vi.fn(async () => ({ rows })) }) as any;

describe("allergy helpers", () => {
  it("findAllergyConflict returns the matching allergy", async () => {
    const r = runner([{ allergen: "Penicillin", severity: "severe" }]);
    expect(await findAllergyConflict(r, 1, "Penicillin V")).toEqual({ allergen: "Penicillin", severity: "severe" });
  });

  it("findAllergyConflict returns null when nothing matches", async () => {
    expect(await findAllergyConflict(runner([]), 1, "Paracetamol")).toBeNull();
  });

  it("findAllergyConflict short-circuits on an empty drug name (no query)", async () => {
    const r = runner([{ allergen: "X", severity: "mild" }]);
    expect(await findAllergyConflict(r, 1, "")).toBeNull();
    expect(r.query).not.toHaveBeenCalled();
  });

  it("listActiveAllergies returns the rows", async () => {
    expect(await listActiveAllergies(runner([{ allergy_id: 1, allergen: "Dust" }]), 1)).toHaveLength(1);
  });
});
