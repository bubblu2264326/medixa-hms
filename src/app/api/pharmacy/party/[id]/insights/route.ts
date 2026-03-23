import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { getAuthenticatedUser } from "@/src/lib/server/auth";

const toNumber = (value: unknown): number => Number(value ?? 0);

function normalizeDeadStockDays(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 30;
  return Math.min(365, Math.max(1, Math.round(parsed)));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let role = "";
  try {
    const user = await getAuthenticatedUser(request);
    role = user.role;
  } catch {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const partyId = Number(id);

  if (!Number.isFinite(partyId) || partyId <= 0) {
    return NextResponse.json(
      { success: false, error: "Invalid party id" },
      { status: 400 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const deadStockDays = normalizeDeadStockDays(searchParams.get("deadStockDays"));
  const canViewFinancials = role !== "Pharmacist";

  try {
    const operationalResult = await query(
      `
        WITH purchase_summary AS (
          SELECT
            COUNT(*)::integer AS purchase_count,
            COALESCE(SUM(mp.total_amount), 0)::numeric AS purchase_amount,
            MAX(mp.invoice_timestamp) AS last_purchase_date
          FROM medicine_purchase mp
          WHERE mp.party_id = $1
            AND ($2::date IS NULL OR mp.invoice_timestamp::date >= $2::date)
            AND ($3::date IS NULL OR mp.invoice_timestamp::date <= $3::date)
        ),
        item_summary AS (
          SELECT
            COUNT(DISTINCT mpd.medicine_id)::integer AS unique_products,
            COALESCE(SUM(mpd.quantity), 0)::integer AS total_units,
            COALESCE(SUM(mpd.sub_quantity), 0)::integer AS total_sub_units
          FROM medicine_purchase_detail mpd
          JOIN medicine_purchase mp ON mp.purchase_id = mpd.purchase_id
          WHERE mp.party_id = $1
            AND ($2::date IS NULL OR mp.invoice_timestamp::date >= $2::date)
            AND ($3::date IS NULL OR mp.invoice_timestamp::date <= $3::date)
        ),
        return_summary AS (
          SELECT
            COALESCE(SUM(
              (COALESCE(prd.returned_unit_price, 0) * COALESCE(prd.quantity, 0))
              + (COALESCE(prd.returned_sub_unit_price, 0) * COALESCE(prd.sub_quantity, 0))
            ), 0)::numeric AS return_amount
          FROM purchase_return_detail prd
          JOIN purchase_return pr ON pr.return_id = prd.return_id
          JOIN medicine_purchase mp ON mp.purchase_id = pr.purchase_id
          WHERE mp.party_id = $1
            AND ($2::date IS NULL OR pr.return_timestamp::date >= $2::date)
            AND ($3::date IS NULL OR pr.return_timestamp::date <= $3::date)
        ),
        payment_summary AS (
          SELECT COALESCE(SUM(pp.amount), 0)::numeric AS paid_amount
          FROM party_payment pp
          WHERE pp.party_id = $1
            AND ($2::date IS NULL OR pp.payment_date::date >= $2::date)
            AND ($3::date IS NULL OR pp.payment_date::date <= $3::date)
        )
        SELECT
          ps.purchase_count,
          ps.purchase_amount,
          ps.last_purchase_date,
          is1.unique_products,
          is1.total_units,
          is1.total_sub_units,
          rs.return_amount,
          pms.paid_amount
        FROM purchase_summary ps
        CROSS JOIN item_summary is1
        CROSS JOIN return_summary rs
        CROSS JOIN payment_summary pms
      `,
      [partyId, from, to]
    );

    const inventoryHealthResult = await query(
      `
        WITH supplier_batches AS (
          SELECT
            mb.batch_id,
            mb.medicine_id,
            mb.expiry_date,
            COALESCE(NULLIF(m.sub_units_per_unit, 0), 1) AS sub_units_per_unit,
            (
              COALESCE(mb.stock_quantity, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)
              + COALESCE(mb.stock_sub_quantity, 0)
            )::bigint AS stock_sub_units
          FROM medicine_batch mb
          JOIN medicine m ON m.medicine_id = mb.medicine_id
          WHERE mb.party_id = $1
        ),
        batch_last_sales AS (
          SELECT
            mt.batch_id,
            MAX(mt.created_at) FILTER (WHERE mt.txn_type = 'sale') AS last_sale_at
          FROM medicine_transaction mt
          GROUP BY mt.batch_id
        )
        SELECT
          COUNT(*) FILTER (
            WHERE sb.expiry_date IS NOT NULL
              AND sb.expiry_date < CURRENT_DATE
              AND sb.stock_sub_units > 0
          )::integer AS expired_batches_count,
          COALESCE(SUM(
            CASE
              WHEN sb.expiry_date IS NOT NULL
                AND sb.expiry_date < CURRENT_DATE
                AND sb.stock_sub_units > 0
              THEN sb.stock_sub_units::numeric / sb.sub_units_per_unit
              ELSE 0
            END
          ), 0)::numeric AS expired_stock_units,
          COUNT(*) FILTER (
            WHERE sb.stock_sub_units > 0
              AND (
                bls.last_sale_at IS NULL
                OR bls.last_sale_at < NOW() - make_interval(days => $2::integer)
              )
          )::integer AS dead_stock_batches,
          COALESCE(SUM(
            CASE
              WHEN sb.stock_sub_units > 0
                AND (
                  bls.last_sale_at IS NULL
                  OR bls.last_sale_at < NOW() - make_interval(days => $2::integer)
                )
              THEN sb.stock_sub_units::numeric / sb.sub_units_per_unit
              ELSE 0
            END
          ), 0)::numeric AS dead_stock_units
        FROM supplier_batches sb
        LEFT JOIN batch_last_sales bls ON bls.batch_id = sb.batch_id
      `,
      [partyId, deadStockDays]
    );

    const performanceResult = await query(
      `
        WITH purchased AS (
          SELECT
            mpd.medicine_id,
            SUM(
              COALESCE(mpd.quantity, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1)
              + COALESCE(mpd.sub_quantity, 0)
            )::bigint AS purchased_sub_units
          FROM medicine_purchase_detail mpd
          JOIN medicine_purchase mp ON mp.purchase_id = mpd.purchase_id
          JOIN medicine m ON m.medicine_id = mpd.medicine_id
          WHERE mp.party_id = $1
            AND ($2::date IS NULL OR mp.invoice_timestamp::date >= $2::date)
            AND ($3::date IS NULL OR mp.invoice_timestamp::date <= $3::date)
          GROUP BY mpd.medicine_id
        ),
        sold AS (
          SELECT
            mt.medicine_id,
            SUM(
              CASE
                WHEN mt.txn_type = 'sale' THEN
                  (COALESCE(mt.quantity, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1))
                  + COALESCE(mt.sub_quantity, 0)
                WHEN mt.txn_type = 'sale_return' THEN
                  -(
                    (COALESCE(mt.quantity, 0) * COALESCE(NULLIF(m.sub_units_per_unit, 0), 1))
                    + COALESCE(mt.sub_quantity, 0)
                  )
                ELSE 0
              END
            )::bigint AS sold_sub_units
          FROM medicine_transaction mt
          JOIN medicine_batch mb ON mb.batch_id = mt.batch_id
          JOIN medicine m ON m.medicine_id = mt.medicine_id
          WHERE mb.party_id = $1
            AND mt.txn_type IN ('sale', 'sale_return')
            AND ($2::date IS NULL OR mt.created_at::date >= $2::date)
            AND ($3::date IS NULL OR mt.created_at::date <= $3::date)
          GROUP BY mt.medicine_id
        ),
        combined AS (
          SELECT
            COALESCE(p.medicine_id, s.medicine_id) AS medicine_id,
            COALESCE(p.purchased_sub_units, 0) AS purchased_sub_units,
            GREATEST(COALESCE(s.sold_sub_units, 0), 0) AS sold_sub_units
          FROM purchased p
          FULL OUTER JOIN sold s ON s.medicine_id = p.medicine_id
        ),
        active_products AS (
          SELECT COUNT(DISTINCT m.medicine_id)::integer AS active_products
          FROM medicine_batch mb
          JOIN medicine m ON m.medicine_id = mb.medicine_id
          WHERE mb.party_id = $1
            AND COALESCE(m.is_active, true) = true
        ),
        movement_ranked AS (
          SELECT
            c.medicine_id,
            m.brand_name,
            m.generic_name,
            (c.sold_sub_units / COALESCE(NULLIF(m.sub_units_per_unit, 0), 1))::numeric(12,2) AS sold_units,
            c.sold_sub_units::integer AS sold_sub_units,
            ROW_NUMBER() OVER (ORDER BY c.sold_sub_units DESC, c.medicine_id) AS fast_rank,
            ROW_NUMBER() OVER (ORDER BY c.sold_sub_units ASC, c.medicine_id) AS slow_rank
          FROM combined c
          JOIN medicine m ON m.medicine_id = c.medicine_id
        )
        SELECT
          (SELECT active_products FROM active_products) AS active_products,
          COALESCE((SELECT SUM(purchased_sub_units) FROM combined), 0)::bigint AS purchased_stock_sub_units,
          COALESCE((SELECT SUM(sold_sub_units) FROM combined), 0)::bigint AS sold_stock_sub_units,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'medicine_id', mr.medicine_id,
                  'brand_name', mr.brand_name,
                  'generic_name', mr.generic_name,
                  'sold_units', mr.sold_units,
                  'sold_sub_units', mr.sold_sub_units
                )
                ORDER BY mr.fast_rank
              )
              FROM movement_ranked mr
              WHERE mr.fast_rank <= 5
            ),
            '[]'::json
          ) AS fast_moving_products,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'medicine_id', mr.medicine_id,
                  'brand_name', mr.brand_name,
                  'generic_name', mr.generic_name,
                  'sold_units', mr.sold_units,
                  'sold_sub_units', mr.sold_sub_units
                )
                ORDER BY mr.slow_rank
              )
              FROM movement_ranked mr
              WHERE mr.slow_rank <= 5
            ),
            '[]'::json
          ) AS slow_moving_products
      `,
      [partyId, from, to]
    );

    const operational = operationalResult.rows[0] ?? {};
    const inventoryHealth = inventoryHealthResult.rows[0] ?? {};
    const performance = performanceResult.rows[0] ?? {};

    const purchaseAmount = toNumber(operational.purchase_amount);
    const purchaseCount = toNumber(operational.purchase_count);
    const paidAmount = toNumber(operational.paid_amount);
    const returnAmount = toNumber(operational.return_amount);
    const outstandingAmount = purchaseAmount - paidAmount - returnAmount;
    const returnRate = purchaseAmount > 0 ? returnAmount / purchaseAmount : 0;
    const averagePurchaseTicket =
      purchaseCount > 0 ? purchaseAmount / purchaseCount : 0;

    const purchasedStockSubUnits = toNumber(performance.purchased_stock_sub_units);
    const soldStockSubUnits = toNumber(performance.sold_stock_sub_units);
    const sellThroughPercent =
      purchasedStockSubUnits > 0
        ? (soldStockSubUnits / purchasedStockSubUnits) * 100
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        canViewFinancials,
        filters: {
          from,
          to,
          deadStockDays,
        },
        operational: {
          purchaseCount,
          uniqueProducts: toNumber(operational.unique_products),
          totalUnits: toNumber(operational.total_units),
          totalSubUnits: toNumber(operational.total_sub_units),
          lastPurchaseDate: operational.last_purchase_date ?? null,
        },
        inventoryHealth: {
          expiredBatchesCount: toNumber(inventoryHealth.expired_batches_count),
          expiredStockUnits: toNumber(inventoryHealth.expired_stock_units),
          deadStockBatches: toNumber(inventoryHealth.dead_stock_batches),
          deadStockUnits: toNumber(inventoryHealth.dead_stock_units),
          deadStockDays,
        },
        performance: {
          activeProducts: toNumber(performance.active_products),
          purchasedStockUnits: purchasedStockSubUnits,
          soldStockUnits: soldStockSubUnits,
          sellThroughPercent,
          fastMovingProducts: performance.fast_moving_products ?? [],
          slowMovingProducts: performance.slow_moving_products ?? [],
        },
        financial: canViewFinancials
          ? {
              totalPurchasesAmount: purchaseAmount,
              totalPaidAmount: paidAmount,
              outstandingAmount,
              totalReturnAmount: returnAmount,
              returnRate,
              averagePurchaseTicket,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Party insights fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch party insights" },
      { status: 500 }
    );
  }
}

