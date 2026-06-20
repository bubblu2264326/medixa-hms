import { query } from "@/database/db";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        await getAuthenticatedUser(req);
        const data = await req.json();

        const res = await query(
            `INSERT INTO patient(patient_name, age, gender, contact_number, cnic, address)
       VALUES($1, $2, $3, $4, $5, $6)
       RETURNING patient_id`,
            [data.patient_name, parseInt(data.age), data.gender, data.contact_number, data.cnic, data.address]
        );

        const newPatientId = res.rows[0].patient_id;
        return NextResponse.json({ message: "Patient Added Successfully", patient_id: newPatientId }, { status: 200 });
    } catch (err) {
        if (err instanceof AuthError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        console.error(err);
        return NextResponse.json({ error: "Failed to add patient" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        await getAuthenticatedUser(req);
        const res = await query("SELECT * FROM patient");
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
        await getAuthenticatedUser(req);
        const data = await req.json();

        if (!data.patient_id) {
            return NextResponse.json({ error: "Patient ID is required for update" }, { status: 400 });
        }

        const res = await query(
            `UPDATE patient
       SET patient_name = $1, age = $2, gender = $3, contact_number = $4, cnic = $5, address = $6
       WHERE patient_id = $7
       RETURNING patient_id`,
            [data.patient_name, parseInt(data.age), data.gender, data.contact_number, data.cnic, data.address, data.patient_id]
        );

        if (res.rows.length === 0) {
            return NextResponse.json({ error: "Patient not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Patient Updated Successfully", patient_id: res.rows[0].patient_id }, { status: 200 });
    } catch (err) {
        if (err instanceof AuthError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        console.error(err);
        return NextResponse.json({ error: "Failed to update patient" }, { status: 500 });
    }
}
