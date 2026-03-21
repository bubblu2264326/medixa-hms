import { getAuthenticatedDoctor } from "@/src/lib/server/doctor";
import { createQueueEventStream } from "@/src/lib/server/queueEvents";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await getAuthenticatedDoctor(req);
    return createQueueEventStream(req);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to open queue stream";
    const status = message === "Not authenticated" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
