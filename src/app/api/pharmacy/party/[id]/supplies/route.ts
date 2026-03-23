import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { getAuthenticatedUser } from "@/src/lib/server/auth";

const toNumber = (value: unknown): number => Number(value ?? 0);

function normalizeGroupBy(value: string | null): "batch" | "invoice" {
  return value === "invoice" ? "invoice" : "batch";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getAuthenticatedUser(request);
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
  const groupBy = normalizeGroupBy(searchParams.get("groupBy"));
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const medicine = (searchParams.get("medicine") || "").trim();
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") || "10"))
  );
  const offset = (page - 1) * pageSize;

  const baseWhere = `
    mp.party_id = $1
    AND ($2::date IS NULL OR mp.invoice_timestamp::date >= $2::date)
    AND ($3::date IS NULL OR mp.invoice_timestamp::date <= $3::date)
    AND (
      $4::text = ''
      OR m.brand_name ILIKE '%' || $4 || '%'
      OR m.generic_name ILIKE '%' || $4 || '%'
      OR m.category ILIKE '%' || $4 || '%'
      OR mb.batch_number ILIKE '%' || $4 || '%'
      OR mp.invoice_no ILIKE '%' || $4 || '%'
    )
  `;

  try {
    const totalSql =
      groupBy === "batch"
        ? `
          SELECT COUNT(
            DISTINCT COALESCE(
              NULLIF(BTRIM(mb.batch_number), ''),
              'BATCHID-' || COALESCE(mpd.batch_id::text, 'none')
            )
          ) AS total
          FROM medicine_purchase_detail mpd
          JOIN medicine_purchase mp ON mp.purchase_id = mpd.purchase_id
          JOIN medicine m ON m.medicine_id = mpd.medicine_id
          LEFT JOIN medicine_batch mb ON mb.batch_id = mpd.batch_id
          WHERE ${baseWhere}
        `
        : `
          SELECT COUNT(DISTINCT mp.purchase_id) AS total
          FROM medicine_purchase_detail mpd
          JOIN medicine_purchase mp ON mp.purchase_id = mpd.purchase_id
          JOIN medicine m ON m.medicine_id = mpd.medicine_id
          LEFT JOIN medicine_batch mb ON mb.batch_id = mpd.batch_id
          WHERE ${baseWhere}
        `;

    const totalResult = await query(totalSql, [partyId, from, to, medicine]);
    const total = toNumber(totalResult.rows[0]?.total);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const groupedSql =
      groupBy === "batch"
        ? `
          WITH filtered AS (
            SELECT
              mp.purchase_id,
              mp.invoice_no,
              mp.invoice_timestamp,
              mpd.medicine_id,
              COALESCE(m.brand_name, '') AS brand_name,
              COALESCE(m.generic_name, '') AS generic_name,
              m.category,
              COALESCE(mpd.quantity, 0) AS quantity,
              COALESCE(mpd.sub_quantity, 0) AS sub_quantity,
              mb.batch_id,
              mb.batch_number,
              mb.batch_code,
              mb.expiry_date,
              COALESCE(
                NULLIF(BTRIM(mb.batch_number), ''),
                'BATCHID-' || COALESCE(mb.batch_id::text, 'none')
              ) AS lot_key
            FROM medicine_purchase_detail mpd
            JOIN medicine_purchase mp ON mp.purchase_id = mpd.purchase_id
            JOIN medicine m ON m.medicine_id = mpd.medicine_id
            LEFT JOIN medicine_batch mb ON mb.batch_id = mpd.batch_id
            WHERE ${baseWhere}
          ),
          batch_page AS (
            SELECT
              lot_key AS group_id,
              MIN(batch_id) AS batch_id,
              MAX(batch_number) AS batch_number,
              MAX(batch_code) AS batch_code,
              MAX(expiry_date) AS expiry_date,
              SUM(quantity)::integer AS total_units,
              SUM(sub_quantity)::integer AS total_sub_units,
              COUNT(*)::integer AS supply_events,
              COUNT(DISTINCT medicine_id)::integer AS children_count,
              MAX(invoice_timestamp) AS sort_timestamp
            FROM filtered
            GROUP BY lot_key
            ORDER BY sort_timestamp DESC NULLS LAST, group_id DESC
            LIMIT $5 OFFSET $6
          ),
          batch_children AS (
            SELECT
              bp.group_id,
              f.medicine_id,
              MAX(f.brand_name) AS brand_name,
              MAX(f.generic_name) AS generic_name,
              MAX(f.category) AS category,
              SUM(f.quantity)::integer AS quantity,
              SUM(f.sub_quantity)::integer AS sub_quantity,
              COUNT(*)::integer AS purchase_count,
              MAX(f.batch_id) AS batch_id,
              MAX(f.batch_number) AS batch_number,
              MAX(f.batch_code) AS batch_code,
              MAX(f.expiry_date) AS expiry_date
            FROM filtered f
            JOIN batch_page bp ON bp.group_id = f.lot_key
            GROUP BY bp.group_id, f.medicine_id
          )
          SELECT
            bp.group_id,
            'batch'::text AS group_type,
            NULL::integer AS purchase_id,
            NULL::text AS invoice_no,
            NULL::timestamp AS invoice_timestamp,
            bp.batch_id,
            bp.batch_number,
            bp.batch_code,
            bp.expiry_date,
            bp.total_units,
            bp.total_sub_units,
            bp.supply_events,
            bp.children_count,
            COALESCE(
              json_agg(
                json_build_object(
                  'medicine_id', bc.medicine_id,
                  'brand_name', NULLIF(bc.brand_name, ''),
                  'generic_name', NULLIF(bc.generic_name, ''),
                  'category', bc.category,
                  'quantity', bc.quantity,
                  'sub_quantity', bc.sub_quantity,
                  'purchase_count', bc.purchase_count,
                  'batch_id', bc.batch_id,
                  'batch_number', bc.batch_number,
                  'batch_code', bc.batch_code,
                  'expiry_date', bc.expiry_date
                )
                ORDER BY bc.brand_name, bc.generic_name
              ) FILTER (WHERE bc.medicine_id IS NOT NULL),
              '[]'::json
            ) AS children
          FROM batch_page bp
          LEFT JOIN batch_children bc ON bc.group_id = bp.group_id
          GROUP BY
            bp.group_id,
            bp.batch_id,
            bp.batch_number,
            bp.batch_code,
            bp.expiry_date,
            bp.total_units,
            bp.total_sub_units,
            bp.supply_events,
            bp.children_count,
            bp.sort_timestamp
          ORDER BY bp.sort_timestamp DESC NULLS LAST, bp.group_id DESC
        `
        : `
          WITH filtered AS (
            SELECT
              mp.purchase_id,
              mp.invoice_no,
              mp.invoice_timestamp,
              mpd.medicine_id,
              COALESCE(m.brand_name, '') AS brand_name,
              COALESCE(m.generic_name, '') AS generic_name,
              m.category,
              COALESCE(mpd.quantity, 0) AS quantity,
              COALESCE(mpd.sub_quantity, 0) AS sub_quantity,
              mb.batch_id,
              mb.batch_number,
              mb.batch_code,
              mb.expiry_date
            FROM medicine_purchase_detail mpd
            JOIN medicine_purchase mp ON mp.purchase_id = mpd.purchase_id
            JOIN medicine m ON m.medicine_id = mpd.medicine_id
            LEFT JOIN medicine_batch mb ON mb.batch_id = mpd.batch_id
            WHERE ${baseWhere}
          ),
          invoice_page AS (
            SELECT
              purchase_id::text AS group_id,
              purchase_id,
              MAX(invoice_no) AS invoice_no,
              MAX(invoice_timestamp) AS invoice_timestamp,
              SUM(quantity)::integer AS total_units,
              SUM(sub_quantity)::integer AS total_sub_units,
              COUNT(*)::integer AS supply_events,
              COUNT(DISTINCT medicine_id)::integer AS children_count
            FROM filtered
            GROUP BY purchase_id
            ORDER BY MAX(invoice_timestamp) DESC, purchase_id DESC
            LIMIT $5 OFFSET $6
          ),
          invoice_children AS (
            SELECT
              ip.group_id,
              f.medicine_id,
              MAX(f.brand_name) AS brand_name,
              MAX(f.generic_name) AS generic_name,
              MAX(f.category) AS category,
              SUM(f.quantity)::integer AS quantity,
              SUM(f.sub_quantity)::integer AS sub_quantity,
              COUNT(*)::integer AS purchase_count,
              MAX(f.batch_id) AS batch_id,
              MAX(f.batch_number) AS batch_number,
              MAX(f.batch_code) AS batch_code,
              MAX(f.expiry_date) AS expiry_date
            FROM filtered f
            JOIN invoice_page ip ON ip.purchase_id = f.purchase_id
            GROUP BY ip.group_id, f.medicine_id
          )
          SELECT
            ip.group_id,
            'invoice'::text AS group_type,
            ip.purchase_id,
            ip.invoice_no,
            ip.invoice_timestamp,
            NULL::integer AS batch_id,
            NULL::text AS batch_number,
            NULL::text AS batch_code,
            NULL::date AS expiry_date,
            ip.total_units,
            ip.total_sub_units,
            ip.supply_events,
            ip.children_count,
            COALESCE(
              json_agg(
                json_build_object(
                  'medicine_id', ic.medicine_id,
                  'brand_name', NULLIF(ic.brand_name, ''),
                  'generic_name', NULLIF(ic.generic_name, ''),
                  'category', ic.category,
                  'quantity', ic.quantity,
                  'sub_quantity', ic.sub_quantity,
                  'purchase_count', ic.purchase_count,
                  'batch_id', ic.batch_id,
                  'batch_number', ic.batch_number,
                  'batch_code', ic.batch_code,
                  'expiry_date', ic.expiry_date
                )
                ORDER BY ic.brand_name, ic.generic_name
              ) FILTER (WHERE ic.medicine_id IS NOT NULL),
              '[]'::json
            ) AS children
          FROM invoice_page ip
          LEFT JOIN invoice_children ic ON ic.group_id = ip.group_id
          GROUP BY
            ip.group_id,
            ip.purchase_id,
            ip.invoice_no,
            ip.invoice_timestamp,
            ip.total_units,
            ip.total_sub_units,
            ip.supply_events,
            ip.children_count
          ORDER BY ip.invoice_timestamp DESC, ip.purchase_id DESC
        `;

    const groupedResult = await query(groupedSql, [
      partyId,
      from,
      to,
      medicine,
      pageSize,
      offset,
    ]);

    return NextResponse.json({
      success: true,
      data: {
        groupBy,
        groups: groupedResult.rows,
        page,
        pageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Party supplies fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch party supplies" },
      { status: 500 }
    );
  }
}
