import { jwtVerify } from "jose";
import { NextRequest } from "next/server";

const secret = new TextEncoder().encode(
  process.env.secret_key || "hms_super_secure_2026_clinic_key"
);

export type AuthenticatedUser = {
  user_code: string;
  role: string;
  name: string;
};

export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

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

  return {
    user_code: String(payload.user_code ?? ""),
    role: String(payload.role ?? ""),
    name: String(payload.name ?? ""),
  };
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
