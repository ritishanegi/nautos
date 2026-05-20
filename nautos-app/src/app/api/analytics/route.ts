import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents, vessels, queryLog, users } from "@/lib/db/schema";
import { eq, count, sql, gte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [docStats] = await db
    .select({ total: count() })
    .from(documents)
    .where(eq(documents.tenantId, tenantId));

  const [vesselStats] = await db
    .select({ total: count() })
    .from(vessels)
    .where(eq(vessels.tenantId, tenantId));

  const [userStats] = await db
    .select({ total: count() })
    .from(users)
    .where(eq(users.tenantId, tenantId));

  const [queryTotal] = await db
    .select({ total: count() })
    .from(queryLog)
    .where(eq(queryLog.tenantId, tenantId));

  const [queriesToday] = await db
    .select({ total: count() })
    .from(queryLog)
    .where(
      sql`${queryLog.tenantId} = ${tenantId} AND ${queryLog.createdAt} >= ${today.toISOString()}`
    );

  const [avgResponseTime] = await db
    .select({ avg: sql<number>`COALESCE(AVG(${queryLog.responseTimeMs}), 0)` })
    .from(queryLog)
    .where(eq(queryLog.tenantId, tenantId));

  const dailyQueries = await db
    .select({
      date: sql<string>`DATE(${queryLog.createdAt})`,
      count: count(),
    })
    .from(queryLog)
    .where(
      sql`${queryLog.tenantId} = ${tenantId} AND ${queryLog.createdAt} >= ${thirtyDaysAgo.toISOString()}`
    )
    .groupBy(sql`DATE(${queryLog.createdAt})`)
    .orderBy(sql`DATE(${queryLog.createdAt})`);

  const topDocuments = await db
    .select({
      documentId: queryLog.vesselId,
      queryCount: count(),
    })
    .from(queryLog)
    .where(eq(queryLog.tenantId, tenantId))
    .groupBy(queryLog.vesselId)
    .orderBy(sql`count(*) DESC`)
    .limit(5);

  const docsByStatus = await db
    .select({
      status: documents.ocrStatus,
      count: count(),
    })
    .from(documents)
    .where(eq(documents.tenantId, tenantId))
    .groupBy(documents.ocrStatus);

  return NextResponse.json({
    overview: {
      totalDocuments: docStats.total,
      totalVessels: vesselStats.total,
      totalUsers: userStats.total,
      totalQueries: queryTotal.total,
      queriesToday: queriesToday.total,
      avgResponseTimeMs: Math.round(Number(avgResponseTime.avg)),
    },
    dailyQueries,
    topDocuments,
    docsByStatus,
  });
}
