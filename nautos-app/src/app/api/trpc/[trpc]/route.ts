import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers";
import type { TRPCContext } from "@/server/trpc";

function createContext(req: Request): TRPCContext {
  return {
    userId: req.headers.get("x-user-id"),
    tenantId: req.headers.get("x-tenant-id"),
    role: req.headers.get("x-user-role"),
  };
}

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
  });
}

export { handler as GET, handler as POST };
