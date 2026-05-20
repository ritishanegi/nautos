import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.json({
    headers: {
      "x-user-id": req.headers.get("x-user-id"),
      "x-tenant-id": req.headers.get("x-tenant-id"),
      "x-user-role": req.headers.get("x-user-role"),
      cookie: req.headers.get("cookie") ? "present" : "missing",
    },
  });
}
