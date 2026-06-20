import { NextRequest, NextResponse } from "next/server";
import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";

const DEPRECATION_MESSAGE =
  "The legacy dispenseMedicine endpoint has been retired. Use the Retail POS transaction APIs under /api/transactions instead.";

export async function POST(req: NextRequest) {
  try {
    await getAuthenticatedUser(req);
    return NextResponse.json(
      {
        success: false,
        error: DEPRECATION_MESSAGE,
      },
      { status: 410 }
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "something went wrong" }, { status: 500 });
  }
}
