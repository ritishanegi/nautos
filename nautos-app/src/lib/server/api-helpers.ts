import { NextRequest, NextResponse } from "next/server";

/**
 * Tenant context extracted from middleware-injected headers.
 */
export interface TenantContext {
  tenantId: string;
  userId: string;
  role: string;
}

/**
 * Extract tenant context from middleware-injected headers.
 * Returns null if headers are missing (unauthenticated request).
 */
export function getTenantContext(req: NextRequest): TenantContext | null {
  const tenantId = req.headers.get("x-tenant-id");
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role");

  if (!tenantId || !userId) return null;

  return { tenantId, userId, role: role ?? "engineer" };
}

/**
 * Guard that returns the tenant context or a 401 JSON response.
 * Use: `const ctx = requireTenant(req); if (ctx instanceof NextResponse) return ctx;`
 */
export function requireTenant(
  req: NextRequest
): TenantContext | NextResponse {
  const ctx = getTenantContext(req);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return ctx;
}

/**
 * Standard error response for Zod validation failures.
 */
export function validationError(error: { errors: unknown[] }) {
  return NextResponse.json(
    { error: "Validation failed", details: error.errors },
    { status: 400 }
  );
}

/**
 * Standard 500 error response with server-side logging.
 */
export function serverError(label: string, error: unknown) {
  console.error(`${label}:`, error);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
