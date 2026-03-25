import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock("@/database/db", () => ({
  query: queryMock,
}));

import { computePayrollLines } from "@/src/lib/server/workforceFinance";

describe("workforce payroll computation", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("computes fixed staff salary with unpaid leave deduction and doctor per-patient payout", async () => {
    queryMock.mockImplementation(async (sql: unknown, params?: any[]) => {
      const text = String(sql);

      if (text.includes("FROM employee_compensation_profile")) {
        return {
          rows: [
            {
              compensation_id: 1,
              account_type: "staff",
              person_id: 11,
              staff_id: 11,
              doctor_id: null,
              salary_model: "fixed_monthly",
              base_monthly_salary: "30000",
              per_patient_fee: "0",
              user_code: "STF011",
              person_name: "A Staff",
              person_role: "Receptionist",
            },
            {
              compensation_id: 2,
              account_type: "doctor",
              person_id: 5,
              staff_id: null,
              doctor_id: 5,
              salary_model: "per_patient_seen",
              base_monthly_salary: "0",
              per_patient_fee: "500",
              user_code: "DOC005",
              person_name: "Dr B",
              person_role: "Doctor",
            },
          ],
        };
      }

      if (text.includes("FROM employee_allowance")) {
        return {
          rows: [
            {
              allowance_id: 1,
              account_type: "staff",
              person_id: 11,
              allowance_code: "TRAVEL",
              allowance_name: "Travel",
              amount: "2000",
              allowance_mode: "recurring",
              effective_from: "2026-03-01",
            },
            {
              allowance_id: 2,
              account_type: "doctor",
              person_id: 5,
              allowance_code: "PHONE",
              allowance_name: "Phone",
              amount: "1000",
              allowance_mode: "recurring",
              effective_from: "2026-03-01",
            },
          ],
        };
      }

      if (text.includes("FROM staff_leave_requests lr")) {
        if (params?.[0] === "staff" && Number(params?.[1]) === 11) {
          return { rows: [{ unpaid_days: 2 }] };
        }
        return { rows: [{ unpaid_days: 0 }] };
      }

      if (text.includes("FROM visit v")) {
        return { rows: [{ checked_count: 10 }] };
      }

      return { rows: [] };
    });

    const result = await computePayrollLines("2026-03");

    expect(result.periodMonth).toBe("2026-03-01");
    expect(result.lines).toHaveLength(2);

    const staff = result.lines.find((line) => line.accountType === "staff");
    const doctor = result.lines.find((line) => line.accountType === "doctor");

    expect(staff).toBeTruthy();
    expect(doctor).toBeTruthy();

    expect(staff?.baseAmount).toBe(30000);
    expect(staff?.allowanceTotal).toBe(2000);
    expect(staff?.deductionTotal).toBe(2000);
    expect(staff?.netAmount).toBe(30000);

    expect(doctor?.patientCount).toBe(10);
    expect(doctor?.baseAmount).toBe(5000);
    expect(doctor?.allowanceTotal).toBe(1000);
    expect(doctor?.netAmount).toBe(6000);
  });
});
