import { NextRequest, NextResponse } from "next/server";
import type { PoolClient } from "pg";
import pool from "@/database/db";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { resolveActorStaffId } from "@/src/lib/server/actor";
import { logAuditEvent } from "@/src/lib/server/audit";
import { purchaseReturnSchema } from "@/src/lib/server/validation/pharmacy";

export async function POST(req: NextRequest) {
    let client: PoolClient | undefined;
    try {
        await getAuthenticatedUser(req);

        const parsed = purchaseReturnSchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid purchase return data", issues: parsed.error.flatten() },
                { status: 400 }
            );
        }
        const { purchase_id, reason, items } = parsed.data;

        // Real transaction on a single dedicated connection. (Previously BEGIN/
        // COMMIT/ROLLBACK ran through the pooled `query()` helper on arbitrary
        // connections, so detail inserts — which fire the stock-reducing trigger
        // tg_purchase_return_detail_to_txn — could autocommit while the BEGIN sat
        // idle on another connection: a failure left partial stock decrements
        // permanently committed. Audit C1.)
        client = await pool.connect();
        try {
            await client.query("BEGIN");

            // Actor is the authenticated staff member, not a body-supplied id.
            const staffId = await resolveActorStaffId(req, client);

            const headerResult = await client.query(
                `INSERT INTO purchase_return (purchase_id, reason, created_by)
                 VALUES ($1, $2, $3)
                 RETURNING return_id`,
                [purchase_id, reason ?? null, staffId]
            );
            const returnId = headerResult.rows[0].return_id;

            // DB trigger tg_purchase_return_detail_to_txn handles stock reduction.
            const detailSql = `
                INSERT INTO purchase_return_detail (
                    return_id, medicine_id, batch_id, quantity, sub_quantity, returned_unit_price
                ) VALUES ($1, $2, $3, $4, $5, $6)`;
            for (const item of items) {
                await client.query(detailSql, [
                    returnId,
                    item.medicine_id,
                    item.batch_id,
                    item.quantity,
                    item.sub_quantity ?? 0,
                    item.unit_cost ?? null,
                ]);
            }

            await logAuditEvent(
                {
                    actorStaffId: staffId,
                    action: "pharmacy.purchase_return",
                    entityType: "purchase_return",
                    entityId: returnId,
                    details: { purchase_id, item_count: items.length },
                },
                client
            );

            await client.query("COMMIT");
            return NextResponse.json({ success: true, returnId });
        } catch (txErr) {
            await client.query("ROLLBACK");
            throw txErr;
        }
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Process Purchase Return Error:", error);
        return NextResponse.json({ error: "Failed to process purchase return" }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}
