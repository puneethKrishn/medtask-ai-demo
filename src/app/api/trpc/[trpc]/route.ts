import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/router";
import type { Context } from "@/server/trpc/init";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: (): Context => ({
      // MVP: no auth yet. When Clerk is added, extract userId from session here.
      userId: null,
    }),
  });

export { handler as GET, handler as POST };
