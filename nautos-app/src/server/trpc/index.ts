import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";

export interface TRPCContext {
  userId: string | null;
  tenantId: string | null;
  role: string | null;
}

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId || !ctx.tenantId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: { userId: ctx.userId, tenantId: ctx.tenantId, role: ctx.role! },
  });
});
