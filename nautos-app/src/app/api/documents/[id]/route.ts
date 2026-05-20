import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents, ingestionJobs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getDownloadUrl } from "@/lib/s3";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.tenantId, tenantId)))
    .limit(1);

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const [job] = await db
    .select()
    .from(ingestionJobs)
    .where(eq(ingestionJobs.documentId, doc.id))
    .limit(1);

  const downloadUrl = await getDownloadUrl(doc.s3Key);

  return NextResponse.json({ document: doc, job, downloadUrl });
}
