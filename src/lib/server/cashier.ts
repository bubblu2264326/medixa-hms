import { NextRequest } from "next/server";
import {
  AuthenticatedUser,
  AuthError,
  getAuthenticatedUser,
  requireAdminOrSuperAdmin,
} from "@/src/lib/server/auth";

export const CASHIER_ALLOWED_ROLES = ["Cashier", "Admin", "Super Admin"] as const;

export async function requireCashierOrAdmin(req: NextRequest): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(req);
  if (!CASHIER_ALLOWED_ROLES.includes(user.role as any)) {
    throw new AuthError("Forbidden", 403);
  }
  return user;
}

export async function requireCashierAdminOnlyForReversal(req: NextRequest) {
  return requireAdminOrSuperAdmin(req);
}

// Reads the optional Idempotency-Key header. Returns "" when absent so callers
// can treat idempotency as opt-in (settle requires it; correct/drafts-apply
// accept it for retry-safety but fall back to their natural single-execution
// guards when it is missing).
export function getIdempotencyKey(req: NextRequest): string {
  const maybeHeaders = (req as { headers?: { get?: (k: string) => string | null } })?.headers;
  if (maybeHeaders && typeof maybeHeaders.get === "function") {
    return maybeHeaders.get("idempotency-key")?.trim() ?? "";
  }
  return "";
}

export function deriveBillPaymentStatus(total: number, paid: number) {
  if (paid <= 0) return "Unpaid";
  if (paid >= total) return "Paid";
  return "Partial";
}
