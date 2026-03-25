import { NextResponse } from "next/server";
import { getSystemTimezone } from "@/src/lib/server/systemTimezone";

export async function GET() {
  try {
    const timeZone = await getSystemTimezone();
    return NextResponse.json({ time_zone: timeZone });
  } catch (error) {
    console.error("public system-timezone route error:", error);
    return NextResponse.json({ time_zone: "Asia/Karachi" });
  }
}
