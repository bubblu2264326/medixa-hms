import { query } from "@/database/db";
import { jwtVerify } from "jose";
import { NextRequest } from "next/server";

import { JWT_SECRET as secret } from "./jwtSecret";
const FORCED_LOGOUT_MESSAGE = "Admin has force logged you out. Please sign in again.";

export type AuthenticatedDoctor = {
  doctor_id: number;
  doctor_name: string;
  specialization: string;
  user_code: string;
  role: string;
};

export async function getAuthenticatedDoctor(
  req: NextRequest
): Promise<AuthenticatedDoctor> {
  const token = req.cookies.get("token")?.value;

  if (!token) {
    throw new Error("Not authenticated");
  }

  const { payload } = await jwtVerify(token, secret);

  if (payload.role !== "Doctor" || !payload.user_code) {
    throw new Error("Doctor access required");
  }

  const userCode = String(payload.user_code);
  const sid = payload.sid ? String(payload.sid) : null;
  const sessionVersion = Number(payload.sv ?? 1);

  const doctorResult = await query(
    `
      select
        d.doctor_id,
        d.doctor_name,
        d.specialization,
        d.user_code,
        d.session_version,
        d.employment_status,
        ds.session_id as resolved_session_id,
        ds.revoked_at
      from doctor d
      left join doctor_security_sessions ds on ds.session_id::text = $2
      where d.user_code = $1
      limit 1
    `,
    [userCode, sid]
  );

  if (doctorResult.rows.length === 0) {
    throw new Error("Doctor profile not found");
  }

  const doctor = doctorResult.rows[0];

  if (String(doctor.employment_status ?? "active").toLowerCase() !== "active") {
    throw new Error("Doctor account is not active");
  }

  if (Number(doctor.session_version ?? 1) !== sessionVersion) {
    throw new Error(FORCED_LOGOUT_MESSAGE);
  }

  if (sid && !doctor.resolved_session_id) {
    throw new Error(FORCED_LOGOUT_MESSAGE);
  }

  if (sid && doctor.revoked_at) {
    throw new Error(FORCED_LOGOUT_MESSAGE);
  }

  return {
    doctor_id: Number(doctor.doctor_id),
    doctor_name: doctor.doctor_name,
    specialization: doctor.specialization,
    user_code: doctor.user_code,
    role: String(payload.role),
  };
}
