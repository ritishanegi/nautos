import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { tenants, users } from "@/lib/db/schema";
import { hashPassword, createToken } from "@/lib/auth";
import { eq } from "drizzle-orm";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  companyName: z.string().min(2),
  subdomain: z
    .string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9-]+$/),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const existingTenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.subdomain, data.subdomain))
      .limit(1);

    if (existingTenant.length > 0) {
      return NextResponse.json(
        { error: "Subdomain already taken" },
        { status: 409 }
      );
    }

    const [tenant] = await db
      .insert(tenants)
      .values({
        name: data.companyName,
        subdomain: data.subdomain,
      })
      .returning();

    const passwordHash = await hashPassword(data.password);

    const [user] = await db
      .insert(users)
      .values({
        tenantId: tenant.id,
        email: data.email,
        passwordHash,
        name: data.name,
        role: "admin",
      })
      .returning();

    const token = await createToken({
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json(
      { user: { id: user.id, email: user.email, name: user.name, role: user.role } },
      { status: 201 }
    );

    response.cookies.set("nautos_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
