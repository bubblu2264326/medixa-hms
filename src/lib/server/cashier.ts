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

export function deriveBillPaymentStatus(total: number, paid: number) {
  if (paid <= 0) return "Unpaid";
  if (paid >= total) return "Paid";
  return "Partial";
}
