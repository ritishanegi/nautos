import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const docs = await db
    .select()
    .from(documents)
    .where(eq(documents.tenantId, tenantId))
    .orderBy(desc(documents.createdAt));

  return NextResponse.json({ documents: docs });
}
