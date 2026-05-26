// In-memory store for MVP demo. Replace with Drizzle + Postgres for production.
import { randomUUID } from "crypto";
import type { Task, TaskStatus, TaskPriority } from "./schema";

const tasks: Map<string, Task> = new Map();

// Seed demo data
const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001";

const seedTasks: Omit<Task, "id" | "createdAt" | "updatedAt">[] = [
  {
    orgId: DEMO_ORG_ID,
    title: "Review lab results for Mrs. Johnson",
    description: "CBC and metabolic panel came back — needs review before follow-up call",
    status: "open",
    priority: "high",
    assigneeId: null,
    patientId: null,
    dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    source: "ai_extracted",
    createdBy: null,
  },
  {
    orgId: DEMO_ORG_ID,
    title: "Call pharmacy re: prescription renewal",
    description: "Patient Michael Torres — lisinopril 10mg needs 90-day renewal",
    status: "open",
    priority: "medium",
    assigneeId: null,
    patientId: null,
    dueAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
    source: "manual",
    createdBy: null,
  },
  {
    orgId: DEMO_ORG_ID,
    title: "Complete chart notes from morning rounds",
    description: "4 patients seen, notes pending for rooms 201, 203, 207, 210",
    status: "in_progress",
    priority: "high",
    assigneeId: null,
    patientId: null,
    dueAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
    source: "manual",
    createdBy: null,
  },
  {
    orgId: DEMO_ORG_ID,
    title: "Submit prior auth for MRI — Sarah Kim",
    description: "Insurance requires prior authorization for lumbar MRI. Form started.",
    status: "open",
    priority: "urgent",
    assigneeId: null,
    patientId: null,
    dueAt: new Date(Date.now() + 30 * 60 * 1000),
    source: "manual",
    createdBy: null,
  },
  {
    orgId: DEMO_ORG_ID,
    title: "Schedule follow-up: diabetes management",
    description: "Patient needs 3-month follow-up. A1C trending down — good progress.",
    status: "done",
    priority: "low",
    assigneeId: null,
    patientId: null,
    dueAt: null,
    source: "ai_extracted",
    createdBy: null,
  },
];

for (const seed of seedTasks) {
  const now = new Date();
  const task: Task = {
    ...seed,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  tasks.set(task.id, task);
}

export const taskStore = {
  getAll(orgId: string): Task[] {
    return Array.from(tasks.values())
      .filter((t) => t.orgId === orgId)
      .sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return (
          priorityOrder[a.priority] - priorityOrder[b.priority] ||
          (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
        );
      });
  },

  getById(id: string): Task | undefined {
    return tasks.get(id);
  },

  create(input: {
    orgId: string;
    title: string;
    description?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    dueAt?: Date | null;
    source?: "manual" | "ai_extracted" | "ehr_sync";
  }): Task {
    const now = new Date();
    const task: Task = {
      id: randomUUID(),
      orgId: input.orgId,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "open",
      priority: input.priority ?? "medium",
      assigneeId: null,
      patientId: null,
      dueAt: input.dueAt ?? null,
      source: input.source ?? "manual",
      createdBy: null,
      createdAt: now,
      updatedAt: now,
    };
    tasks.set(task.id, task);
    return task;
  },

  update(
    id: string,
    input: Partial<Pick<Task, "title" | "description" | "status" | "priority" | "dueAt">>
  ): Task | null {
    const task = tasks.get(id);
    if (!task) return null;
    const updated = { ...task, ...input, updatedAt: new Date() };
    tasks.set(id, updated);
    return updated;
  },

  delete(id: string): boolean {
    return tasks.delete(id);
  },
};

export { DEMO_ORG_ID };
