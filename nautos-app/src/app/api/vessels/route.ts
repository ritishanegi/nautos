import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vessels } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const createVesselSchema = z.object({
  name: z.string().min(2),
  imo: z.string().max(20).optional(),
  vesselType: z.string().max(100).optional(),
  flagState: z.string().max(100).optional(),
});

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db
    .select()
    .from(vessels)
    .where(eq(vessels.tenantId, tenantId))
    .orderBy(desc(vessels.createdAt));

  return NextResponse.json({ vessels: result });
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createVesselSchema.parse(body);

    const [vessel] = await db
      .insert(vessels)
      .values({
        tenantId,
        name: data.name,
        imo: data.imo || null,
        vesselType: data.vesselType || null,
        flagState: data.flagState || null,
      })
      .returning();

    return NextResponse.json({ vessel }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Create vessel error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
