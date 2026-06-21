import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { getAdminInventorySummary } from "@/src/lib/server/adminInventory";
import {
  getCurrentDateInTimezone,
  getSystemTimezone,
  getUtcRollingDayRangeForTimezone,
} from "@/src/lib/server/systemTimezone";

type ActivityType = "attendance" | "financial" | "inventory" | "patient" | "system";
type ActivityStatus = "success" | "warning" | "danger" | "info";
type TrendRange = "7d" | "30d" | "1y" | "5y" | "lifetime";
type TrendBucket = "day" | "month" | "year";

const getActivityType = (action: string, entityType: string): ActivityType => {
  const text = `${action} ${entityType}`.toLowerCase();
  if (text.includes("attendance")) return "attendance";
  if (text.includes("payment") || text.includes("bill") || text.includes("financial")) return "financial";
  if (text.includes("stock") || text.includes("inventory") || text.includes("medicine")) return "inventory";
  if (text.includes("patient") || text.includes("visit")) return "patient";
  return "system";
};

const getActivityStatus = (action: string): ActivityStatus => {
  const text = action.toLowerCase();
  if (text.includes("delete") || text.includes("remove") || text.includes("fail")) return "danger";
  if (text.includes("update") || text.includes("edit") || text.includes("override")) return "warning";
  if (text.includes("create") || text.includes("add") || text.includes("complete")) return "success";
  return "info";
};

const isTrendRange = (value: string): value is TrendRange =>
  value === "7d" || value === "30d" || value === "1y" || value === "5y" || value === "lifetime";

const getTrendRange = (req: NextRequest): TrendRange => {
  try {
    const value = new URL(req.url).searchParams.get("range")?.toLowerCase().trim() ?? "7d";
    return isTrendRange(value) ? value : "7d";
  } catch {
    return "7d";
  }
};

const getBucketForRange = (range: TrendRange): TrendBucket => {
  if (range === "7d" || range === "30d") return "day";
  if (range === "1y") return "month";
  return "year";
};

const addUtcDays = (d: Date, days: number) => {
  const n = new Date(d);
  n.setUTCDate(n.getUTCDate() + days);
  return n;
};

const addUtcMonths = (d: Date, months: number) => {
  const n = new Date(d);
  n.setUTCMonth(n.getUTCMonth() + months);
  return n;
};

const addUtcYears = (d: Date, years: number) => {
  const n = new Date(d);
  n.setUTCFullYear(n.getUTCFullYear() + years);
  return n;
};

const utcDayStart = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const utcMonthStart = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

const bucketKey = (d: Date) => d.toISOString().slice(0, 10);
const isBucketKey = (text: string) => /^\d{4}-\d{2}-\d{2}$/.test(text);

const formatBucketLabel = (d: Date, bucket: TrendBucket, timeZone: string) => {
  if (bucket === "day") return d.toLocaleDateString("en-US", { weekday: "short", timeZone });
  if (bucket === "month") return d.toLocaleDateString("en-US", { month: "short", timeZone });
  return String(d.getUTCFullYear());
};

function buildFallbackActivities(args: {
  now: Date;
  revenue30d: number;
  dailyPatients: number;
  lowStockCount: number;
}): Array<{
  id: number;
  type: ActivityType;
  status: ActivityStatus;
  action: string;
  staff: string;
  entityType: string | null;
  entityId: string | number | null;
  time: string;
}> {
  const { now, revenue30d, dailyPatients, lowStockCount } = args;
  const baseTime = now.getTime();

  return [
    {
      id: -1,
      type: "system",
      status: "info",
      action: "No audit logs yet - showing live summary placeholders.",
      staff: "System",
      entityType: null,
      entityId: null,
      time: new Date(baseTime - 1 * 60 * 1000).toISOString(),
    },
    {
      id: -2,
      type: "financial",
      status: revenue30d > 0 ? "success" : "warning",
      action:
        revenue30d > 0
          ? `Cash collected (30d): PKR ${revenue30d.toLocaleString()}`
          : "No cash collections recorded in the last 30 days.",
      staff: "Dashboard Snapshot",
      entityType: "financial_summary",
      entityId: "revenue_30d",
      time: new Date(baseTime - 2 * 60 * 1000).toISOString(),
    },
    {
      id: -3,
      type: "inventory",
      status: lowStockCount > 5 ? "danger" : lowStockCount > 0 ? "warning" : "success",
      action:
        lowStockCount > 0
          ? `${lowStockCount} critical low-stock item(s) need review.`
          : "Inventory levels are currently stable.",
      staff: "Inventory Snapshot",
      entityType: "inventory_summary",
      entityId: "critical_low_stock_count",
      time: new Date(baseTime - 3 * 60 * 1000).toISOString(),
    },
    {
      id: -4,
      type: "patient",
      status: dailyPatients > 0 ? "success" : "info",
      action:
        dailyPatients > 0
          ? `${dailyPatients} patient(s) checked in today.`
          : "No patient check-ins recorded today yet.",
      staff: "Queue Snapshot",
      entityType: "daily_patients",
      entityId: "daily_patients",
      time: new Date(baseTime - 4 * 60 * 1000).toISOString(),
    },
  ];
}

const LEDGER_VIEW_SOURCE_SQL = `
  SELECT
    collected_at,
    amount,
    source,
    entity_ref
  FROM public.admin_cash_collected_ledger_v1
`;

const LEDGER_FALLBACK_SOURCE_SQL = `
  SELECT
    txn.created_at AS collected_at,
    CASE
      WHEN txn.txn_type = 'payment' THEN txn.amount
      WHEN txn.txn_type = 'reversal' THEN -ABS(txn.amount)
      ELSE 0
    END::numeric AS amount,
    'cashier'::text AS source,
    CONCAT('cashier_payment_txn:', txn.cashier_payment_txn_id)::text AS entity_ref
  FROM cashier_payment_txn txn
  WHERE txn.txn_type IN ('payment', 'reversal')

  UNION ALL

  SELECT
    sale.sale_timestamp AS collected_at,
    sale.total_amount::numeric AS amount,
    'pharmacy'::text AS source,
    CONCAT('pharmacy_sale:', sale.sale_id)::text AS entity_ref
  FROM pharmacy_sale sale
  WHERE sale.settlement_channel = 'pharmacy'
    AND sale.settlement_status = 'settled'
`;

async function resolveLedgerSource(): Promise<string> {
  try {
    await query(`
      SELECT 1
      FROM public.admin_cash_collected_ledger_v1
      LIMIT 1
    `);
    return LEDGER_VIEW_SOURCE_SQL;
  } catch (error) {
    console.warn("admin dashboard summary: falling back to inline ledger source", error);
    return LEDGER_FALLBACK_SOURCE_SQL;
  }
}

async function getLifetimeStartDate(ledgerSourceSql: string): Promise<Date | null> {
  const result = await query(
    `
      WITH ledger AS (
        ${ledgerSourceSql}
      )
      SELECT MIN(collected_at)::date AS min_date
      FROM ledger
    `
  );

  const raw = result.rows[0]?.min_date;
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function buildExpectedBuckets(range: TrendRange, now: Date, lifetimeStart: Date | null): Date[] {
  const buckets: Date[] = [];

  if (range === "7d") {
    const start = addUtcDays(utcDayStart(now), -6);
    for (let i = 0; i < 7; i++) buckets.push(addUtcDays(start, i));
    return buckets;
  }

  if (range === "30d") {
    const start = addUtcDays(utcDayStart(now), -29);
    for (let i = 0; i < 30; i++) buckets.push(addUtcDays(start, i));
    return buckets;
  }

  if (range === "1y") {
    const start = addUtcMonths(utcMonthStart(now), -11);
    for (let i = 0; i < 12; i++) buckets.push(addUtcMonths(start, i));
    return buckets;
  }

  if (range === "5y") {
    const start = new Date(Date.UTC(now.getUTCFullYear() - 4, 0, 1));
    for (let i = 0; i < 5; i++) buckets.push(addUtcYears(start, i));
    return buckets;
  }

  const fallbackStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const start = lifetimeStart ? new Date(Date.UTC(lifetimeStart.getUTCFullYear(), 0, 1)) : fallbackStart;
  const years = Math.max(1, now.getUTCFullYear() - start.getUTCFullYear() + 1);
  for (let i = 0; i < years; i++) buckets.push(addUtcYears(start, i));
  return buckets;
}

function getRangeStart(range: TrendRange, now: Date): Date | null {
  if (range === "7d") return addUtcDays(utcDayStart(now), -6);
  if (range === "30d") return addUtcDays(utcDayStart(now), -29);
  if (range === "1y") return addUtcMonths(utcMonthStart(now), -11);
  if (range === "5y") return new Date(Date.UTC(now.getUTCFullYear() - 4, 0, 1));
  return null;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    const timeZone = await getSystemTimezone();
    const range = getTrendRange(req);
    const bucket = getBucketForRange(range);
    const now = new Date();
    const current30 = getUtcRollingDayRangeForTimezone({ timeZone, days: 30, now });
    const current60 = getUtcRollingDayRangeForTimezone({ timeZone, days: 60, now });
    const localDate = getCurrentDateInTimezone(timeZone, now);
    const ledgerSourceSql = await resolveLedgerSource();
    const bucketExpr =
      bucket === "day"
        ? "date_trunc('day', collected_at)"
        : bucket === "month"
          ? "date_trunc('month', collected_at)"
          : "date_trunc('year', collected_at)";
    const rangeStart = getRangeStart(range, now);
    const trendParams: Array<string> = rangeStart ? [rangeStart.toISOString()] : [];

    const lifetimeStartPromise =
      range === "lifetime" ? getLifetimeStartDate(ledgerSourceSql) : Promise.resolve(null);
    const [revenueResult, staffPatientResult, trendRawResult, activitiesResult, inventorySummary, lifetimeStart, patientGrowthResult] =
      await Promise.all([
        query(`
          WITH ledger AS (
            ${ledgerSourceSql}
          )
          SELECT
            COALESCE(
              SUM(amount) FILTER (
                WHERE collected_at >= $1::timestamptz
                  AND collected_at < $2::timestamptz
              ),
              0
            ) AS revenue_30d,
            COALESCE(
              SUM(amount) FILTER (
                WHERE collected_at >= $3::timestamptz
                  AND collected_at < $1::timestamptz
              ),
              0
            ) AS revenue_prev_30d
          FROM ledger
        `, [current30.startUtcIso, current30.endUtcIso, current60.startUtcIso]),
        query(`
          WITH patient_visits AS (
            SELECT COUNT(*)::int AS daily_patients
            FROM visit
            WHERE (visit_timestamp AT TIME ZONE $1)::date = $2::date
          ),
          staff_summary AS (
            SELECT
              COUNT(*)::int AS total_staff,
              COUNT(*) FILTER (
                WHERE EXISTS (
                  SELECT 1
                  FROM staff_attendance sa
                  WHERE sa.staff_id = s.staff_id
                    AND sa.date = $2::date
                    AND sa.status = 'Present'
                )
              )::int AS active_staff
            FROM staff s
          )
          SELECT
            p.daily_patients,
            ss.active_staff,
            ss.total_staff
          FROM patient_visits p
          CROSS JOIN staff_summary ss
        `, [timeZone, localDate]),
        query(`
          WITH ledger AS (
            ${ledgerSourceSql}
          )
          SELECT
            to_char(${bucketExpr}, 'YYYY-MM-DD') AS bucket_key,
            COALESCE(SUM(amount), 0) AS value
          FROM ledger
          ${rangeStart ? "WHERE collected_at >= $1::timestamp" : ""}
          GROUP BY bucket_key
          ORDER BY bucket_key ASC
        `, trendParams),
        query(`
          SELECT
            l.log_id,
            l.action,
            l.entity_type,
            l.entity_id,
            l.created_at,
            COALESCE(
              s.name,
              l.details->>'userName',
              l.details->>'name',
              l.details->>'userCode'
            ) AS staff_name
          FROM audit_logs l
          LEFT JOIN staff s ON s.staff_id = l.staff_id
          ORDER BY l.created_at DESC
          LIMIT 10
        `),
        getAdminInventorySummary(),
        lifetimeStartPromise,
        query(`
          SELECT
            COUNT(*) FILTER (
              WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz
            )::int AS new_patients_30d,
            COUNT(*) FILTER (
              WHERE created_at >= $3::timestamptz AND created_at < $1::timestamptz
            )::int AS new_patients_prev_30d
          FROM patient
        `, [current30.startUtcIso, current30.endUtcIso, current60.startUtcIso]),
      ]);

    const metrics = {
      revenue: Number(revenueResult.rows[0]?.revenue_30d ?? 0),
      previous_revenue_30d: Number(revenueResult.rows[0]?.revenue_prev_30d ?? 0),
      daily_patients: Number(staffPatientResult.rows[0]?.daily_patients ?? 0),
      active_staff: Number(staffPatientResult.rows[0]?.active_staff ?? 0),
      total_staff: Number(staffPatientResult.rows[0]?.total_staff ?? 0),
    };
    const revenueChangePct30d =
      metrics.previous_revenue_30d === 0
        ? metrics.revenue === 0
          ? 0
          : null
        : ((metrics.revenue - metrics.previous_revenue_30d) / metrics.previous_revenue_30d) * 100;

    const newPatients30d = Number(patientGrowthResult.rows[0]?.new_patients_30d ?? 0);
    const newPatientsPrev30d = Number(patientGrowthResult.rows[0]?.new_patients_prev_30d ?? 0);
    const patientGrowthPct30d =
      newPatientsPrev30d === 0
        ? newPatients30d === 0
          ? 0
          : null
        : ((newPatients30d - newPatientsPrev30d) / newPatientsPrev30d) * 100;

    const activities = activitiesResult.rows.map((row: any) => ({
      id: row.log_id,
      type: getActivityType(row.action ?? "", row.entity_type ?? ""),
      status: getActivityStatus(row.action ?? ""),
      action: row.action ?? "System event",
      staff: row.staff_name ?? "System",
      entityType: row.entity_type ?? null,
      entityId: row.entity_id ?? null,
      time: new Date(row.created_at).toISOString(),
    }));

    const safeActivities =
      activities.length > 0
        ? activities
        : buildFallbackActivities({
          now,
          revenue30d: metrics.revenue,
          dailyPatients: metrics.daily_patients,
          lowStockCount: Number(inventorySummary.lowStockCount ?? 0),
        });

    const expectedBuckets = buildExpectedBuckets(range, now, lifetimeStart);
    const valueMap = new Map<string, number>();
    for (const row of trendRawResult.rows) {
      const key = String(row.bucket_key ?? "").trim();
      if (!isBucketKey(key)) continue;
      const amount = Number(row.value ?? 0);
      const safeAmount = Number.isFinite(amount) ? amount : 0;
      valueMap.set(key, safeAmount);
    }

    const trend = expectedBuckets.map((date) => {
      const key = bucketKey(date);
      const rawValue = valueMap.get(key) ?? 0;
      const value = Number.isFinite(rawValue) ? rawValue : 0;
      return {
        date: key,
        day: formatBucketLabel(date, bucket, timeZone),
        value,
      };
    });

    console.info("[admin/dashboard/summary]", {
      range,
      bucket,
      trendBuckets: trendRawResult.rows,
      trendComputedSample: trend.slice(0, 5),
    });

    return NextResponse.json({
      metrics: {
        revenue: metrics.revenue,
        previousRevenue30d: metrics.previous_revenue_30d,
        revenueChangePct30d,
        dailyPatients: metrics.daily_patients,
        activeStaff: metrics.active_staff,
        totalStaff: metrics.total_staff,
        criticalLowStockCount: Number(inventorySummary.lowStockCount ?? 0),
        newPatients30d,
        newPatientsPrev30d,
        patientGrowthPct30d,
      },
      trendMeta: {
        range,
        bucket,
        points: trend.length,
      },
      trend,
      activities: safeActivities,
    });
  } catch (error) {
    console.error("Admin dashboard summary error:", error);
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to load dashboard summary" }, { status: 500 });
  }
}
