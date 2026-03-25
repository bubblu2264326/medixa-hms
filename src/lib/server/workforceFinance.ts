import { query } from "@/database/db";

export type AccountType = "staff" | "doctor";
export type SalaryModel = "fixed_monthly" | "per_patient_seen";

export type PersonRef = {
  accountType: AccountType;
  personId: number;
  userCode: string;
  name: string;
  role: string;
};

export type PayrollComputationLine = {
  accountType: AccountType;
  personId: number;
  staffId: number | null;
  doctorId: number | null;
  userCode: string;
  name: string;
  role: string;
  salaryModel: SalaryModel;
  baseAmount: number;
  patientCount: number;
  perPatientFee: number;
  allowanceTotal: number;
  deductionTotal: number;
  adjustmentTotal: number;
  grossAmount: number;
  netAmount: number;
  calcSnapshot: Record<string, unknown>;
};

type CompensationProfile = {
  compensation_id: number;
  account_type: AccountType;
  person_id: number;
  staff_id: number | null;
  doctor_id: number | null;
  user_code: string;
  person_name: string;
  person_role: string;
  salary_model: SalaryModel;
  base_monthly_salary: string | number;
  per_patient_fee: string | number;
};

type AllowanceRow = {
  allowance_id: number;
  account_type: AccountType;
  person_id: number;
  allowance_code: string;
  allowance_name: string;
  amount: string | number;
  allowance_mode: "recurring" | "one_time";
  effective_from: string;
};

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function monthStartFromInput(rawMonth?: string | null) {
  if (!rawMonth || !/^\d{4}-\d{2}$/.test(rawMonth)) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  const [year, month] = rawMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

export function monthBounds(monthStart: Date) {
  const start = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), 1));
  const endExclusive = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
  const endInclusive = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
  const toDate = (d: Date) => d.toISOString().slice(0, 10);
  return {
    monthStartDate: start,
    monthStart: toDate(start),
    monthEndExclusive: toDate(endExclusive),
    monthEndInclusive: toDate(endInclusive),
    monthLabel: toDate(start).slice(0, 7),
  };
}

export async function resolvePersonByUserCode(userCode: string): Promise<PersonRef | null> {
  const staff = await query(
    `
    SELECT
      'staff'::text AS account_type,
      s.staff_id AS person_id,
      s.user_code,
      s.name AS person_name,
      s.role AS person_role
    FROM staff s
    WHERE s.user_code = $1
    LIMIT 1
    `,
    [userCode]
  );

  if (staff.rows[0]) {
    const row = staff.rows[0];
    return {
      accountType: "staff",
      personId: asNumber(row.person_id),
      userCode: String(row.user_code),
      name: String(row.person_name ?? ""),
      role: String(row.person_role ?? "Staff"),
    };
  }

  const doctor = await query(
    `
    SELECT
      'doctor'::text AS account_type,
      d.doctor_id AS person_id,
      d.user_code,
      d.doctor_name AS person_name,
      'Doctor'::text AS person_role
    FROM doctor d
    WHERE d.user_code = $1
    LIMIT 1
    `,
    [userCode]
  );

  if (!doctor.rows[0]) return null;
  const row = doctor.rows[0];
  return {
    accountType: "doctor",
    personId: asNumber(row.person_id),
    userCode: String(row.user_code),
    name: String(row.person_name ?? ""),
    role: String(row.person_role ?? "Doctor"),
  };
}

async function getCompensationProfiles(monthStart: string, monthEndInclusive: string) {
  const result = await query(
    `
    SELECT
      cp.compensation_id,
      cp.account_type,
      cp.person_id,
      cp.staff_id,
      cp.doctor_id,
      cp.salary_model,
      cp.base_monthly_salary,
      cp.per_patient_fee,
      COALESCE(s.user_code, d.user_code) AS user_code,
      COALESCE(s.name, d.doctor_name) AS person_name,
      COALESCE(s.role, 'Doctor') AS person_role
    FROM employee_compensation_profile cp
    LEFT JOIN staff s ON s.staff_id = cp.staff_id
    LEFT JOIN doctor d ON d.doctor_id = cp.doctor_id
    WHERE cp.active_from <= $2::date
      AND (cp.active_to IS NULL OR cp.active_to >= $1::date)
      AND cp.payroll_cycle = 'monthly'
    ORDER BY cp.account_type, cp.person_id
    `,
    [monthStart, monthEndInclusive]
  );

  return result.rows as CompensationProfile[];
}

async function getApplicableAllowances(monthStart: string, monthEndInclusive: string) {
  const result = await query(
    `
    SELECT
      ea.allowance_id,
      ea.account_type,
      ea.person_id,
      ea.allowance_code,
      ea.allowance_name,
      ea.amount,
      ea.allowance_mode,
      ea.effective_from
    FROM employee_allowance ea
    WHERE ea.is_active = true
      AND ea.effective_from <= $2::date
      AND (ea.effective_to IS NULL OR ea.effective_to >= $1::date)
    ORDER BY ea.account_type, ea.person_id, ea.allowance_id
    `,
    [monthStart, monthEndInclusive]
  );

  return result.rows as AllowanceRow[];
}

async function getSeenPatientCount(doctorId: number, monthStart: string, monthEndExclusive: string) {
  const result = await query(
    `
    SELECT COUNT(*)::int AS checked_count
    FROM visit v
    WHERE v.doctor_id = $1
      AND v.status = 'seen_by_doctor'
      AND v.visit_timestamp >= $2::date
      AND v.visit_timestamp < $3::date
    `,
    [doctorId, monthStart, monthEndExclusive]
  );

  return asNumber(result.rows[0]?.checked_count);
}

async function getUnpaidLeaveDays(
  accountType: AccountType,
  personId: number,
  monthStart: string,
  monthEndInclusive: string
) {
  const result = await query(
    `
    SELECT
      COALESCE(
        SUM((LEAST(lr.to_date, $4::date) - GREATEST(lr.from_date, $3::date) + 1)),
        0
      )::int AS unpaid_days
    FROM staff_leave_requests lr
    JOIN staff_leave_types lt ON lt.leave_type_id = lr.leave_type_id
    WHERE COALESCE(lr.account_type, CASE WHEN lr.doctor_id IS NOT NULL THEN 'doctor' ELSE 'staff' END) = $1
      AND COALESCE(lr.person_id, COALESCE(lr.staff_id, lr.doctor_id)) = $2
      AND lr.request_status = 'approved'
      AND lt.leave_code = 'UNPAID'
      AND lr.to_date >= $3::date
      AND lr.from_date <= $4::date
    `,
    [accountType, personId, monthStart, monthEndInclusive]
  );

  return asNumber(result.rows[0]?.unpaid_days);
}

export async function computePayrollLines(periodMonthInput?: string | null): Promise<{
  periodMonth: string;
  lines: PayrollComputationLine[];
}> {
  const monthStartDate = monthStartFromInput(periodMonthInput);
  const { monthStart, monthEndInclusive, monthEndExclusive } = monthBounds(monthStartDate);

  const [profiles, allowances] = await Promise.all([
    getCompensationProfiles(monthStart, monthEndInclusive),
    getApplicableAllowances(monthStart, monthEndInclusive),
  ]);

  const allowanceMap = new Map<string, AllowanceRow[]>();
  for (const row of allowances) {
    const key = `${row.account_type}:${row.person_id}`;
    const list = allowanceMap.get(key) ?? [];
    list.push(row);
    allowanceMap.set(key, list);
  }

  const lines: PayrollComputationLine[] = [];
  for (const profile of profiles) {
    const key = `${profile.account_type}:${profile.person_id}`;
    const rows = allowanceMap.get(key) ?? [];

    const allowanceTotal = rows.reduce((acc, item) => {
      if (item.allowance_mode === "recurring") return acc + asNumber(item.amount);
      const effectiveMonth = String(item.effective_from).slice(0, 7);
      return effectiveMonth === monthStart.slice(0, 7) ? acc + asNumber(item.amount) : acc;
    }, 0);

    const salaryModel: SalaryModel = profile.salary_model === "per_patient_seen" ? "per_patient_seen" : "fixed_monthly";
    const baseMonthly = asNumber(profile.base_monthly_salary);
    const perPatientFee = asNumber(profile.per_patient_fee);

    let patientCount = 0;
    let baseAmount = baseMonthly;

    if (salaryModel === "per_patient_seen") {
      patientCount = await getSeenPatientCount(asNumber(profile.doctor_id), monthStart, monthEndExclusive);
      baseAmount = patientCount * perPatientFee;
    }

    let deductionTotal = 0;
    if (salaryModel === "fixed_monthly") {
      const unpaidDays = await getUnpaidLeaveDays(profile.account_type, profile.person_id, monthStart, monthEndInclusive);
      const dailyRate = baseMonthly / 30;
      deductionTotal = Number((unpaidDays * dailyRate).toFixed(2));
    }

    const grossAmount = Number((baseAmount + allowanceTotal).toFixed(2));
    const netAmount = Number(Math.max(0, grossAmount - deductionTotal).toFixed(2));

    lines.push({
      accountType: profile.account_type,
      personId: profile.person_id,
      staffId: profile.staff_id,
      doctorId: profile.doctor_id,
      userCode: String(profile.user_code ?? ""),
      name: String(profile.person_name ?? ""),
      role: String(profile.person_role ?? ""),
      salaryModel,
      baseAmount,
      patientCount,
      perPatientFee,
      allowanceTotal,
      deductionTotal,
      adjustmentTotal: 0,
      grossAmount,
      netAmount,
      calcSnapshot: {
        period_month: monthStart.slice(0, 7),
        salary_model: salaryModel,
        allowances: rows.map((item) => ({
          allowance_id: item.allowance_id,
          allowance_code: item.allowance_code,
          allowance_name: item.allowance_name,
          amount: asNumber(item.amount),
          mode: item.allowance_mode,
        })),
      },
    });
  }

  return {
    periodMonth: monthStart,
    lines,
  };
}
