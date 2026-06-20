// Canonical role normalization — the single source of truth for comparing
// role strings across the middleware (page gating) and the server auth helpers
// (API gating). Previously each had its own scheme: middleware normalized to
// lowercase while auth.ts compared titlecase ("Admin"/"Super Admin"), so a
// staff.role stored in a different casing could pass the page gate but be 403'd
// by every API call (audit finding H6/H2).
//
// IMPORTANT: this normalizes only for COMPARISON. Stored/returned role strings
// keep their original casing so existing contracts (and JWT payloads) are
// unchanged.

export type CanonicalRole =
  | "super_admin"
  | "admin"
  | "doctor"
  | "lab_technician"
  | "receptionist"
  | "pharmacist"
  | "cashier";

export function normalizeRole(raw: unknown): string {
  const role = String(raw ?? "").trim().toLowerCase();
  if (role === "super admin" || role === "super_admin") return "super_admin";
  if (role === "admin") return "admin";
  if (role === "doctor") return "doctor";
  if (role === "lab_technician" || role === "lab technician" || role === "technician") return "lab_technician";
  if (role === "receptionist" || role === "front_desk" || role === "front desk") return "receptionist";
  if (role === "pharmacist") return "pharmacist";
  if (role === "cashier") return "cashier";
  return role;
}

// True if userRole matches any of the allowed roles, casing-insensitively.
// Both sides are normalized, so callers may pass any casing
// (e.g. ["Cashier", "Admin"] or ["cashier", "admin"]).
export function rolesMatch(userRole: unknown, allowed: string[]): boolean {
  const u = normalizeRole(userRole);
  return allowed.some((r) => normalizeRole(r) === u);
}
