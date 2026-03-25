import { query } from "@/database/db";

export type WorkforceBucket = "day" | "week" | "month";
export type RoleLens = "all" | "staff" | "doctor";

export type WorkforceAnalyticsFilters = {
  fromDate: string;
  toDate: string;
  accountType: "all" | "staff" | "doctor";
  roleLens: RoleLens;
  department?: string | null;
  facilityCode?: string | null;
  employeeAccountType?: "staff" | "doctor" | null;
  employeePersonId?: number | null;
  employeeSearch?: string | null;
  bucket: WorkforceBucket;
};

export type WorkforceScoreFactor = {
  weight: number;
  enabled: boolean;
};

export type WorkforceScoreConfig = {
  version: number;
  factors: {
    attendance_reliability: WorkforceScoreFactor;
    punctuality: WorkforceScoreFactor;
    leave_discipline: WorkforceScoreFactor;
    correction_burden: WorkforceScoreFactor;
    compliance_hygiene: WorkforceScoreFactor;
  };
};

export type EmployeeMetricRow = {
  account_type: "staff" | "doctor";
  person_id: number;
  user_code: string;
  name: string;
  role: string;
  department: string | null;
  facility_code: string | null;
  attendance_marks: number;
  attendance_present_like: number;
  attendance_on_time: number;
  attendance_late: number;
  attendance_absent: number;
  leave_total: number;
  leave_pending: number;
  leave_approved: number;
  leave_rejected: number;
  correction_requests: number;
  credential_expired: number;
  credential_pending: number;
  document_expired: number;
  document_pending: number;
  lifecycle_blocked: number;
  payroll_net_total: number;
  payroll_gross_total: number;
  avg_monthly_base_salary: number;
  salary_model_fixed_count: number;
  salary_model_per_patient_count: number;
};

export type EmployeeScoreRow = EmployeeMetricRow & {
  score: number;
  score_breakdown: {
    attendance_reliability: number;
    punctuality: number;
    leave_discipline: number;
    correction_burden: number;
    compliance_hygiene: number;
  };
};

export const WORKFORCE_ANALYTICS_CONFIG_KEY = "workforce_analytics_score_config";

export function defaultScoreConfig(): WorkforceScoreConfig {
  return {
    version: 1,
    factors: {
      attendance_reliability: { weight: 30, enabled: true },
      punctuality: { weight: 20, enabled: true },
      leave_discipline: { weight: 20, enabled: true },
      correction_burden: { weight: 10, enabled: true },
      compliance_hygiene: { weight: 20, enabled: true },
    },
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toSafeWeight(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return clamp(Math.round(n * 100) / 100, 0, 100);
}

function normalizeFactor(input: any, fallback: WorkforceScoreFactor): WorkforceScoreFactor {
  return {
    weight: toSafeWeight(input?.weight, fallback.weight),
    enabled: typeof input?.enabled === "boolean" ? input.enabled : fallback.enabled,
  };
}

export function normalizeScoreConfig(input: unknown): WorkforceScoreConfig {
  const fallback = defaultScoreConfig();
  const raw = (input && typeof input === "object" ? input : {}) as any;
  const factors = raw?.factors ?? {};

  return {
    version: Number.isFinite(Number(raw?.version)) ? Math.max(1, Math.floor(Number(raw.version))) : fallback.version,
    factors: {
      attendance_reliability: normalizeFactor(factors.attendance_reliability, fallback.factors.attendance_reliability),
      punctuality: normalizeFactor(factors.punctuality, fallback.factors.punctuality),
      leave_discipline: normalizeFactor(factors.leave_discipline, fallback.factors.leave_discipline),
      correction_burden: normalizeFactor(factors.correction_burden, fallback.factors.correction_burden),
      compliance_hygiene: normalizeFactor(factors.compliance_hygiene, fallback.factors.compliance_hygiene),
    },
  };
}

export async function getScoreConfig() {
  const existing = await query(
    `
    SELECT setting_value, updated_at
    FROM system_settings
    WHERE setting_key = $1
    LIMIT 1
    `,
    [WORKFORCE_ANALYTICS_CONFIG_KEY]
  );

  if (!existing.rows[0]) {
    return {
      config: defaultScoreConfig(),
      updatedAt: null as string | null,
    };
  }

  return {
    config: normalizeScoreConfig(existing.rows[0].setting_value),
    updatedAt: existing.rows[0].updated_at ? String(existing.rows[0].updated_at) : null,
  };
}

export async function fetchEmployeeMetrics(filters: WorkforceAnalyticsFilters) {
  const effectiveRole: RoleLens = filters.accountType === "all" ? filters.roleLens : filters.accountType;
  const search = filters.employeeSearch?.trim() ? `%${filters.employeeSearch.trim()}%` : null;

  const result = await query(
    `
    WITH employees AS (
      SELECT
        'staff'::text AS account_type,
        s.staff_id::int AS person_id,
        s.user_code,
        s.name,
        COALESCE(s.role, 'Staff') AS role,
        s.department,
        COALESCE(s.facility_code, 'MAIN') AS facility_code
      FROM staff s
      WHERE COALESCE(s.employment_status, 'active') = 'active'

      UNION ALL

      SELECT
        'doctor'::text AS account_type,
        d.doctor_id::int AS person_id,
        d.user_code,
        d.doctor_name AS name,
        'Doctor'::text AS role,
        d.specialization AS department,
        'MAIN'::text AS facility_code
      FROM doctor d
      WHERE COALESCE(d.employment_status, 'active') = 'active'
    ),
    filtered AS (
      SELECT *
      FROM employees e
      WHERE ($1::text = 'all' OR e.account_type = $1::text)
        AND ($2::text IS NULL OR e.department = $2::text)
        AND ($3::text IS NULL OR e.facility_code = $3::text)
        AND (
          $4::int IS NULL OR $4::int <= 0 OR
          (
            ($5::text IS NULL OR e.account_type = $5::text)
            AND e.person_id = $4::int
          )
        )
        AND (
          $6::text IS NULL OR
          e.name ILIKE $6::text OR
          e.user_code ILIKE $6::text
        )
    ),
    attendance_union AS (
      SELECT
        'staff'::text AS account_type,
        a.staff_id::int AS person_id,
        COALESCE(a.derived_status, LOWER(COALESCE(a.status, 'unscheduled'))) AS status
      FROM staff_attendance a
      WHERE a.date BETWEEN $7::date AND $8::date

      UNION ALL

      SELECT
        'doctor'::text AS account_type,
        a.doctor_id::int AS person_id,
        COALESCE(a.derived_status, LOWER(COALESCE(a.status, 'unscheduled'))) AS status
      FROM doctor_attendance a
      WHERE a.date BETWEEN $7::date AND $8::date
    ),
    attendance_agg AS (
      SELECT
        account_type,
        person_id,
        COUNT(*)::int AS attendance_marks,
        COUNT(*) FILTER (WHERE status IN ('present', 'on_time', 'late', 'scheduled'))::int AS attendance_present_like,
        COUNT(*) FILTER (WHERE status IN ('on_time', 'present', 'scheduled'))::int AS attendance_on_time,
        COUNT(*) FILTER (WHERE status = 'late')::int AS attendance_late,
        COUNT(*) FILTER (WHERE status IN ('absent', 'missed'))::int AS attendance_absent
      FROM attendance_union
      GROUP BY account_type, person_id
    ),
    leave_agg AS (
      SELECT
        COALESCE(lr.account_type, CASE WHEN lr.doctor_id IS NOT NULL THEN 'doctor' ELSE 'staff' END)::text AS account_type,
        COALESCE(lr.person_id, CASE WHEN lr.doctor_id IS NOT NULL THEN lr.doctor_id ELSE lr.staff_id END)::int AS person_id,
        COUNT(*)::int AS leave_total,
        COUNT(*) FILTER (WHERE lr.request_status = 'pending')::int AS leave_pending,
        COUNT(*) FILTER (WHERE lr.request_status = 'approved')::int AS leave_approved,
        COUNT(*) FILTER (WHERE lr.request_status = 'rejected')::int AS leave_rejected
      FROM staff_leave_requests lr
      WHERE lr.requested_at::date BETWEEN $7::date AND $8::date
      GROUP BY 1, 2
    ),
    correction_agg AS (
      SELECT
        'staff'::text AS account_type,
        rr.staff_id::int AS person_id,
        COUNT(*)::int AS correction_requests
      FROM attendance_regularization_requests rr
      WHERE rr.created_at::date BETWEEN $7::date AND $8::date
      GROUP BY rr.staff_id
    ),
    credential_agg AS (
      SELECT
        ec.account_type,
        ec.person_id,
        COUNT(*) FILTER (WHERE ec.expires_on IS NOT NULL AND ec.expires_on < CURRENT_DATE)::int AS credential_expired,
        COUNT(*) FILTER (WHERE ec.verification_status IN ('draft', 'submitted', 'under_review'))::int AS credential_pending
      FROM employee_credentials ec
      GROUP BY ec.account_type, ec.person_id
    ),
    document_agg AS (
      SELECT
        ed.account_type,
        ed.person_id,
        COUNT(*) FILTER (WHERE ed.expires_on IS NOT NULL AND ed.expires_on < CURRENT_DATE)::int AS document_expired,
        COUNT(*) FILTER (WHERE ed.review_status IN ('draft', 'submitted', 'under_review'))::int AS document_pending
      FROM employee_documents ed
      GROUP BY ed.account_type, ed.person_id
    ),
    lifecycle_agg AS (
      SELECT
        r.account_type,
        r.person_id,
        COUNT(*) FILTER (WHERE r.run_status = 'blocked')::int AS lifecycle_blocked
      FROM employee_lifecycle_runs r
      GROUP BY r.account_type, r.person_id
    ),
    payroll_agg AS (
      SELECT
        pli.account_type,
        pli.person_id,
        COALESCE(SUM(pli.net_amount), 0)::numeric AS payroll_net_total,
        COALESCE(SUM(pli.gross_amount), 0)::numeric AS payroll_gross_total
      FROM payroll_line_item pli
      JOIN payroll_run pr ON pr.payroll_run_id = pli.payroll_run_id
      WHERE pr.status = 'finalized'
        AND pr.period_month >= date_trunc('month', $7::date)::date
        AND pr.period_month <= date_trunc('month', $8::date)::date
      GROUP BY pli.account_type, pli.person_id
    ),
    compensation_agg AS (
      SELECT
        cp.account_type,
        cp.person_id,
        AVG(cp.base_monthly_salary)::numeric AS avg_monthly_base_salary,
        COUNT(*) FILTER (WHERE cp.salary_model = 'fixed_monthly')::int AS salary_model_fixed_count,
        COUNT(*) FILTER (WHERE cp.salary_model = 'per_patient_seen')::int AS salary_model_per_patient_count
      FROM employee_compensation_profile cp
      WHERE cp.active_from <= $8::date
        AND (cp.active_to IS NULL OR cp.active_to >= $7::date)
      GROUP BY cp.account_type, cp.person_id
    )
    SELECT
      f.account_type,
      f.person_id,
      f.user_code,
      f.name,
      f.role,
      f.department,
      f.facility_code,
      COALESCE(a.attendance_marks, 0)::int AS attendance_marks,
      COALESCE(a.attendance_present_like, 0)::int AS attendance_present_like,
      COALESCE(a.attendance_on_time, 0)::int AS attendance_on_time,
      COALESCE(a.attendance_late, 0)::int AS attendance_late,
      COALESCE(a.attendance_absent, 0)::int AS attendance_absent,
      COALESCE(l.leave_total, 0)::int AS leave_total,
      COALESCE(l.leave_pending, 0)::int AS leave_pending,
      COALESCE(l.leave_approved, 0)::int AS leave_approved,
      COALESCE(l.leave_rejected, 0)::int AS leave_rejected,
      COALESCE(c.correction_requests, 0)::int AS correction_requests,
      COALESCE(cr.credential_expired, 0)::int AS credential_expired,
      COALESCE(cr.credential_pending, 0)::int AS credential_pending,
      COALESCE(d.document_expired, 0)::int AS document_expired,
      COALESCE(d.document_pending, 0)::int AS document_pending,
      COALESCE(lc.lifecycle_blocked, 0)::int AS lifecycle_blocked,
      COALESCE(p.payroll_net_total, 0)::numeric AS payroll_net_total,
      COALESCE(p.payroll_gross_total, 0)::numeric AS payroll_gross_total,
      COALESCE(ca.avg_monthly_base_salary, 0)::numeric AS avg_monthly_base_salary,
      COALESCE(ca.salary_model_fixed_count, 0)::int AS salary_model_fixed_count,
      COALESCE(ca.salary_model_per_patient_count, 0)::int AS salary_model_per_patient_count
    FROM filtered f
    LEFT JOIN attendance_agg a ON a.account_type = f.account_type AND a.person_id = f.person_id
    LEFT JOIN leave_agg l ON l.account_type = f.account_type AND l.person_id = f.person_id
    LEFT JOIN correction_agg c ON c.account_type = f.account_type AND c.person_id = f.person_id
    LEFT JOIN credential_agg cr ON cr.account_type = f.account_type AND cr.person_id = f.person_id
    LEFT JOIN document_agg d ON d.account_type = f.account_type AND d.person_id = f.person_id
    LEFT JOIN lifecycle_agg lc ON lc.account_type = f.account_type AND lc.person_id = f.person_id
    LEFT JOIN payroll_agg p ON p.account_type = f.account_type AND p.person_id = f.person_id
    LEFT JOIN compensation_agg ca ON ca.account_type = f.account_type AND ca.person_id = f.person_id
    ORDER BY f.name ASC
    `,
    [
      effectiveRole,
      filters.department ?? null,
      filters.facilityCode ?? null,
      filters.employeePersonId ?? null,
      filters.employeeAccountType ?? null,
      search,
      filters.fromDate,
      filters.toDate,
    ]
  );

  return result.rows.map((row) => ({
    ...row,
    attendance_marks: Number(row.attendance_marks ?? 0),
    attendance_present_like: Number(row.attendance_present_like ?? 0),
    attendance_on_time: Number(row.attendance_on_time ?? 0),
    attendance_late: Number(row.attendance_late ?? 0),
    attendance_absent: Number(row.attendance_absent ?? 0),
    leave_total: Number(row.leave_total ?? 0),
    leave_pending: Number(row.leave_pending ?? 0),
    leave_approved: Number(row.leave_approved ?? 0),
    leave_rejected: Number(row.leave_rejected ?? 0),
    correction_requests: Number(row.correction_requests ?? 0),
    credential_expired: Number(row.credential_expired ?? 0),
    credential_pending: Number(row.credential_pending ?? 0),
    document_expired: Number(row.document_expired ?? 0),
    document_pending: Number(row.document_pending ?? 0),
    lifecycle_blocked: Number(row.lifecycle_blocked ?? 0),
    payroll_net_total: Number(row.payroll_net_total ?? 0),
    payroll_gross_total: Number(row.payroll_gross_total ?? 0),
    avg_monthly_base_salary: Number(row.avg_monthly_base_salary ?? 0),
    salary_model_fixed_count: Number(row.salary_model_fixed_count ?? 0),
    salary_model_per_patient_count: Number(row.salary_model_per_patient_count ?? 0),
  })) as EmployeeMetricRow[];
}

export function applyPerformanceScore(metrics: EmployeeMetricRow[], config: WorkforceScoreConfig): EmployeeScoreRow[] {
  const factors = config.factors;

  const enabledWeights = Object.values(factors)
    .filter((f) => f.enabled)
    .reduce((sum, f) => sum + f.weight, 0);

  const safeWeight = enabledWeights > 0 ? enabledWeights : 1;

  return metrics.map((row) => {
    const attendanceReliability = row.attendance_marks > 0
      ? clamp((row.attendance_present_like / row.attendance_marks) * 100, 0, 100)
      : 0;

    const punctuality = row.attendance_present_like > 0
      ? clamp((row.attendance_on_time / row.attendance_present_like) * 100, 0, 100)
      : 0;

    const leaveDiscipline = clamp(100 - ((row.leave_total * 3) + (row.leave_pending * 4) + (row.leave_rejected * 5)), 0, 100);

    const correctionBurden = clamp(100 - row.correction_requests * 10, 0, 100);

    const compliancePenalty = (row.credential_expired * 25) + (row.document_expired * 25) + (row.credential_pending * 8) + (row.document_pending * 8);
    const complianceHygiene = clamp(100 - compliancePenalty, 0, 100);

    const scoreBreakdown = {
      attendance_reliability: Number(attendanceReliability.toFixed(2)),
      punctuality: Number(punctuality.toFixed(2)),
      leave_discipline: Number(leaveDiscipline.toFixed(2)),
      correction_burden: Number(correctionBurden.toFixed(2)),
      compliance_hygiene: Number(complianceHygiene.toFixed(2)),
    };

    const weighted =
      (factors.attendance_reliability.enabled ? scoreBreakdown.attendance_reliability * factors.attendance_reliability.weight : 0) +
      (factors.punctuality.enabled ? scoreBreakdown.punctuality * factors.punctuality.weight : 0) +
      (factors.leave_discipline.enabled ? scoreBreakdown.leave_discipline * factors.leave_discipline.weight : 0) +
      (factors.correction_burden.enabled ? scoreBreakdown.correction_burden * factors.correction_burden.weight : 0) +
      (factors.compliance_hygiene.enabled ? scoreBreakdown.compliance_hygiene * factors.compliance_hygiene.weight : 0);

    return {
      ...row,
      score: Number((weighted / safeWeight).toFixed(2)),
      score_breakdown: scoreBreakdown,
    };
  });
}

export function applyEmployeeSort(rows: EmployeeScoreRow[], sortBy: string, sortDir: "asc" | "desc") {
  const dir = sortDir === "asc" ? 1 : -1;
  const sorted = [...rows];

  sorted.sort((a, b) => {
    const aValue = (a as any)[sortBy];
    const bValue = (b as any)[sortBy];

    if (sortBy === "name" || sortBy === "user_code" || sortBy === "role" || sortBy === "department") {
      return String(aValue ?? "").localeCompare(String(bValue ?? "")) * dir;
    }

    return (Number(aValue ?? 0) - Number(bValue ?? 0)) * dir;
  });

  return sorted;
}

export function paginate<T>(rows: T[], page: number, pageSize: number) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeSize = Number.isFinite(pageSize) ? clamp(Math.floor(pageSize), 1, 100) : 20;
  const start = (safePage - 1) * safeSize;
  const items = rows.slice(start, start + safeSize);

  return {
    page: safePage,
    page_size: safeSize,
    total: rows.length,
    total_pages: Math.max(1, Math.ceil(rows.length / safeSize)),
    items,
  };
}

export function bucketSqlExpression(bucket: WorkforceBucket, columnSql: string) {
  if (bucket === "month") return `date_trunc('month', ${columnSql})::date`;
  if (bucket === "week") return `date_trunc('week', ${columnSql})::date`;
  return `(${columnSql})::date`;
}
