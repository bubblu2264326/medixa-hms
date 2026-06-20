import type { NextRequest } from "next/server";
import { query } from "@/database/db";
import { AuthError, getAuthenticatedUser, type AuthenticatedUser } from "@/src/lib/server/auth";

export type PermissionAction = "view" | "create" | "edit" | "delete" | "approve" | "export";

// Granular RBAC enforcement over `staff_permission_policies`.
//
// The policies are DENY-OVERRIDES layered on top of the coarse role gates
// (requireAdminOrSuperAdmin / requireRoles): a route first checks the role, then
// calls assertPermitted to honor any explicit `allowed = false` policy for the
// actor's staff_id or role_id on (module, action). Absence of a policy = allowed
// (preserves prior behavior), so wiring this in never tightens access that a
// seeded policy didn't already intend to remove.
//
// Why deny-only: every seeded policy in this DB is an explicit deny; there are
// no positive role grants. So the base authorization stays the role gate, and
// these policies subtract from it. Positive/allow-list semantics can layer on
// later (Phase 3 admin matrix) without changing callers.

async function isExplicitlyDenied(
  userCode: string,
  module: string,
  action: PermissionAction
): Promise<boolean> {
  // resolve staff_id + role_id for the actor (staff accounts only; doctor
  // accounts have no staff row, so only role-scoped denies can apply to them).
  const who = await query(
    `SELECT s.staff_id, sr.role_id
       FROM staff s
       LEFT JOIN staff_roles sr ON lower(sr.role_name) = lower(replace(s.role, '_', ' '))
      WHERE s.user_code = $1
      LIMIT 1`,
    [userCode]
  );
  const staffId: number | null = who.rows[0]?.staff_id ?? null;
  const roleId: number | null = who.rows[0]?.role_id ?? null;
  if (staffId == null && roleId == null) return false;

  const denied = await query(
    `SELECT 1
       FROM staff_permission_policies
      WHERE module = $1 AND action = $2 AND allowed = false
        AND (expires_at IS NULL OR expires_at > now())
        AND ( ($3::int IS NOT NULL AND staff_id = $3)
           OR ($4::int IS NOT NULL AND role_id = $4) )
      LIMIT 1`,
    [module, action, staffId, roleId]
  );
  return denied.rows.length > 0;
}

// Throw 403 if the already-authenticated actor is explicitly denied (module:action).
export async function assertPermitted(
  user: Pick<AuthenticatedUser, "user_code">,
  module: string,
  action: PermissionAction
): Promise<void> {
  if (await isExplicitlyDenied(user.user_code, module, action)) {
    throw new AuthError(`Forbidden: '${module}:${action}' is denied by permission policy`, 403);
  }
}

// Convenience: authenticate (any valid user) + enforce the (module:action) policy.
export async function requirePermission(
  req: NextRequest,
  module: string,
  action: PermissionAction
): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(req);
  await assertPermitted(user, module, action);
  return user;
}
