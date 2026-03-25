import { createAuditEventStream } from "@/src/lib/server/auditEvents";
import { AuthError, requireAdminOrSuperAdmin } from "@/src/lib/server/auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrSuperAdmin(req);
    return createAuditEventStream(req);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
