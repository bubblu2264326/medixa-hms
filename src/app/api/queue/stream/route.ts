import { createQueueEventStream } from "@/src/lib/server/queueEvents";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return createQueueEventStream(req);
}
