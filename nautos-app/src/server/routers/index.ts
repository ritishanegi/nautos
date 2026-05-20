import { router, publicProcedure, protectedProcedure } from "../trpc";

export const appRouter = router({
  health: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),

  me: protectedProcedure.query(({ ctx }) => {
    return {
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      role: ctx.role,
    };
  }),
});

export type AppRouter = typeof appRouter;
