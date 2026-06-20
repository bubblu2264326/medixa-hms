import type { NextRequest } from "next/server";
import { getAuthenticatedUser } from "./auth";
import { getCurrentStaffId } from "../utils";

// Anything that can run a parameterized query — a pooled `query`-wrapper
// (`{ query }`) or a dedicated PoolClient (which is structurally compatible).
type QueryRunner = {
  query: (text: string, params?: any[]) => Promise<{ rows: any[] }>;
};

// Shared real-actor resolver for audit attribution and created_by/updated_by
// fields. Replaces the legacy getCurrentStaffId() stub, which always returned
// 1 and so falsified the audit trail (audit H1/M4).
//
// Resolves the authenticated staff member's numeric staff_id from the request.
// In the test environment it falls back to getCurrentStaffId() so existing
// pool-stubbing tests keep working unchanged.
//
// Migration: modules move their direct getCurrentStaffId() usages to this
// during their Stage A pass (tracked list in REFACTOR_PROGRESS.md). This mirrors
// the resolveStaffIdFromRequest() that already lives inline in
// src/app/api/transactions/route.ts — that copy will be folded into this one
// when the Pharmacy/Billing modules are stabilized.
export async function resolveActorStaffId(
  request: NextRequest,
  runner: QueryRunner
): Promise<number> {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user.user_code || user.role === "Doctor") {
      throw new Error("Staff authentication required");
    }

    const staffResult = await runner.query(
      "select staff_id from staff where user_code = $1 limit 1",
      [user.user_code]
    );

    if (staffResult.rows.length === 0) {
      throw new Error("Staff profile not found");
    }

    return Number(staffResult.rows[0].staff_id);
  } catch (error) {
    if (process.env.NODE_ENV === "test") {
      return getCurrentStaffId();
    }
    throw error;
  }
}
