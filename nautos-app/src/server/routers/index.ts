import { z } from "zod";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { router, publicProcedure, protectedProcedure } from "../trpc";
import { db } from "@/lib/db";
import {
  vessels,
  equipment,
  documents,
  ingestionJobs,
  queryLog,
  users,
} from "@/lib/db/schema";

/**
 * tRPC is the canonical API layer for all JSON CRUD operations.
 *
 * Use tRPC for: list/get/create/update/delete on regular entities (vessels,
 * equipment, documents metadata, analytics).
 *
 * Use plain Next.js route handlers (src/app/api/...) for:
 *   - File uploads          → /api/documents/upload (multipart, large bodies)
 *   - SSE streaming         → /api/query           (Claude token streaming)
 *   - Auth cookie handling  → /api/auth/*          (Set-Cookie response headers)
 *
 * Reason: tRPC's fetch adapter is awkward for binary uploads, doesn't expose
 * streaming responses cleanly, and abstracts away cookie control we need
 * for the auth flow.
 */
export const appRouter = router({
  // ─── Public ────────────────────────────────────────────────
  health: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),

  // ─── Session ───────────────────────────────────────────────
  me: protectedProcedure.query(({ ctx }) => {
    return {
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      role: ctx.role,
    };
  }),

  // ─── Vessels ───────────────────────────────────────────────
  vessels: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db
        .select()
        .from(vessels)
        .where(eq(vessels.tenantId, ctx.tenantId))
        .orderBy(desc(vessels.createdAt));
    }),

    get: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const [vessel] = await db
          .select()
          .from(vessels)
          .where(
            and(eq(vessels.id, input.id), eq(vessels.tenantId, ctx.tenantId))
          )
          .limit(1);

        if (!vessel) throw new TRPCError({ code: "NOT_FOUND" });

        const [vesselEquipment, vesselDocuments] = await Promise.all([
          db
            .select()
            .from(equipment)
            .where(
              and(
                eq(equipment.vesselId, input.id),
                eq(equipment.tenantId, ctx.tenantId)
              )
            ),
          db
            .select()
            .from(documents)
            .where(
              and(
                eq(documents.vesselId, input.id),
                eq(documents.tenantId, ctx.tenantId)
              )
            ),
        ]);

        return { vessel, equipment: vesselEquipment, documents: vesselDocuments };
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(2),
          imo: z.string().max(20).optional(),
          vesselType: z.string().max(100).optional(),
          flagState: z.string().max(100).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const [vessel] = await db
          .insert(vessels)
          .values({
            tenantId: ctx.tenantId,
            name: input.name,
            imo: input.imo || null,
            vesselType: input.vesselType || null,
            flagState: input.flagState || null,
          })
          .returning();
        return vessel;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          name: z.string().min(2).optional(),
          imo: z.string().max(20).optional(),
          vesselType: z.string().max(100).optional(),
          flagState: z.string().max(100).optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...patch } = input;
        const [updated] = await db
          .update(vessels)
          .set(patch)
          .where(and(eq(vessels.id, id), eq(vessels.tenantId, ctx.tenantId)))
          .returning();

        if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
        return updated;
      }),
  }),

  // ─── Equipment ─────────────────────────────────────────────
  equipment: router({
    list: protectedProcedure
      .input(z.object({ vesselId: z.string().uuid().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const where = input?.vesselId
          ? and(
              eq(equipment.tenantId, ctx.tenantId),
              eq(equipment.vesselId, input.vesselId)
            )
          : eq(equipment.tenantId, ctx.tenantId);

        return db
          .select()
          .from(equipment)
          .where(where)
          .orderBy(desc(equipment.createdAt));
      }),

    create: protectedProcedure
      .input(
        z.object({
          manufacturer: z.string().min(1),
          modelType: z.string().min(1),
          serialNumber: z.string().optional(),
          vesselId: z.string().uuid().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const [item] = await db
          .insert(equipment)
          .values({
            tenantId: ctx.tenantId,
            manufacturer: input.manufacturer,
            modelType: input.modelType,
            serialNumber: input.serialNumber || null,
            vesselId: input.vesselId || null,
          })
          .returning();
        return item;
      }),
  }),

  // ─── Documents (metadata; upload + status stay on REST) ────
  documents: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db
        .select()
        .from(documents)
        .where(eq(documents.tenantId, ctx.tenantId))
        .orderBy(desc(documents.createdAt));
    }),

    get: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const [doc] = await db
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.id, input.id),
              eq(documents.tenantId, ctx.tenantId)
            )
          )
          .limit(1);

        if (!doc) throw new TRPCError({ code: "NOT_FOUND" });

        const [job] = await db
          .select()
          .from(ingestionJobs)
          .where(eq(ingestionJobs.documentId, doc.id))
          .orderBy(desc(ingestionJobs.createdAt))
          .limit(1);

        return { document: doc, job: job || null };
      }),
  }),

  // ─── Analytics ─────────────────────────────────────────────
  analytics: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [docStats] = await db
      .select({ total: count() })
      .from(documents)
      .where(eq(documents.tenantId, ctx.tenantId));

    const [vesselStats] = await db
      .select({ total: count() })
      .from(vessels)
      .where(eq(vessels.tenantId, ctx.tenantId));

    const [userStats] = await db
      .select({ total: count() })
      .from(users)
      .where(eq(users.tenantId, ctx.tenantId));

    const [queryTotal] = await db
      .select({ total: count() })
      .from(queryLog)
      .where(eq(queryLog.tenantId, ctx.tenantId));

    const [queriesToday] = await db
      .select({ total: count() })
      .from(queryLog)
      .where(
        sql`${queryLog.tenantId} = ${ctx.tenantId} AND ${queryLog.createdAt} >= ${today.toISOString()}`
      );

    return {
      totalDocuments: docStats.total,
      totalVessels: vesselStats.total,
      totalUsers: userStats.total,
      totalQueries: queryTotal.total,
      queriesToday: queriesToday.total,
    };
  }),
});

export type AppRouter = typeof appRouter;
