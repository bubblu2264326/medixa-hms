import { describe, expect, it } from "vitest";

import { composePatientName, splitPatientName } from "@/src/features/reception/patientRegistration/utils";

describe("patient name relation prefix helpers", () => {
  it("composes selected prefix with base name", () => {
    expect(composePatientName("W/O", "Hashim")).toBe("W/O Hashim");
  });

  it("keeps plain name when no prefix is selected", () => {
    expect(composePatientName("", "Hashim")).toBe("Hashim");
  });

  it("prevents duplicate prefix when same prefix is manually typed", () => {
    expect(composePatientName("W/O", "W/O Hashim")).toBe("W/O Hashim");
  });

  it("normalizes typed prefix when no prefix is selected", () => {
    expect(composePatientName("", "d/o Ayesha")).toBe("D/O Ayesha");
  });

  it("splits prefixed stored name for edit hydration", () => {
    expect(splitPatientName("S/O Hassan")).toEqual({ tag: "S/O", baseName: "Hassan" });
  });

  it("keeps plain stored name without tag", () => {
    expect(splitPatientName("Amina")).toEqual({ tag: null, baseName: "Amina" });
  });
});
