import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import {
  applyEmployeeSort,
  applyPerformanceScore,
  bucketSqlExpression,
  fetchEmployeeMetrics,
  getScoreConfig,
  paginate,
  WorkforceBucket,
  RoleLens,
} from "@/src/lib/server/workforceAnalytics";

function toNullableNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parsePositiveInt(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function parseBucket(value: string | null): WorkforceBucket {
  if (value === "day" || value === "month") return value;
  return "week";
}

function parseRoleLens(value: string | null): RoleLens {
  if (value === "staff" || value === "doctor") return value;
  return "all";
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);

    const { searchParams } = new URL(req.url);

    const accountTypeParam = searchParams.get("account_type");
    const accountType: "all" | "staff" | "doctor" =
      accountTypeParam === "staff" || accountTypeParam === "doctor" ? accountTypeParam : "all";

    const roleLens = parseRoleLens(searchParams.get("role_lens"));
    const view = searchParams.get("view") ?? "overview";
    const bucket = parseBucket(searchParams.get("bucket"));

    const fromDate = searchParams.get("from") ?? new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    const toDate = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);

    const department = searchParams.get("department");
    const facilityCode = searchParams.get("facility_code");

    const employeeAccountTypeParam = searchParams.get("employee_account_type");
    const employeeAccountType: "staff" | "doctor" | null =
      employeeAccountTypeParam === "staff" || employeeAccountTypeParam === "doctor" ? employeeAccountTypeParam : null;
    const employeePersonId = toNullableNumber(searchParams.get("employee_person_id"));
    const employeeSearch = searchParams.get("employee_search");

    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = parsePositiveInt(searchParams.get("page_size"), 20);
    const sortBy = searchParams.get("sort_by") ?? "score";
    const sortDir = searchParams.get("sort_dir") === "asc" ? "asc" : "desc";

    const includeFinance = searchParams.get("include_finance") !== "false";

    const { config, updatedAt } = await getScoreConfig();

    const metrics = await fetchEmployeeMetrics({
      fromDate,
      toDate,
      accountType,
      roleLens,
      department,
      facilityCode,
      employeeAccountType,
      employeePersonId,
      employeeSearch,
      bucket,
    });

    const scored = applyPerformanceScore(metrics, config);
    const sortedByScore = applyEmployeeSort(scored, "score", "desc");
    const sortedForExplorer = applyEmployeeSort(scored, sortBy, sortDir);
    const explorerPage = paginate(sortedForExplorer, page, pageSize);

    const totalEmployees = scored.length;
    const attendanceMarks = scored.reduce((sum, row) => sum + row.attendance_marks, 0);
    const attendancePresentLike = scored.reduce((sum, row) => sum + row.attendance_present_like, 0);
    const attendanceRate = attendanceMarks > 0 ? Number(((attendancePresentLike / attendanceMarks) * 100).toFixed(2)) : 0;

    const leavePending = scored.reduce((sum, row) => sum + row.leave_pending, 0);
    const expiredCredentials = scored.reduce((sum, row) => sum + row.credential_expired, 0);
    const expiredDocuments = scored.reduce((sum, row) => sum + row.document_expired, 0);
    const blockedRuns = scored.reduce((sum, row) => sum + row.lifecycle_blocked, 0);

    const payrollNetTotal = scored.reduce((sum, row) => sum + row.payroll_net_total, 0);
    const payrollGrossTotal = scored.reduce((sum, row) => sum + row.payroll_gross_total, 0);

    const avgMonthlyComp = totalEmployees > 0
      ? Number((scored.reduce((sum, row) => sum + row.avg_monthly_base_salary, 0) / totalEmployees).toFixed(2))
      : 0;

    const costPerAttendanceMark = attendanceMarks > 0
      ? Number((payrollNetTotal / attendanceMarks).toFixed(2))
      : 0;

    const roleMix = [
      {
        label: "Staff",
        value: scored.filter((row) => row.account_type === "staff").length,
      },
      {
        label: "Doctor",
        value: scored.filter((row) => row.account_type === "doctor").length,
      },
    ];

    const bandCounters = {
      "90-100": 0,
      "75-89": 0,
      "60-74": 0,
      "0-59": 0,
    };

    for (const row of sortedByScore) {
      if (row.score >= 90) bandCounters["90-100"] += 1;
      else if (row.score >= 75) bandCounters["75-89"] += 1;
      else if (row.score >= 60) bandCounters["60-74"] += 1;
      else bandCounters["0-59"] += 1;
    }

    const scoreDistribution = Object.entries(bandCounters).map(([label, value]) => ({ label, value }));

    const attendanceBucketExpr = bucketSqlExpression(bucket, "a.date");
    const leaveBucketExpr = bucketSqlExpression(bucket, "lr.requested_at::date");

    const [attendanceTrend, leaveTrend, activeSessionsResult] = await Promise.all([
      query(
        `
        WITH attendance_union AS (
          SELECT
            'staff'::text AS account_type,
            a.staff_id::int AS person_id,
            COALESCE(a.derived_status, LOWER(COALESCE(a.status, 'unscheduled'))) AS status,
            ${attendanceBucketExpr} AS bucket_start
          FROM staff_attendance a
          JOIN staff s ON s.staff_id = a.staff_id
          WHERE a.date BETWEEN $1::date AND $2::date
            AND ($3::text = 'all' OR $3::text = 'staff')
            AND ($4::text = 'all' OR $4::text = 'staff')
            AND ($5::text IS NULL OR s.department = $5::text)
            AND ($6::text IS NULL OR COALESCE(s.facility_code, 'MAIN') = $6::text)
            AND (
              $7::int IS NULL OR $7::int <= 0 OR
              ($8::text = 'staff' AND a.staff_id = $7::int)
            )

          UNION ALL

          SELECT
            'doctor'::text AS account_type,
            a.doctor_id::int AS person_id,
            COALESCE(a.derived_status, LOWER(COALESCE(a.status, 'unscheduled'))) AS status,
            ${attendanceBucketExpr} AS bucket_start
          FROM doctor_attendance a
          JOIN doctor d ON d.doctor_id = a.doctor_id
          WHERE a.date BETWEEN $1::date AND $2::date
            AND ($3::text = 'all' OR $3::text = 'doctor')
            AND ($4::text = 'all' OR $4::text = 'doctor')
            AND ($5::text IS NULL OR d.specialization = $5::text)
            AND ($6::text IS NULL OR 'MAIN' = $6::text)
            AND (
              $7::int IS NULL OR $7::int <= 0 OR
              ($8::text = 'doctor' AND a.doctor_id = $7::int)
            )
        )
        SELECT
          bucket_start::text AS bucket,
          COUNT(*)::int AS marks,
          COUNT(*) FILTER (WHERE status IN ('present', 'on_time', 'late', 'scheduled'))::int AS present_like,
          COUNT(*) FILTER (WHERE status IN ('on_time', 'present', 'scheduled'))::int AS on_time,
          COUNT(*) FILTER (WHERE status = 'late')::int AS late,
          COUNT(*) FILTER (WHERE status IN ('absent', 'missed'))::int AS absent
        FROM attendance_union
        GROUP BY bucket_start
        ORDER BY bucket_start ASC
        `,
        [fromDate, toDate, accountType, roleLens, department, facilityCode, employeePersonId, employeeAccountType]
      ),
      query(
        `
        SELECT
          ${leaveBucketExpr}::text AS bucket,
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE lr.request_status = 'pending')::int AS pending,
          COUNT(*) FILTER (WHERE lr.request_status = 'approved')::int AS approved,
          COUNT(*) FILTER (WHERE lr.request_status = 'rejected')::int AS rejected
        FROM staff_leave_requests lr
        LEFT JOIN staff s ON s.staff_id = lr.staff_id
        LEFT JOIN doctor d ON d.doctor_id = lr.doctor_id
        WHERE lr.requested_at::date BETWEEN $1::date AND $2::date
          AND ($3::text = 'all' OR COALESCE(lr.account_type, CASE WHEN lr.doctor_id IS NOT NULL THEN 'doctor' ELSE 'staff' END) = $3::text)
          AND ($4::text = 'all' OR COALESCE(lr.account_type, CASE WHEN lr.doctor_id IS NOT NULL THEN 'doctor' ELSE 'staff' END) = $4::text)
          AND ($5::text IS NULL OR COALESCE(s.department, d.specialization) = $5::text)
          AND ($6::text IS NULL OR COALESCE(s.facility_code, 'MAIN') = $6::text)
          AND (
            $7::int IS NULL OR $7::int <= 0 OR
            ($8::text = 'staff' AND lr.staff_id = $7::int) OR
            ($8::text = 'doctor' AND lr.doctor_id = $7::int)
          )
        GROUP BY ${leaveBucketExpr}
        ORDER BY ${leaveBucketExpr} ASC
        `,
        [fromDate, toDate, accountType, roleLens, department, facilityCode, employeePersonId, employeeAccountType]
      ),
      query(
        `
        SELECT
          (COALESCE(stf.active_staff_sessions, 0) + COALESCE(doc.active_doctor_sessions, 0))::int AS active_sessions,
          COALESCE(stf.active_staff_sessions, 0)::int AS active_staff_sessions,
          COALESCE(doc.active_doctor_sessions, 0)::int AS active_doctor_sessions
        FROM
          (
            SELECT COUNT(*) AS active_staff_sessions
            FROM staff_security_sessions ss
            JOIN staff s ON s.staff_id = ss.staff_id
            WHERE ss.revoked_at IS NULL
              AND ss.last_seen_at >= (CURRENT_TIMESTAMP - INTERVAL '24 hour')
              AND ($1::text = 'all' OR $1::text = 'staff')
              AND ($2::text = 'all' OR $2::text = 'staff')
              AND ($3::text IS NULL OR s.department = $3::text)
              AND ($4::text IS NULL OR COALESCE(s.facility_code, 'MAIN') = $4::text)
              AND ($5::int IS NULL OR $5::int <= 0 OR ($6::text = 'staff' AND ss.staff_id = $5::int))
          ) stf
        CROSS JOIN
          (
            SELECT COUNT(*) AS active_doctor_sessions
            FROM doctor_security_sessions ds
            JOIN doctor d ON d.doctor_id = ds.doctor_id
            WHERE ds.revoked_at IS NULL
              AND ds.last_seen_at >= (CURRENT_TIMESTAMP - INTERVAL '24 hour')
              AND ($1::text = 'all' OR $1::text = 'doctor')
              AND ($2::text = 'all' OR $2::text = 'doctor')
              AND ($3::text IS NULL OR d.specialization = $3::text)
              AND ($4::text IS NULL OR 'MAIN' = $4::text)
              AND ($5::int IS NULL OR $5::int <= 0 OR ($6::text = 'doctor' AND ds.doctor_id = $5::int))
          ) doc
        `,
        [accountType, roleLens, department, facilityCode, employeePersonId, employeeAccountType]
      ),
    ]);

    const attendanceSeries = (attendanceTrend.rows ?? []).map((row) => {
      const marks = Number(row.marks ?? 0);
      const presentLike = Number(row.present_like ?? 0);
      return {
        bucket: String(row.bucket),
        marks,
        present_like: presentLike,
        on_time: Number(row.on_time ?? 0),
        late: Number(row.late ?? 0),
        absent: Number(row.absent ?? 0),
        rate_percent: marks > 0 ? Number(((presentLike / marks) * 100).toFixed(2)) : 0,
      };
    });

    const leaveSeries = (leaveTrend.rows ?? []).map((row) => ({
      bucket: String(row.bucket),
      total: Number(row.total ?? 0),
      pending: Number(row.pending ?? 0),
      approved: Number(row.approved ?? 0),
      rejected: Number(row.rejected ?? 0),
    }));

    const activeSessions = {
      active_sessions: Number(activeSessionsResult.rows[0]?.active_sessions ?? 0),
      active_staff_sessions: Number(activeSessionsResult.rows[0]?.active_staff_sessions ?? 0),
      active_doctor_sessions: Number(activeSessionsResult.rows[0]?.active_doctor_sessions ?? 0),
    };

    const financeTrend = includeFinance
      ? await query(
        `
        SELECT
          ${bucketSqlExpression(bucket, "pr.period_month")}::text AS bucket,
          COALESCE(SUM(pli.net_amount), 0)::numeric AS net_total,
          COALESCE(SUM(pli.gross_amount), 0)::numeric AS gross_total,
          COUNT(*)::int AS payroll_lines
        FROM payroll_line_item pli
        JOIN payroll_run pr ON pr.payroll_run_id = pli.payroll_run_id
        LEFT JOIN staff s ON s.staff_id = pli.staff_id
        LEFT JOIN doctor d ON d.doctor_id = pli.doctor_id
        WHERE pr.status = 'finalized'
          AND pr.period_month >= date_trunc('month', $1::date)::date
          AND pr.period_month <= date_trunc('month', $2::date)::date
          AND ($3::text = 'all' OR pli.account_type = $3::text)
          AND ($4::text = 'all' OR pli.account_type = $4::text)
          AND ($5::text IS NULL OR COALESCE(s.department, d.specialization) = $5::text)
          AND ($6::text IS NULL OR COALESCE(s.facility_code, 'MAIN') = $6::text)
          AND ($7::int IS NULL OR $7::int <= 0 OR (pli.person_id = $7::int AND ($8::text IS NULL OR pli.account_type = $8::text)))
        GROUP BY ${bucketSqlExpression(bucket, "pr.period_month")}
        ORDER BY ${bucketSqlExpression(bucket, "pr.period_month")} ASC
        `,
        [fromDate, toDate, accountType, roleLens, department, facilityCode, employeePersonId, employeeAccountType]
      )
      : { rows: [] as any[] };

    const financeSeries = (financeTrend.rows ?? []).map((row) => ({
      bucket: String(row.bucket),
      net_total: Number(row.net_total ?? 0),
      gross_total: Number(row.gross_total ?? 0),
      payroll_lines: Number(row.payroll_lines ?? 0),
    }));

    const compensationDistribution = [
      { label: "0-50k", value: 0 },
      { label: "50k-100k", value: 0 },
      { label: "100k-200k", value: 0 },
      { label: "200k+", value: 0 },
    ];

    for (const row of scored) {
      const salary = row.avg_monthly_base_salary;
      if (salary < 50000) compensationDistribution[0].value += 1;
      else if (salary < 100000) compensationDistribution[1].value += 1;
      else if (salary < 200000) compensationDistribution[2].value += 1;
      else compensationDistribution[3].value += 1;
    }

    const salaryModelMix = [
      {
        label: "Fixed Monthly",
        value: scored.filter((row) => row.salary_model_fixed_count > 0).length,
      },
      {
        label: "Per Patient",
        value: scored.filter((row) => row.salary_model_per_patient_count > 0).length,
      },
    ];

    const alerts = [
      {
        id: "credential-expired",
        severity: "critical",
        title: "Expired credentials",
        count: expiredCredentials,
        description: "Employees with expired credential records need immediate renewal action.",
      },
      {
        id: "document-expired",
        severity: "warning",
        title: "Expired documents",
        count: expiredDocuments,
        description: "Documents out of date could impact compliance and audit readiness.",
      },
      {
        id: "lifecycle-blocked",
        severity: "warning",
        title: "Blocked lifecycle runs",
        count: blockedRuns,
        description: "Onboarding/offboarding runs are blocked and may require task resolution.",
      },
      {
        id: "leave-pending",
        severity: "info",
        title: "Pending leave approvals",
        count: leavePending,
        description: "Leave requests waiting for action in the selected period.",
      },
    ];

    const selectedEmployee = employeePersonId && employeeAccountType
      ? sortedByScore.find((row) => row.person_id === employeePersonId && row.account_type === employeeAccountType) ?? null
      : null;

    const selectedAttendanceTrend = selectedEmployee
      ? attendanceSeries
      : [];

    const selectedLeaveTrend = selectedEmployee
      ? leaveSeries
      : [];

    const selectedInsights = selectedEmployee
      ? {
          attendance_rate_percent:
            selectedEmployee.attendance_marks > 0
              ? Number(((selectedEmployee.attendance_present_like / selectedEmployee.attendance_marks) * 100).toFixed(2))
              : 0,
          punctuality_percent:
            selectedEmployee.attendance_present_like > 0
              ? Number(((selectedEmployee.attendance_on_time / selectedEmployee.attendance_present_like) * 100).toFixed(2))
              : 0,
          absence_percent:
            selectedEmployee.attendance_marks > 0
              ? Number(((selectedEmployee.attendance_absent / selectedEmployee.attendance_marks) * 100).toFixed(2))
              : 0,
          compliance_risk_count:
            Number(selectedEmployee.credential_expired ?? 0) +
            Number(selectedEmployee.document_expired ?? 0) +
            Number(selectedEmployee.credential_pending ?? 0) +
            Number(selectedEmployee.document_pending ?? 0),
        }
      : null;

    return NextResponse.json({
      filters: {
        from: fromDate,
        to: toDate,
        account_type: accountType,
        role_lens: roleLens,
        bucket,
        view,
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_dir: sortDir,
        department: department ?? null,
        facility_code: facilityCode ?? null,
        employee_account_type: employeeAccountType,
        employee_person_id: employeePersonId,
        employee_search: employeeSearch ?? null,
        include_finance: includeFinance,
      },
      score_config: {
        updated_at: updatedAt,
        config,
      },
      overview: {
        kpis: {
          total_employees: totalEmployees,
          attendance_rate_percent: attendanceRate,
          attendance_marks: attendanceMarks,
          leave_pending: leavePending,
          active_sessions: activeSessions.active_sessions,
          expired_credentials: expiredCredentials,
          expired_documents: expiredDocuments,
          blocked_lifecycle_runs: blockedRuns,
          payroll_net_total: Number(payrollNetTotal.toFixed(2)),
          avg_monthly_compensation: avgMonthlyComp,
          cost_per_attendance_mark: costPerAttendanceMark,
        },
        role_mix: roleMix,
        alerts,
        trend_snapshots: {
          attendance: attendanceSeries,
          leave: leaveSeries,
        },
      },
      performance: {
        score_distribution: scoreDistribution,
        top_performers: sortedByScore.slice(0, 5),
        bottom_performers: [...sortedByScore].reverse().slice(0, 5),
        punctuality_breakdown: [
          {
            label: "On Time",
            value: scored.reduce((sum, row) => sum + row.attendance_on_time, 0),
          },
          {
            label: "Late",
            value: scored.reduce((sum, row) => sum + row.attendance_late, 0),
          },
          {
            label: "Absent",
            value: scored.reduce((sum, row) => sum + row.attendance_absent, 0),
          },
        ],
      },
      finance: includeFinance
        ? {
          totals: {
            payroll_net_total: Number(payrollNetTotal.toFixed(2)),
            payroll_gross_total: Number(payrollGrossTotal.toFixed(2)),
            avg_net_pay_per_employee: totalEmployees > 0 ? Number((payrollNetTotal / totalEmployees).toFixed(2)) : 0,
          },
          payroll_trend: financeSeries,
          compensation_distribution: compensationDistribution,
          salary_model_mix: salaryModelMix,
        }
        : null,
      employee_explorer: {
        selected_employee: selectedEmployee,
        selected_insights: selectedInsights,
        selected_attendance_trend: selectedAttendanceTrend,
        selected_leave_trend: selectedLeaveTrend,
        page: explorerPage.page,
        page_size: explorerPage.page_size,
        total: explorerPage.total,
        total_pages: explorerPage.total_pages,
        items: explorerPage.items,
      },
      trends: {
        attendance: attendanceSeries,
        leave: leaveSeries,
      },
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 analytics GET error", error);
    return NextResponse.json({ error: "Failed to load workforce analytics" }, { status: 500 });
  }
}
