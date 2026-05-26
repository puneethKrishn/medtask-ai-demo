import { z } from "zod";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "./init";
import { db } from "../db/client";
import { tasks, taskAuditLog } from "../db/schema";
import { extractTaskFromText, transcribeAndExtract } from "../ai/extract-task";
import { checkRateLimit } from "../ai/rate-limiter";

export const appRouter = router({
  ai: router({
    extractFromText: protectedProcedure
      .input(z.object({ text: z.string().min(3).max(5000) }))
      .mutation(async ({ input, ctx }) => {
        const rate = checkRateLimit(ctx.orgId, "free");
        if (!rate.allowed) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Rate limit exceeded. Resets at ${new Date(rate.resetAt).toISOString()}`,
          });
        }
        const extracted = await extractTaskFromText(input.text);
        return { ...extracted, rateLimitRemaining: rate.remaining };
      }),

    extractFromVoice: protectedProcedure
      .input(
        z.object({
          audioBase64: z.string().min(1),
          mimeType: z.string().default("audio/webm"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const rate = checkRateLimit(ctx.orgId, "free");
        if (!rate.allowed) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Rate limit exceeded. Resets at ${new Date(rate.resetAt).toISOString()}`,
          });
        }
        const result = await transcribeAndExtract(input.audioBase64, input.mimeType);
        return { ...result, rateLimitRemaining: rate.remaining };
      }),

    confirmAndSave: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(500),
          description: z.string().max(2000).optional(),
          patient: z.string().max(200).optional(),
          priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
          dueAt: z.string().datetime().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const [row] = await db
          .insert(tasks)
          .values({
            orgId: ctx.orgId,
            title: input.title,
            description: input.description ?? null,
            priority: input.priority ?? "medium",
            dueAt: input.dueAt ? new Date(input.dueAt) : null,
            source: "ai_extracted",
            createdBy: ctx.userId,
          })
          .returning();

        await db.insert(taskAuditLog).values({
          taskId: row.id,
          userId: ctx.userId,
          action: "created",
          diff: JSON.stringify({ title: input.title, source: "ai_extracted", patient: input.patient }),
        });

        return row;
      }),
  }),

  tasks: router({
    list: protectedProcedure
      .input(
        z
          .object({
            status: z
              .enum(["open", "in_progress", "done", "snoozed"])
              .optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        const conditions = [eq(tasks.orgId, ctx.orgId)];
        if (input?.status) {
          conditions.push(eq(tasks.status, input.status));
        }

        const rows = await db
          .select()
          .from(tasks)
          .where(and(...conditions))
          .orderBy(
            asc(
              sql`CASE ${tasks.priority}
                WHEN 'urgent' THEN 0
                WHEN 'high' THEN 1
                WHEN 'medium' THEN 2
                WHEN 'low' THEN 3
              END`
            ),
            desc(tasks.createdAt)
          );

        return rows;
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ input, ctx }) => {
        const [row] = await db
          .select()
          .from(tasks)
          .where(and(eq(tasks.id, input.id), eq(tasks.orgId, ctx.orgId)));
        return row ?? null;
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(500),
          description: z.string().max(2000).optional(),
          priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
          dueAt: z.string().datetime().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const [row] = await db
          .insert(tasks)
          .values({
            orgId: ctx.orgId,
            title: input.title,
            description: input.description ?? null,
            priority: input.priority ?? "medium",
            dueAt: input.dueAt ? new Date(input.dueAt) : null,
            createdBy: ctx.userId,
          })
          .returning();

        await db.insert(taskAuditLog).values({
          taskId: row.id,
          userId: ctx.userId,
          action: "created",
          diff: JSON.stringify({ title: input.title }),
        });

        return row;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          title: z.string().min(1).max(500).optional(),
          description: z.string().max(2000).optional(),
          status: z
            .enum(["open", "in_progress", "done", "snoozed"])
            .optional(),
          priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
          dueAt: z.string().datetime().nullable().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...updates } = input;

        const values: Record<string, unknown> = { updatedAt: new Date() };
        if (updates.title !== undefined) values.title = updates.title;
        if (updates.description !== undefined)
          values.description = updates.description;
        if (updates.status !== undefined) values.status = updates.status;
        if (updates.priority !== undefined) values.priority = updates.priority;
        if (updates.dueAt !== undefined)
          values.dueAt = updates.dueAt ? new Date(updates.dueAt) : null;

        const [row] = await db
          .update(tasks)
          .set(values)
          .where(and(eq(tasks.id, id), eq(tasks.orgId, ctx.orgId)))
          .returning();

        if (row) {
          await db.insert(taskAuditLog).values({
            taskId: id,
            userId: ctx.userId,
            action: "updated",
            diff: JSON.stringify(updates),
          });
        }

        return row ?? null;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ input, ctx }) => {
        const [deleted] = await db
          .delete(tasks)
          .where(and(eq(tasks.id, input.id), eq(tasks.orgId, ctx.orgId)))
          .returning();
        return !!deleted;
      }),
  }),
});

export type AppRouter = typeof appRouter;
