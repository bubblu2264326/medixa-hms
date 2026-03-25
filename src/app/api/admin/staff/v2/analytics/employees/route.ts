import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import {
  applyEmployeeSort,
  applyPerformanceScore,
  fetchEmployeeMetrics,
  getScoreConfig,
  paginate,
  WorkforceBucket,
  RoleLens,
} from "@/src/lib/server/workforceAnalytics";

function parsePositiveInt(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);

    const { searchParams } = new URL(req.url);

    const accountTypeParam = searchParams.get("account_type");
    const accountType: "all" | "staff" | "doctor" =
      accountTypeParam === "staff" || accountTypeParam === "doctor" ? accountTypeParam : "all";

    const roleLensParam = searchParams.get("role_lens");
    const roleLens: RoleLens = roleLensParam === "staff" || roleLensParam === "doctor" ? roleLensParam : "all";

    const bucketParam = searchParams.get("bucket");
    const bucket: WorkforceBucket = bucketParam === "day" || bucketParam === "month" ? bucketParam : "week";

    const fromDate = searchParams.get("from") ?? new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    const toDate = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);

    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = parsePositiveInt(searchParams.get("page_size"), 20);

    const sortBy = searchParams.get("sort_by") ?? "score";
    const sortDir = searchParams.get("sort_dir") === "asc" ? "asc" : "desc";

    const employeeAccountTypeParam = searchParams.get("employee_account_type");
    const employeeAccountType: "staff" | "doctor" | null =
      employeeAccountTypeParam === "staff" || employeeAccountTypeParam === "doctor" ? employeeAccountTypeParam : null;

    const employeePersonIdRaw = Number(searchParams.get("employee_person_id") ?? 0);
    const employeePersonId = Number.isFinite(employeePersonIdRaw) && employeePersonIdRaw > 0 ? employeePersonIdRaw : null;

    const employeeSearch = searchParams.get("employee_search");
    const department = searchParams.get("department");
    const facilityCode = searchParams.get("facility_code");

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
    const sorted = applyEmployeeSort(scored, sortBy, sortDir);
    const paged = paginate(sorted, page, pageSize);

    return NextResponse.json({
      filters: {
        from: fromDate,
        to: toDate,
        account_type: accountType,
        role_lens: roleLens,
        bucket,
        department: department ?? null,
        facility_code: facilityCode ?? null,
        employee_account_type: employeeAccountType,
        employee_person_id: employeePersonId,
        employee_search: employeeSearch ?? null,
      },
      sorting: {
        sort_by: sortBy,
        sort_dir: sortDir,
      },
      score_config: {
        updated_at: updatedAt,
        config,
      },
      page: paged.page,
      page_size: paged.page_size,
      total: paged.total,
      total_pages: paged.total_pages,
      items: paged.items,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("staff v2 analytics employees GET error", error);
    return NextResponse.json({ error: "Failed to load employee analytics" }, { status: 500 });
  }
}
