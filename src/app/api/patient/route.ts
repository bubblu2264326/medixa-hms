import { query } from "@/database/db";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { logAuditEvent } from "@/src/lib/server/audit";
import { patientCreateSchema, patientUpdateSchema } from "@/src/lib/server/validation/patient";
import { NextRequest, NextResponse } from "next/server";

const PATIENT_COLUMNS =
  "patient_id, patient_name, age, gender, contact_number, cnic, address, created_at";

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser(req);

        const parsed = patientCreateSchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid patient data", issues: parsed.error.flatten() },
                { status: 400 }
            );
        }
        const data = parsed.data;

        const res = await query(
            `INSERT INTO patient(patient_name, age, gender, contact_number, cnic, address)
       VALUES($1, $2, $3, $4, $5, $6)
       RETURNING patient_id`,
            [
                data.patient_name,
                data.age ?? null,
                data.gender ?? null,
                data.contact_number ?? null,
                data.cnic ?? null,
                data.address ?? null,
            ]
        );

        const newPatientId = res.rows[0].patient_id;
        await logAuditEvent({
            actorUserCode: user.user_code,
            action: "patient.create",
            entityType: "patient",
            entityId: newPatientId,
            details: { patient_name: data.patient_name },
        });
        return NextResponse.json({ message: "Patient Added Successfully", patient_id: newPatientId }, { status: 200 });
    } catch (err) {
        if (err instanceof AuthError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        if ((err as { code?: string })?.code === "23505") {
            return NextResponse.json({ error: "A patient with this CNIC already exists" }, { status: 409 });
        }
        console.error(err);
        return NextResponse.json({ error: "Failed to add patient" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        await getAuthenticatedUser(req);
        const res = await query(`SELECT ${PATIENT_COLUMNS} FROM patient`);
        return NextResponse.json(res.rows, { status: 200 });
    } catch (err) {
        if (err instanceof AuthError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        console.error(err);
        return NextResponse.json({ error: "Failed to fetch all patients" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser(req);

        const parsed = patientUpdateSchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid patient data", issues: parsed.error.flatten() },
                { status: 400 }
            );
        }
        const data = parsed.data;

        const res = await query(
            `UPDATE patient
       SET patient_name = $1, age = $2, gender = $3, contact_number = $4, cnic = $5, address = $6
       WHERE patient_id = $7
       RETURNING patient_id`,
            [
                data.patient_name,
                data.age ?? null,
                data.gender ?? null,
                data.contact_number ?? null,
                data.cnic ?? null,
                data.address ?? null,
                data.patient_id,
            ]
        );

        if (res.rows.length === 0) {
            return NextResponse.json({ error: "Patient not found" }, { status: 404 });
        }

        await logAuditEvent({
            actorUserCode: user.user_code,
            action: "patient.update",
            entityType: "patient",
            entityId: data.patient_id,
            details: { patient_name: data.patient_name },
        });
        return NextResponse.json({ message: "Patient Updated Successfully", patient_id: res.rows[0].patient_id }, { status: 200 });
    } catch (err) {
        if (err instanceof AuthError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        if ((err as { code?: string })?.code === "23505") {
            return NextResponse.json({ error: "A patient with this CNIC already exists" }, { status: 409 });
        }
        console.error(err);
        return NextResponse.json({ error: "Failed to update patient" }, { status: 500 });
    }
}
