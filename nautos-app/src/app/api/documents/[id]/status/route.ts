import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ingestionJobs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [job] = await db
    .select()
    .from(ingestionJobs)
    .where(eq(ingestionJobs.documentId, id))
    .limit(1);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({ job });
}
