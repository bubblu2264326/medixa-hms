import { NextRequest, NextResponse } from "next/server";
import pool from "@/database/db";
import { hashPassword } from "@/src/lib/server/password";
import { logAuditEvent } from "@/src/lib/server/audit";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const token = String(body?.token ?? "").trim();
  const newPassword = String(body?.new_password ?? "");

  if (!token || !newPassword) {
    return NextResponse.json({ error: "token and new_password are required" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const staffLookup = await client.query(
      `
      SELECT staff_id, user_code
      FROM staff
      WHERE password_reset_token = $1
        AND password_reset_expires_at IS NOT NULL
        AND password_reset_expires_at > CURRENT_TIMESTAMP
      LIMIT 1
      `,
      [token]
    );

    if (staffLookup.rows[0]) {
      const staffId = Number(staffLookup.rows[0].staff_id);
      const userCode = String(staffLookup.rows[0].user_code);

      await client.query(
        `
        UPDATE staff
        SET password = $2,
            password_changed_at = CURRENT_TIMESTAMP,
            password_reset_token = NULL,
            password_reset_expires_at = NULL,
            failed_login_attempts = 0,
            account_locked_until = NULL,
            session_version = session_version + 1
        WHERE staff_id = $1
        `,
        [staffId, hashPassword(newPassword)]
      );

      await client.query(
        `
        UPDATE staff_security_sessions
        SET revoked_at = CURRENT_TIMESTAMP,
            revoked_reason = 'password_reset_token_consumed'
        WHERE staff_id = $1
          AND revoked_at IS NULL
        `,
        [staffId]
      );

      await logAuditEvent(
        {
          actorStaffId: staffId,
          action: "Password reset completed",
          entityType: "auth",
          entityId: staffId,
          details: {
            userCode,
            flow: "reset_token",
            accountType: "staff",
          },
        },
        client
      );
      return NextResponse.json({ success: true });
    }

    const doctorLookup = await client.query(
      `
      SELECT doctor_id, user_code
      FROM doctor
      WHERE password_reset_token = $1
        AND password_reset_expires_at IS NOT NULL
        AND password_reset_expires_at > CURRENT_TIMESTAMP
      LIMIT 1
      `,
      [token]
    );

    if (!doctorLookup.rows[0]) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    const doctorId = Number(doctorLookup.rows[0].doctor_id);
    const userCode = String(doctorLookup.rows[0].user_code);

    await client.query(
      `
      UPDATE doctor
      SET password = $2,
          password_changed_at = CURRENT_TIMESTAMP,
          password_reset_token = NULL,
          password_reset_expires_at = NULL,
          failed_login_attempts = 0,
          account_locked_until = NULL,
          session_version = session_version + 1
      WHERE doctor_id = $1
      `,
      [doctorId, hashPassword(newPassword)]
    );

    await client.query(
      `
      UPDATE doctor_security_sessions
      SET revoked_at = CURRENT_TIMESTAMP,
          revoked_reason = 'password_reset_token_consumed'
      WHERE doctor_id = $1
        AND revoked_at IS NULL
      `,
      [doctorId]
    );

    await logAuditEvent(
      {
        action: "Doctor password reset completed",
        entityType: "auth",
        entityId: doctorId,
        details: {
          userCode,
          flow: "reset_token",
          accountType: "doctor",
        },
      },
      client
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("password reset route error", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  } finally {
    client.release();
  }
}
