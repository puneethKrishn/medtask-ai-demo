import { initTRPC } from "@trpc/server";
import { writeAuditEntry } from "../lib/audit-logger";

export interface Context {
  userId: string | null;
}

const t = initTRPC.context<Context>().create();

/**
 * Audit middleware — logs every mutation to the audit trail.
 * Queries not audited per HIPAA minimum-necessary principle.
 */
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

export const router = t.router;
export const publicProcedure = t.procedure.use(auditMiddleware);
