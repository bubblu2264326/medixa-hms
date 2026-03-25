import { NextRequest, NextResponse } from "next/server";
import { query } from "@/database/db";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);

    const [allowanceTypes, expenseCategories] = await Promise.all([
      query(
        `
        SELECT code, label, description, taxable
        FROM allowance_type_master
        ORDER BY label
        `
      ),
      query(
        `
        SELECT code, label, description
        FROM finance_expense_category
        ORDER BY label
        `
      ),
    ]);

    return NextResponse.json({
      allowance_types: allowanceTypes.rows,
      expense_categories: expenseCategories.rows,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("finance masters GET error", error);
    return NextResponse.json({ error: "Failed to load finance masters" }, { status: 500 });
  }
}
