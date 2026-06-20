import pool from "@/database/db";
import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { logAuditEvent } from "@/src/lib/server/audit";
import { hashPassword, isPasswordHash, verifyPassword } from "@/src/lib/server/password";

import { JWT_SECRET as secret } from "@/src/lib/server/jwtSecret";
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function getRequestMeta(req: NextRequest) {
   return {
      ip:
         req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
         req.headers.get("x-real-ip") ||
         null,
      userAgent: req.headers.get("user-agent") || null,
   };
}

export async function POST(req: NextRequest) {
   const body = await req.json();
   const userCodeInput = String(body?.user_code ?? "").trim().toUpperCase();
   const passwordInput = String(body?.password ?? "");
   const client = await pool.connect();
   const requestMeta = getRequestMeta(req);
   try {
      if (!userCodeInput || !passwordInput) {
         return NextResponse.json({ error: "User code and password are required" }, { status: 400 });
      }

      if (userCodeInput.includes("DOC")) {
         const doctorRes = await client.query(
            `
            select
              doctor_id,
              user_code,
              doctor_name as name,
              password,
              employment_status,
              failed_login_attempts,
              account_locked_until,
              session_version
            from doctor
            where user_code = $1
            limit 1
            `,
            [userCodeInput]
         );

         if (doctorRes.rows.length === 0) {
            await logAuditEvent(
               {
                  action: "Login failed",
                  entityType: "auth",
                  entityId: userCodeInput || null,
                  details: {
                     userCode: userCodeInput || null,
                     userName: null,
                     outcome: "failed",
                     reason: "Invalid Credentials",
                     ...requestMeta,
                  },
               },
               client
            );
            return NextResponse.json({ error: "Invalid Credentials" }, { status: 401 });
         }

         const doctor = doctorRes.rows[0];
         const now = new Date();
         const lockedUntil = doctor.account_locked_until ? new Date(doctor.account_locked_until) : null;

         if (lockedUntil && lockedUntil.getTime() > now.getTime()) {
            await logAuditEvent(
               {
                  actorUserCode: doctor.user_code,
                  action: "Login blocked",
                  entityType: "auth",
                  entityId: doctor.user_code,
                  details: {
                     userCode: doctor.user_code,
                     userName: doctor.name,
                     role: "Doctor",
                     outcome: "failed",
                     reason: "Account temporarily locked",
                     accountLockedUntil: lockedUntil.toISOString(),
                     ...requestMeta,
                  },
               },
               client
            );
            return NextResponse.json({ error: "Account temporarily locked. Try again later." }, { status: 423 });
         }

         if (String(doctor.employment_status ?? "active").toLowerCase() !== "active") {
            await logAuditEvent(
               {
                  actorUserCode: doctor.user_code,
                  action: "Login blocked",
                  entityType: "auth",
                  entityId: doctor.user_code,
                  details: {
                     userCode: doctor.user_code,
                     userName: doctor.name,
                     role: "Doctor",
                     outcome: "failed",
                     reason: "Employment status not active",
                     employmentStatus: doctor.employment_status,
                     ...requestMeta,
                  },
               },
               client
            );
            return NextResponse.json({ error: "Account is not active." }, { status: 403 });
         }

         const passwordOk = verifyPassword(passwordInput, String(doctor.password ?? ""));
         if (!passwordOk) {
            const failedAttempts = Number(doctor.failed_login_attempts ?? 0) + 1;
            const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;
            const lockUntil = shouldLock ? new Date(now.getTime() + LOCK_MINUTES * 60_000) : null;
            await client.query(
               `
               update doctor
               set failed_login_attempts = $2,
                   last_failed_login_at = current_timestamp,
                   account_locked_until = $3
               where doctor_id = $1
               `,
               [doctor.doctor_id, failedAttempts, lockUntil]
            );
            await logAuditEvent(
               {
                  actorUserCode: doctor.user_code,
                  action: "Login failed",
                  entityType: "auth",
                  entityId: doctor.user_code,
                  details: {
                     userCode: doctor.user_code,
                     userName: doctor.name,
                     role: "Doctor",
                     outcome: "failed",
                     reason: shouldLock ? "Account locked due to repeated failed attempts" : "Invalid Credentials",
                     failedAttempts,
                     accountLockedUntil: lockUntil?.toISOString() ?? null,
                     ...requestMeta,
                  },
               },
               client
            );
            return NextResponse.json({ error: "Invalid Credentials" }, { status: 401 });
         }

         const sessionInsert = await client.query(
            `
            insert into doctor_security_sessions (doctor_id, user_code, role, ip_address, user_agent)
            values ($1, $2, 'Doctor', $3, $4)
            returning session_id
            `,
            [doctor.doctor_id, doctor.user_code, requestMeta.ip, requestMeta.userAgent]
         );
         const sessionId = sessionInsert.rows[0]?.session_id;

         await client.query(
            `
            update doctor
            set failed_login_attempts = 0,
                account_locked_until = null,
                last_login_at = current_timestamp
            where doctor_id = $1
            `,
            [doctor.doctor_id]
         );

         if (!isPasswordHash(String(doctor.password ?? ""))) {
            await client.query(
               "update doctor set password = $2, password_changed_at = current_timestamp where doctor_id = $1",
               [doctor.doctor_id, hashPassword(passwordInput)]
            );
         }

         const token = await new SignJWT({
            user_code: doctor.user_code,
            role: "Doctor",
            name: doctor.name,
            sid: sessionId ?? null,
            sv: Number(doctor.session_version ?? 1),
            account_type: "doctor",
         })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("8h")
            .sign(secret);

         const response = NextResponse.json({ success: true, role: "Doctor" }, { status: 200 });
         response.cookies.set("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            maxAge: 60 * 60 * 8,
            path: "/",
         });

         await logAuditEvent(
            {
               actorUserCode: doctor.user_code,
               action: "Login success",
               entityType: "auth",
               entityId: doctor.user_code,
               details: {
                  userCode: doctor.user_code,
                  userName: doctor.name,
                  role: "Doctor",
                  outcome: "success",
                  ...requestMeta,
               },
            },
            client
         );
         return response;
      }

      const staffRes = await client.query(
         `
         select
            staff_id,
            user_code,
            name,
            role,
            password,
            employment_status,
            failed_login_attempts,
            account_locked_until,
            session_version
         from staff
         where user_code = $1
         limit 1
         `,
         [userCodeInput]
      );

      if (staffRes.rows.length === 0) {
         await logAuditEvent(
            {
               action: "Login failed",
               entityType: "auth",
               entityId: userCodeInput || null,
               details: {
                  userCode: userCodeInput || null,
                  userName: null,
                  outcome: "failed",
                  reason: "Invalid Credentials",
                  ...requestMeta,
               },
            },
            client
         );
         return NextResponse.json({ error: "Invalid Credentials" }, { status: 401 });
      }

      const user = staffRes.rows[0];
      const now = new Date();
      const lockedUntil = user.account_locked_until ? new Date(user.account_locked_until) : null;

      if (lockedUntil && lockedUntil.getTime() > now.getTime()) {
         await logAuditEvent(
            {
               actorUserCode: user.user_code,
               action: "Login blocked",
               entityType: "auth",
               entityId: user.user_code,
               details: {
                  userCode: user.user_code,
                  userName: user.name,
                  role: user.role,
                  outcome: "failed",
                  reason: "Account temporarily locked",
                  accountLockedUntil: lockedUntil.toISOString(),
                  ...requestMeta,
               },
            },
            client
         );
         return NextResponse.json({ error: "Account temporarily locked. Try again later." }, { status: 423 });
      }

      if (String(user.employment_status ?? "active").toLowerCase() !== "active") {
         await logAuditEvent(
            {
               actorUserCode: user.user_code,
               action: "Login blocked",
               entityType: "auth",
               entityId: user.user_code,
               details: {
                  userCode: user.user_code,
                  userName: user.name,
                  role: user.role,
                  outcome: "failed",
                  reason: "Employment status not active",
                  employmentStatus: user.employment_status,
                  ...requestMeta,
               },
            },
            client
         );
         return NextResponse.json({ error: "Account is not active." }, { status: 403 });
      }

      const passwordOk = verifyPassword(passwordInput, String(user.password ?? ""));
      if (!passwordOk) {
         const failedAttempts = Number(user.failed_login_attempts ?? 0) + 1;
         const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;
         const lockUntil = shouldLock ? new Date(now.getTime() + LOCK_MINUTES * 60_000) : null;
         await client.query(
            `
            update staff
            set failed_login_attempts = $2,
                last_failed_login_at = current_timestamp,
                account_locked_until = $3
            where staff_id = $1
            `,
            [user.staff_id, failedAttempts, lockUntil]
         );
         await logAuditEvent(
            {
               actorUserCode: user.user_code,
               action: "Login failed",
               entityType: "auth",
               entityId: user.user_code,
               details: {
                  userCode: user.user_code,
                  userName: user.name,
                  role: user.role,
                  outcome: "failed",
                  reason: shouldLock ? "Account locked due to repeated failed attempts" : "Invalid Credentials",
                  failedAttempts,
                  accountLockedUntil: lockUntil?.toISOString() ?? null,
                  ...requestMeta,
               },
            },
            client
         );
         return NextResponse.json({ error: "Invalid Credentials" }, { status: 401 });
      }

      const sessionInsert = await client.query(
         `
         insert into staff_security_sessions (staff_id, user_code, role, ip_address, user_agent)
         values ($1, $2, $3, $4, $5)
         returning session_id
         `,
         [user.staff_id, user.user_code, user.role, requestMeta.ip, requestMeta.userAgent]
      );
      const sessionId = sessionInsert.rows[0]?.session_id;

      await client.query(
         `
         update staff
         set failed_login_attempts = 0,
             account_locked_until = null,
             last_login_at = current_timestamp
         where staff_id = $1
         `,
         [user.staff_id]
      );

      if (!isPasswordHash(String(user.password ?? ""))) {
         await client.query(
            "update staff set password = $2, password_changed_at = current_timestamp where staff_id = $1",
            [user.staff_id, hashPassword(passwordInput)]
         );
      }

      const token = await new SignJWT({
         user_code: user.user_code,
         role: user.role,
         name: user.name,
         sid: sessionId ?? null,
         sv: Number(user.session_version ?? 1),
         account_type: "staff",
      })
         .setProtectedHeader({ alg: "HS256" })
         .setExpirationTime("8h")
         .sign(secret);
      const response = NextResponse.json({ success: true, role: user.role }, { status: 200 });
      response.cookies.set("token", token, {
         httpOnly: true,
         secure: true,
         sameSite: "lax",
         maxAge: 60 * 60 * 8,
         path: "/",
      })

      await logAuditEvent(
         {
            actorUserCode: user.user_code,
            action: "Login success",
            entityType: "auth",
            entityId: user.user_code,
            details: {
               userCode: user.user_code,
               userName: user.name,
               role: user.role,
               outcome: "success",
               ...requestMeta,
            },
         },
         client
      );
      return response;
   }
   catch (err) {
      console.error(err);
      return NextResponse.json({ error: "Server Error" }, { status: 500 });
   }
   finally {
      client.release();
   }
}
