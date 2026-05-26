import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { users } from "../db/schema";
import { writeAuditEntry } from "../lib/audit-logger";

export interface Context {
  userId: string | null;
  clerkUserId: string | null;
  clerkOrgId: string | null;
  orgId: string | null;
  userRole: string | null;
}

export async function createContext(): Promise<Context> {
  const { userId: clerkUserId, orgId: clerkOrgId } = await auth();

  if (!clerkUserId) {
    return { userId: null, clerkUserId: null, clerkOrgId: null, orgId: null, userRole: null };
  }

  const [localUser] = await db
    .select({ id: users.id, orgId: users.orgId, role: users.role })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  if (!localUser) {
    return { userId: null, clerkUserId, clerkOrgId: clerkOrgId ?? null, orgId: null, userRole: null };
  }

  return {
    userId: localUser.id,
    clerkUserId,
    clerkOrgId: clerkOrgId ?? null,
    orgId: localUser.orgId,
    userRole: localUser.role,
  };
}

const t = initTRPC.context<Context>().create();

const auditMiddleware = t.middleware(async ({ path, type, ctx, next }) => {
  const result = await next();

  if (type === "mutation") {
    writeAuditEntry({
      taskId: null,
      userId: ctx.userId,
      action: path,
      input: "{}",
    });
  }

  return result;
});

const requireAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.clerkUserId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not signed in" });
  }
  if (!ctx.userId || !ctx.orgId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "User not provisioned. Complete org setup or wait for webhook sync.",
    });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      orgId: ctx.orgId,
      userRole: ctx.userRole,
    },
  });
});

export const router = t.router;
export const publicProcedure = t.procedure.use(auditMiddleware);
export const protectedProcedure = t.procedure
  .use(auditMiddleware)
  .use(requireAuth);
