import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";

const PARAMETER_COLUMNS =
  "parameter_id, test_id, parameter_name, parameter_code, unit, input_type, " +
  "reference_range_min, reference_range_max, reference_value_text, display_order, is_critical, is_required";

// GET /api/lab/testParameters/[test_id]
// Returns the result parameters (reference ranges, units, flags) for a lab test,
// ordered for display. Used by the lab result-entry screen to render input rows
// and drive normal-range flagging. An empty array is a VALID response — a test
// may simply have no parameters configured yet (the previous implementation
// wrongly 500'd on zero rows, breaking result entry for such tests).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ test_id: string }> }
) {
  try {
    await getAuthenticatedUser(req);
    const { test_id } = await params;
    const testId = Number(test_id);
    if (!Number.isInteger(testId) || testId <= 0) {
      return NextResponse.json({ error: "Invalid test_id" }, { status: 400 });
    }

    const res = await query(
      `SELECT ${PARAMETER_COLUMNS}
       FROM lab_test_parameters
       WHERE test_id = $1
       ORDER BY display_order ASC, parameter_id ASC`,
      [testId]
    );
    return NextResponse.json(res.rows, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("lab/testParameters GET error", err);
    return NextResponse.json({ error: "Failed to fetch test parameters" }, { status: 500 });
  }
}
