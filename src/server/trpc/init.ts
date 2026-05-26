import { initTRPC } from "@trpc/server";
import { writeAuditEntry } from "../lib/audit-logger";

export interface Context {
  userId: string | null;
}

const t = initTRPC.context<Context>().create();

/**
 * Audit middleware — logs every mutation to the audit trail.
 * Reads are not audited per HIPAA minimum-necessary principle
 * (queries don't modify PHI).
 */
const auditMiddleware = t.middleware(async ({ path, type, getRawInput, ctx, next }) => {
  const result = await next();

  if (type === "mutation") {
    const rawInput = await getRawInput();
    writeAuditEntry({
      taskId: extractTaskId(rawInput),
      userId: ctx.userId,
      action: path,
      input: JSON.stringify(rawInput ?? {}),
    });
  }

  return result;
});

function extractTaskId(input: unknown): string | null {
  if (input && typeof input === "object" && "id" in input) {
    const id = (input as Record<string, unknown>).id;
    if (typeof id === "string") return id;
  }
  return null;
}

export const router = t.router;
export const publicProcedure = t.procedure.use(auditMiddleware);
