import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { requireTenant } from "@/lib/server/api-helpers";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const ctx = requireTenant(req);
  if (ctx instanceof NextResponse) return ctx;

  const docs = await db
    .select()
    .from(documents)
    .where(eq(documents.tenantId, ctx.tenantId))
    .orderBy(desc(documents.createdAt));

  return NextResponse.json({ documents: docs });
}
