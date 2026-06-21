import pool from "@/database/db";
import { getAuthenticatedDoctor } from "@/src/lib/server/doctor";
import {
  ensureDoctorLabOrderWriteAccess,
  resolveDoctorVisit,
} from "@/src/lib/server/doctorWorkspace";
import { NextRequest, NextResponse } from "next/server";

type LabOrderPayload = {
  test_id: string | number;
  urgency?: string;
};

function getDoctorRouteErrorStatus(message: string) {
  if (message === "Not authenticated") {
    return 401;
  }

  if (message.includes("not found")) {
    return 404;
  }

  if (message.includes("no longer actionable")) {
    return 409;
  }

  return 403;
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();

  try {
    const doctor = await getAuthenticatedDoctor(req);
    const { patient_id, visit_id, tests } = await req.json();

    if (!patient_id || !visit_id || !Array.isArray(tests) || tests.length === 0) {
      return NextResponse.json({ error: "Invalid lab order payload" }, { status: 400 });
    }

    await client.query("BEGIN");

    const visit = await resolveDoctorVisit(client, {
      visitId: Number(visit_id),
      patientId: Number(patient_id),
      doctorId: doctor.doctor_id,
      lock: true,
    });

    if (!visit) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Selected visit was not found for this doctor and patient" },
        { status: 404 }
      );
    }

    ensureDoctorLabOrderWriteAccess(String(visit.status));
    const visitId = Number(visit.visit_id);
    const patientId = Number(visit.patient_id ?? patient_id);
    const seenTestIds = new Set<number>();
    const insertedOrders = [];
    // Ordered tests are charged to the visit's bill at order time (PK cash-clinic
    // norm: lab is paid upfront). We accumulate (order_id, name, price) here and
    // post them to the bill in one locked write after the orders are inserted.
    const labCharges: Array<{ orderId: number; testName: string; price: number }> = [];

    for (const test of tests as LabOrderPayload[]) {
      const testId = Number(test.test_id);

      if (!testId) {
        throw new Error("Each lab order row must include a valid test_id");
      }

      if (seenTestIds.has(testId)) {
        throw new Error("Duplicate tests are not allowed in one lab order submit");
      }

      seenTestIds.add(testId);

      const orderResult = await client.query(
        `
          insert into lab_order (visit_id, test_id, ordered_by, status, urgency)
          values ($1, $2, $3, $4, $5)
          returning *
        `,
        [
          visitId,
          testId,
          doctor.doctor_id,
          "Pending",
          test.urgency ?? "Routine",
        ]
      );

      const order = orderResult.rows[0];
      insertedOrders.push(order);

      // Price the test for billing. Priced separately from the catalog so a
      // mid-session price edit can't desync the charge from the order.
      const priceResult = await client.query(
        `select test_name, price from lab_test where test_id = $1 limit 1`,
        [testId]
      );
      const testRow = priceResult.rows[0];
      const price = Number(testRow?.price ?? 0);
      if (testRow && Number.isFinite(price) && price > 0) {
        labCharges.push({
          orderId: Number(order.order_id),
          testName: String(testRow.test_name ?? `Lab test #${testId}`),
          price,
        });
      }
    }

    // ─── Bill the ordered tests ────────────────────────────────────────────
    // Generic charge model: each lab test becomes a bill_item + a
    // bill_charge_source(source_type='lab'). The cashier settles at bill level
    // (paid = SUM(cashier_payment_txn) vs bill.total_amount), so no allocation
    // change is needed — a lab-only bill is fully collectable and surfaces in the
    // worklist automatically. Mirrors the pharmacy append-to-bill path.
    if (labCharges.length > 0) {
      // Find-or-create the visit's bill and lock its row, serializing against
      // cashier settle (which holds the bill FOR UPDATE) per the documented
      // concurrency model.
      let billId: number | null = null;
      const billLookup = await client.query(
        `select bill_id from bill where visit_id = $1 order by bill_id asc limit 1 for update`,
        [visitId]
      );
      if (billLookup.rows.length > 0) {
        billId = Number(billLookup.rows[0].bill_id);
      } else {
        const billInsert = await client.query(
          `insert into bill (patient_id, visit_id, total_amount, payment_status) values ($1, $2, 0, 'Unpaid') returning bill_id`,
          [patientId, visitId]
        );
        billId = Number(billInsert.rows[0].bill_id);
      }

      let chargeTotal = 0;
      for (const charge of labCharges) {
        const itemResult = await client.query(
          `insert into bill_item (bill_id, description, amount, quantity) values ($1, $2, $3, 1) returning item_id`,
          [billId, `Lab: ${charge.testName}`, charge.price]
        );
        const billItemId = Number(itemResult.rows[0]?.item_id) || null;
        await client.query(
          `
            insert into bill_charge_source (bill_id, bill_item_id, source_type, source_id, amount, meta_json, created_by)
            values ($1, $2, 'lab', $3, $4, $5::jsonb, null)
          `,
          [
            billId,
            billItemId,
            charge.orderId,
            charge.price,
            JSON.stringify({
              orderId: charge.orderId,
              testName: charge.testName,
              orderedByDoctor: doctor.doctor_id,
            }),
          ]
        );
        chargeTotal += charge.price;
      }

      // Single atomic update: grow the total and recompute payment_status from
      // the live payment ledger (reversals net out via SUM), exactly as the
      // pharmacy append path does, so a charge added to an already-paid bill
      // doesn't discard prior payments.
      await client.query(
        `
          update bill
          set total_amount = COALESCE(total_amount, 0) + $2,
              payment_status = CASE
                WHEN (COALESCE(total_amount, 0) + $2) <= (SELECT COALESCE(SUM(cpt.amount), 0) FROM cashier_payment_txn cpt WHERE cpt.bill_id = bill.bill_id) THEN 'Paid'
                WHEN (SELECT COALESCE(SUM(cpt.amount), 0) FROM cashier_payment_txn cpt WHERE cpt.bill_id = bill.bill_id) > 0 THEN 'Partial'
                ELSE 'Unpaid'
              END
          where bill_id = $1
        `,
        [billId, chargeTotal]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json(
      { visit_id: visitId, orders: insertedOrders },
      { status: 201 }
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to create lab orders";
    const status = getDoctorRouteErrorStatus(message);
    return NextResponse.json({ error: message }, { status });
  } finally {
    client.release();
  }
}
