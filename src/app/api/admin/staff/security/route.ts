import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { hashPassword } from "@/src/lib/server/password";
import { logAuditEvent } from "@/src/lib/server/audit";

const MINUTES_30 = 30 * 60 * 1000;

function makeTempPassword() {
  return `HMS-${randomBytes(6).toString("hex")}`;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    const { searchParams } = new URL(req.url);
    const staffId = Number(searchParams.get("staff_id") ?? 0);
    const accountType = searchParams.get("account_type") === "doctor" ? "doctor" : "staff";
    if (!staffId) {
      return NextResponse.json({ error: "staff_id is required" }, { status: 400 });
    }

    if (accountType === "doctor") {
      const [doctorResult, sessionsResult] = await Promise.all([
        query(
          `
          SELECT
            doctor_id,
            user_code,
            doctor_name AS name,
            'Doctor'::text AS role,
            employment_status,
            failed_login_attempts,
            account_locked_until,
            last_login_at,
            mfa_enabled,
            session_version
          FROM doctor
          WHERE doctor_id = $1
          LIMIT 1
          `,
          [staffId]
        ),
        query(
          `
          SELECT
            session_id,
            login_at,
            last_seen_at,
            ip_address,
            user_agent,
            revoked_at,
            revoked_reason
          FROM doctor_security_sessions
          WHERE doctor_id = $1
          ORDER BY login_at DESC
          LIMIT 100
          `,
          [staffId]
        ),
      ]);

      const doctor = doctorResult.rows[0];
      if (!doctor) {
        return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
      }

      return NextResponse.json({
        staff: {
          account_type: "doctor",
          staff_id: Number(doctor.doctor_id),
          user_code: String(doctor.user_code),
          name: String(doctor.name),
          role: String(doctor.role),
          employment_status: String(doctor.employment_status ?? "active"),
          failed_login_attempts: Number(doctor.failed_login_attempts ?? 0),
          account_locked_until: doctor.account_locked_until ?? null,
          last_login_at: doctor.last_login_at ?? null,
          mfa_enabled: Boolean(doctor.mfa_enabled ?? false),
          session_version: Number(doctor.session_version ?? 1),
        },
        sessions: sessionsResult.rows,
      });
    }

    const [staffResult, sessionsResult] = await Promise.all([
      query(
        `
        SELECT
          staff_id,
          user_code,
          name,
          role,
          employment_status,
          failed_login_attempts,
          account_locked_until,
          last_login_at,
          mfa_enabled,
          session_version
        FROM staff
        WHERE staff_id = $1
        LIMIT 1
        `,
        [staffId]
      ),
      query(
        `
        SELECT
          session_id,
          login_at,
          last_seen_at,
          ip_address,
          user_agent,
          revoked_at,
          revoked_reason
        FROM staff_security_sessions
        WHERE staff_id = $1
        ORDER BY login_at DESC
        LIMIT 100
        `,
        [staffId]
      ),
    ]);

    if (!staffResult.rows[0]) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    return NextResponse.json({
      staff: {
        account_type: "staff",
        ...staffResult.rows[0],
      },
      sessions: sessionsResult.rows,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff security GET error", error);
    return NextResponse.json({ error: "Failed to load security data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAdminOrSuperAdmin(req);
    const body = await req.json();
    const staffId = Number(body?.staff_id ?? 0);
    const accountType = body?.account_type === "doctor" ? "doctor" : "staff";
    const action = String(body?.action ?? "");
    const reason = body?.reason ? String(body.reason) : null;
    const lockMinutes = Number(body?.lock_minutes ?? 30);

    if (!staffId || !action) {
      return NextResponse.json({ error: "staff_id and action are required" }, { status: 400 });
    }

    if (accountType === "doctor") {
      const doctorResult = await query(
        "SELECT doctor_id, user_code, doctor_name AS name, 'Doctor'::text AS role FROM doctor WHERE doctor_id = $1 LIMIT 1",
        [staffId]
      );
      const targetDoctor = doctorResult.rows[0];
      if (!targetDoctor) {
        return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
      }

      if (action === "reset_password") {
        const plainPassword = body?.new_password ? String(body.new_password) : makeTempPassword();
        await query(
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
          [staffId, hashPassword(plainPassword)]
        );
        await query(
          `
          UPDATE doctor_security_sessions
          SET revoked_at = CURRENT_TIMESTAMP,
              revoked_reason = 'password_reset'
          WHERE doctor_id = $1
            AND revoked_at IS NULL
          `,
          [staffId]
        );

        await logAuditEvent({
          actorUserCode: actor.user_code,
          action: "Doctor password reset by admin",
          entityType: "doctor_security",
          entityId: staffId,
          details: {
            doctorId: staffId,
            targetUserCode: targetDoctor.user_code,
            reason,
            generatedPassword: !body?.new_password,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Doctor password reset successful",
          temp_password: body?.new_password ? undefined : plainPassword,
        });
      }

      if (action === "lock_account") {
        const lockedUntil = new Date(Date.now() + Math.max(1, lockMinutes) * 60_000);
        await query(
          `
          UPDATE doctor
          SET account_locked_until = $2,
              employment_status = CASE
                WHEN employment_status = 'resigned' THEN employment_status
                ELSE 'suspended'
              END
          WHERE doctor_id = $1
          `,
          [staffId, lockedUntil]
        );
        await logAuditEvent({
          actorUserCode: actor.user_code,
          action: "Doctor account locked",
          entityType: "doctor_security",
          entityId: staffId,
          details: {
            doctorId: staffId,
            targetUserCode: targetDoctor.user_code,
            lockedUntil: lockedUntil.toISOString(),
            reason,
          },
        });
        return NextResponse.json({ success: true, locked_until: lockedUntil.toISOString() });
      }

      if (action === "unlock_account") {
        await query(
          `
          UPDATE doctor
          SET account_locked_until = NULL,
              failed_login_attempts = 0,
              employment_status = CASE
                WHEN employment_status = 'suspended' THEN 'active'
                ELSE employment_status
              END
          WHERE doctor_id = $1
          `,
          [staffId]
        );
        await logAuditEvent({
          actorUserCode: actor.user_code,
          action: "Doctor account unlocked",
          entityType: "doctor_security",
          entityId: staffId,
          details: {
            doctorId: staffId,
            targetUserCode: targetDoctor.user_code,
            reason,
          },
        });
        return NextResponse.json({ success: true });
      }

      if (action === "force_logout") {
        await query(
          `
          UPDATE doctor
          SET session_version = session_version + 1
          WHERE doctor_id = $1
          `,
          [staffId]
        );
        await query(
          `
          UPDATE doctor_security_sessions
          SET revoked_at = CURRENT_TIMESTAMP,
              revoked_reason = COALESCE($2, 'forced_logout')
          WHERE doctor_id = $1
            AND revoked_at IS NULL
          `,
          [staffId, reason]
        );
        await logAuditEvent({
          actorUserCode: actor.user_code,
          action: "Doctor forced logout",
          entityType: "doctor_security",
          entityId: staffId,
          details: {
            doctorId: staffId,
            targetUserCode: targetDoctor.user_code,
            reason,
          },
        });
        return NextResponse.json({ success: true });
      }

      if (action === "issue_reset_token") {
        const token = randomBytes(24).toString("hex");
        const expiresAt = new Date(Date.now() + MINUTES_30);
        await query(
          `
          UPDATE doctor
          SET password_reset_token = $2,
              password_reset_expires_at = $3
          WHERE doctor_id = $1
          `,
          [staffId, token, expiresAt]
        );
        await logAuditEvent({
          actorUserCode: actor.user_code,
          action: "Doctor password reset token issued",
          entityType: "doctor_security",
          entityId: staffId,
          details: {
            doctorId: staffId,
            targetUserCode: targetDoctor.user_code,
            expiresAt: expiresAt.toISOString(),
            reason,
          },
        });
        return NextResponse.json({
          success: true,
          reset_token: token,
          expires_at: expiresAt.toISOString(),
        });
      }

      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }

    const staffResult = await query("SELECT staff_id, user_code, name, role FROM staff WHERE staff_id = $1 LIMIT 1", [staffId]);
    const target = staffResult.rows[0];
    if (!target) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    if (action === "reset_password") {
      const plainPassword = body?.new_password ? String(body.new_password) : makeTempPassword();
      await query(
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
        [staffId, hashPassword(plainPassword)]
      );

      await query(
        `
        UPDATE staff_security_sessions
        SET revoked_at = CURRENT_TIMESTAMP,
            revoked_reason = 'password_reset'
        WHERE staff_id = $1
          AND revoked_at IS NULL
        `,
        [staffId]
      );

      await logAuditEvent({
        actorUserCode: actor.user_code,
        action: "Password reset by admin",
        entityType: "staff_security",
        entityId: staffId,
        details: {
          staffId,
          targetUserCode: target.user_code,
          reason,
          generatedPassword: !body?.new_password,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Password reset successful",
        temp_password: body?.new_password ? undefined : plainPassword,
      });
    }

    if (action === "lock_account") {
      const lockedUntil = new Date(Date.now() + Math.max(1, lockMinutes) * 60_000);
      await query(
        `
        UPDATE staff
        SET account_locked_until = $2,
            employment_status = CASE
              WHEN employment_status = 'resigned' THEN employment_status
              ELSE 'suspended'
            END
        WHERE staff_id = $1
        `,
        [staffId, lockedUntil]
      );

      await logAuditEvent({
        actorUserCode: actor.user_code,
        action: "Account locked",
        entityType: "staff_security",
        entityId: staffId,
        details: {
          staffId,
          targetUserCode: target.user_code,
          lockedUntil: lockedUntil.toISOString(),
          reason,
        },
      });

      return NextResponse.json({ success: true, locked_until: lockedUntil.toISOString() });
    }

    if (action === "unlock_account") {
      await query(
        `
        UPDATE staff
        SET account_locked_until = NULL,
            failed_login_attempts = 0,
            employment_status = CASE
              WHEN employment_status = 'suspended' THEN 'active'
              ELSE employment_status
            END
        WHERE staff_id = $1
        `,
        [staffId]
      );

      await logAuditEvent({
        actorUserCode: actor.user_code,
        action: "Account unlocked",
        entityType: "staff_security",
        entityId: staffId,
        details: {
          staffId,
          targetUserCode: target.user_code,
          reason,
        },
      });

      return NextResponse.json({ success: true });
    }

    if (action === "force_logout") {
      await query(
        `
        UPDATE staff
        SET session_version = session_version + 1
        WHERE staff_id = $1
        `,
        [staffId]
      );
      await query(
        `
        UPDATE staff_security_sessions
        SET revoked_at = CURRENT_TIMESTAMP,
            revoked_reason = COALESCE($2, 'forced_logout')
        WHERE staff_id = $1
          AND revoked_at IS NULL
        `,
        [staffId, reason]
      );

      await logAuditEvent({
        actorUserCode: actor.user_code,
        action: "Forced logout",
        entityType: "staff_security",
        entityId: staffId,
        details: {
          staffId,
          targetUserCode: target.user_code,
          reason,
        },
      });

      return NextResponse.json({ success: true });
    }

    if (action === "issue_reset_token") {
      const token = randomBytes(24).toString("hex");
      const expiresAt = new Date(Date.now() + MINUTES_30);
      await query(
        `
        UPDATE staff
        SET password_reset_token = $2,
            password_reset_expires_at = $3
        WHERE staff_id = $1
        `,
        [staffId, token, expiresAt]
      );

      await logAuditEvent({
        actorUserCode: actor.user_code,
        action: "Password reset token issued",
        entityType: "staff_security",
        entityId: staffId,
        details: {
          staffId,
          targetUserCode: target.user_code,
          expiresAt: expiresAt.toISOString(),
          reason,
        },
      });

      return NextResponse.json({
        success: true,
        reset_token: token,
        expires_at: expiresAt.toISOString(),
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff security POST error", error);
    return NextResponse.json({ error: "Failed to update staff security state" }, { status: 500 });
  }
}
