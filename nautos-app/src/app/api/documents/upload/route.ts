import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents, ingestionJobs } from "@/lib/db/schema";
import { uploadToS3 } from "@/lib/s3";
import { dispatchCeleryTask } from "@/lib/redis";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string | null;
  const docType = formData.get("docType") as string | null;
  const vesselId = (formData.get("vesselId") as string) || null;
  const scope = (formData.get("scope") as string) || "vessel";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File exceeds 500MB limit" }, { status: 400 });
  }

  if (!title || !docType) {
    return NextResponse.json({ error: "Title and docType are required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const s3Key = `${tenantId}/${randomUUID()}/${file.name}`;

  await uploadToS3(s3Key, buffer, "application/pdf");

  const [doc] = await db
    .insert(documents)
    .values({
      tenantId,
      vesselId,
      title,
      docType,
      scope,
      s3Key,
      ocrStatus: "pending",
    })
    .returning();

  await db.insert(ingestionJobs).values({
    documentId: doc.id,
    status: "queued",
  });

  await dispatchCeleryTask("ingest_document", [doc.id]);

  return NextResponse.json({ document: doc }, { status: 201 });
}
