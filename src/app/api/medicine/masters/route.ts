import { NextRequest, NextResponse } from "next/server";

import { AuthError, getAuthenticatedUser } from "@/src/lib/server/auth";
import {
  archiveMedicineMaster,
  ensureMedicineMaster,
  fetchMedicineMasters,
  isMedicineMasterType,
  type MedicineMasterType,
} from "@/src/lib/server/medicineMasters";

function readType(value: string | null): MedicineMasterType | null {
  if (!value || !isMedicineMasterType(value)) {
    return null;
  }

  return value;
}

export async function GET(request: NextRequest) {
  try {
    await getAuthenticatedUser(request);
    const type = readType(request.nextUrl.searchParams.get("type"));
    const term = request.nextUrl.searchParams.get("q") ?? "";

    if (!type) {
      return NextResponse.json({ error: "Valid master type is required" }, { status: 400 });
    }

    const records = await fetchMedicineMasters(type, term, 50);
    return NextResponse.json({
      success: true,
      data: records,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Get medicine masters error:", error);
    return NextResponse.json({ error: "Failed to fetch medicine masters" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await getAuthenticatedUser(request);
    const body = await request.json();
    const type = readType(body?.type);
    const name = typeof body?.name === "string" ? body.name : "";

    if (!type) {
      return NextResponse.json({ error: "Valid master type is required" }, { status: 400 });
    }

    if (!name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const record = await ensureMedicineMaster(type, name);

    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        name: record.name,
        type,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Create medicine master error:", error);
    const message = error instanceof Error ? error.message : "Failed to create medicine master";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await getAuthenticatedUser(request);
    const body = await request.json();
    const type = readType(body?.type);
    const id = Number(body?.id);

    if (!type) {
      return NextResponse.json({ error: "Valid master type is required" }, { status: 400 });
    }

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Valid record id is required" }, { status: 400 });
    }

    const record = await archiveMedicineMaster(type, id);

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        name: record.name,
        type,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Delete medicine master error:", error);
    return NextResponse.json({ error: "Failed to delete medicine master" }, { status: 500 });
  }
}
