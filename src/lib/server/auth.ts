import { jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { query } from "@/database/db";

const secret = new TextEncoder().encode(
  process.env.secret_key || "hms_super_secure_2026_clinic_key"
);

export type AuthenticatedUser = {
  user_code: string;
  role: string;
  name: string;
  account_type?: "staff" | "doctor";
  session_id?: string | null;
};

export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const FORCED_LOGOUT_MESSAGE = "Admin has force logged you out. Please sign in again.";

export async function getAuthenticatedUser(
  req: NextRequest
): Promise<AuthenticatedUser> {
  const token = req.cookies.get("token")?.value;

  if (!token) {
    throw new AuthError("Not authenticated", 401);
  }

  let payload: Awaited<ReturnType<typeof jwtVerify>>["payload"];
  try {
    const verified = await jwtVerify(token, secret);
    payload = verified.payload;
  } catch {
    throw new AuthError("Invalid token", 401);
  }

  const accountType = payload.account_type === "doctor" ? "doctor" : "staff";
  return {
    user_code: await resolveUserCodeWithSessionValidation(payload, accountType),
    role: String(payload.role ?? ""),
    name: String(payload.name ?? ""),
    account_type: accountType,
    session_id: payload.sid ? String(payload.sid) : null,
  };
}

async function resolveUserCodeWithSessionValidation(
  payload: Awaited<ReturnType<typeof jwtVerify>>["payload"],
  accountType: "staff" | "doctor"
) {
  const userCode = String(payload.user_code ?? "");
  const sid = payload.sid ? String(payload.sid) : null;
  const sessionVersion = Number(payload.sv ?? 1);
  const result =
    accountType === "doctor"
      ? await query(
          `
          SELECT
            d.session_version,
            d.employment_status,
            ds.session_id AS resolved_session_id,
            ds.revoked_at
          FROM doctor d
          LEFT JOIN doctor_security_sessions ds ON ds.session_id::text = $2
          WHERE d.user_code = $1
          LIMIT 1
          `,
          [userCode, sid]
        )
      : await query(
          `
          SELECT
            s.session_version,
            s.employment_status,
            ss.session_id AS resolved_session_id,
            ss.revoked_at
          FROM staff s
          LEFT JOIN staff_security_sessions ss ON ss.session_id::text = $2
          WHERE s.user_code = $1
          LIMIT 1
          `,
          [userCode, sid]
        );

  const row = result.rows[0];
  if (!row) {
    throw new AuthError("Forbidden", 403);
  }

  if (String(row.employment_status ?? "active").toLowerCase() !== "active") {
    throw new AuthError("Forbidden", 403);
  }

  if (Number(row.session_version ?? 1) !== sessionVersion) {
    throw new AuthError(FORCED_LOGOUT_MESSAGE, 401);
  }

  if (sid && !row.resolved_session_id) {
    throw new AuthError(FORCED_LOGOUT_MESSAGE, 401);
  }

  if (sid && row.revoked_at) {
    throw new AuthError(FORCED_LOGOUT_MESSAGE, 401);
  }

  return userCode;
}

export async function requireAdminOrSuperAdmin(
  req: NextRequest
): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(req);

  if (user.role !== "Admin" && user.role !== "Super Admin") {
    throw new AuthError("Forbidden", 403);
  }

  return user;
}

export function hasAnyRole(userRole: string, allowedRoles: string[]) {
  return allowedRoles.includes(userRole);
}

export async function requireRoles(
  req: NextRequest,
  allowedRoles: string[]
): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(req);
  if (!hasAnyRole(user.role, allowedRoles)) {
    throw new AuthError("Forbidden", 403);
  }
  return user;
}
