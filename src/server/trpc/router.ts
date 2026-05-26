import { z } from "zod";
import { router, publicProcedure } from "./init";
import { taskStore, DEMO_ORG_ID } from "../db/store";

export const appRouter = router({
  tasks: router({
    list: publicProcedure
      .input(
        z
          .object({
            status: z
              .enum(["open", "in_progress", "done", "snoozed"])
              .optional(),
          })
          .optional()
      )
      .query(({ input }) => {
        const all = taskStore.getAll(DEMO_ORG_ID);
        if (input?.status) {
          return all.filter((t) => t.status === input.status);
        }
        return all;
      }),

    getById: publicProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(({ input }) => {
        return taskStore.getById(input.id) ?? null;
      }),

    create: publicProcedure
      .input(
        z.object({
          title: z.string().min(1).max(500),
          description: z.string().max(2000).optional(),
          priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
          dueAt: z.string().datetime().optional(),
        })
      )
      .mutation(({ input }) => {
        return taskStore.create({
          orgId: DEMO_ORG_ID,
          title: input.title,
          description: input.description,
          priority: input.priority,
          dueAt: input.dueAt ? new Date(input.dueAt) : null,
        });
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          title: z.string().min(1).max(500).optional(),
          description: z.string().max(2000).optional(),
          status: z.enum(["open", "in_progress", "done", "snoozed"]).optional(),
          priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
          dueAt: z.string().datetime().nullable().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...updates } = input;
        return taskStore.update(id, {
          ...updates,
          dueAt: updates.dueAt ? new Date(updates.dueAt) : updates.dueAt === null ? null : undefined,
        });
      }),

    delete: publicProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(({ input }) => {
        return taskStore.delete(input.id);
      }),
  }),
});

export type AppRouter = typeof appRouter;
