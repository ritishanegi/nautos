import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { equipment } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";

const createEquipmentSchema = z.object({
  manufacturer: z.string().min(1),
  modelType: z.string().min(1),
  serialNumber: z.string().optional(),
  vesselId: z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const vesselId = url.searchParams.get("vesselId");

  const result = vesselId
    ? await db
        .select()
        .from(equipment)
        .where(and(eq(equipment.vesselId, vesselId), eq(equipment.tenantId, tenantId)))
        .orderBy(desc(equipment.createdAt))
    : await db
        .select()
        .from(equipment)
        .where(eq(equipment.tenantId, tenantId))
        .orderBy(desc(equipment.createdAt));

  return NextResponse.json({ equipment: result });
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createEquipmentSchema.parse(body);

    const [item] = await db
      .insert(equipment)
      .values({
        tenantId,
        manufacturer: data.manufacturer,
        modelType: data.modelType,
        serialNumber: data.serialNumber || null,
        vesselId: data.vesselId || null,
      })
      .returning();

    return NextResponse.json({ equipment: item }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Create equipment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
