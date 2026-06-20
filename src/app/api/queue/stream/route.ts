import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import { createQueueEventStream } from "@/src/lib/server/queueEvents";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await getAuthenticatedUser(req);
    return createQueueEventStream(req);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to open queue stream" }, { status: 500 });
  }
}
