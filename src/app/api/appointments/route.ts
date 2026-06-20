import { NextRequest, NextResponse } from "next/server";
import pool, { query } from "@/database/db";
import type { PoolClient } from "pg";
import { AuthError, getAuthenticatedUser, requireRoles } from "@/src/lib/server/auth";
import { resolveActorStaffId } from "@/src/lib/server/actor";
import { logAuditEvent } from "@/src/lib/server/audit";
import { enqueueNotification } from "@/src/lib/server/notifications";

const BOOK_ROLES = ["admin", "super_admin", "receptionist", "front_desk", "doctor"];

// GET /api/appointments?doctor_id=&date=YYYY-MM-DD&patient_id=&status=
export async function GET(req: NextRequest) {
  try {
    await getAuthenticatedUser(req);
    const sp = new URL(req.url).searchParams;
    const params: any[] = [];
    let where = "WHERE 1=1";
    const doctorId = Number(sp.get("doctor_id") ?? 0);
    const patientId = Number(sp.get("patient_id") ?? 0);
    const date = sp.get("date");
    const status = sp.get("status");
    if (doctorId) { params.push(doctorId); where += ` AND a.doctor_id = $${params.length}`; }
    if (patientId) { params.push(patientId); where += ` AND a.patient_id = $${params.length}`; }
    if (date) { params.push(date); where += ` AND a.scheduled_at::date = $${params.length}`; }
    if (status) { params.push(status); where += ` AND a.status = $${params.length}`; }

    const res = await query(
      `SELECT a.appointment_id, a.patient_id, p.patient_name, a.doctor_id, d.doctor_name,
              a.scheduled_at, a.duration_min, a.status, a.reason, a.visit_id
       FROM appointment a
       JOIN patient p ON p.patient_id = a.patient_id
       JOIN doctor d ON d.doctor_id = a.doctor_id
       ${where}
       ORDER BY a.scheduled_at ASC`,
      params
    );
    return NextResponse.json(res.rows, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("appointments GET error", err);
    return NextResponse.json({ error: "Failed to load appointments" }, { status: 500 });
  }
}

// POST /api/appointments — book a slot.
export async function POST(req: NextRequest) {
  let client: PoolClient | undefined;
  try {
    await requireRoles(req, BOOK_ROLES);
    const body = await req.json();
    const patientId = Number(body?.patient_id ?? 0);
    const doctorId = Number(body?.doctor_id ?? 0);
    const scheduledAt = String(body?.scheduled_at ?? "").trim();
    if (!patientId || !doctorId || !scheduledAt) {
      return NextResponse.json({ error: "patient_id, doctor_id and scheduled_at are required" }, { status: 400 });
    }
    client = await pool.connect();
    const staffId = await resolveActorStaffId(req, client);
    const inserted = await client.query(
      `INSERT INTO appointment (patient_id, doctor_id, scheduled_at, duration_min, reason, created_by)
       VALUES ($1, $2, $3, COALESCE($4, 15), $5, $6)
       RETURNING appointment_id, scheduled_at`,
      [patientId, doctorId, scheduledAt, body?.duration_min ?? null, body?.reason ?? null, staffId]
    );
    await logAuditEvent(
      {
        actorStaffId: staffId,
        action: "appointment.book",
        entityType: "appointment",
        entityId: inserted.rows[0].appointment_id,
        details: { patientId, doctorId, scheduledAt },
      },
      client
    );

    // best-effort: queue a WhatsApp reminder to the patient (no-op without a gateway)
    try {
      const pc = await client.query(`select contact_number from patient where patient_id = $1`, [patientId]);
      await enqueueNotification(client, {
        channel: "whatsapp",
        recipient: pc.rows[0]?.contact_number,
        template: "appointment_booked",
        payload: { appointment_id: inserted.rows[0].appointment_id, scheduled_at: scheduledAt, doctor_id: doctorId },
        relatedEntity: `appointment:${inserted.rows[0].appointment_id}`,
      });
    } catch (e) {
      console.warn("appointment reminder enqueue failed", e);
    }

    return NextResponse.json({ success: true, appointment_id: inserted.rows[0].appointment_id }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    if ((err as { code?: string })?.code === "23505") {
      return NextResponse.json({ error: "That doctor already has an appointment at this time" }, { status: 409 });
    }
    console.error("appointments POST error", err);
    return NextResponse.json({ error: "Failed to book appointment" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
