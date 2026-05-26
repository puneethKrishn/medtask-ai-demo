import { mysqlTable, varchar, text, timestamp, mysqlEnum, boolean, int } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export const taskStatusEnum = ["open", "in_progress", "done", "snoozed"] as const;
export const taskPriorityEnum = ["low", "medium", "high", "urgent"] as const;
export const taskSourceEnum = ["manual", "ai_extracted", "ehr_sync"] as const;
export const userRoleEnum = ["owner", "admin", "provider", "staff", "readonly"] as const;

export const orgs = mysqlTable("orgs", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  clerkOrgId: varchar("clerk_org_id", { length: 255 }).unique(),
  name: varchar("name", { length: 255 }).notNull(),
  planTier: varchar("plan_tier", { length: 50 }).notNull().default("free"),
  mfaRequired: boolean("mfa_required").notNull().default(false),
  sessionTimeoutMinutes: int("session_timeout_minutes").notNull().default(15),
  settings: text("settings"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  clerkUserId: varchar("clerk_user_id", { length: 255 }).unique(),
  orgId: varchar("org_id", { length: 36 })
    .notNull()
    .references(() => orgs.id),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: mysqlEnum("role", userRoleEnum).notNull().default("provider"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const patients = mysqlTable("patients", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  orgId: varchar("org_id", { length: 36 })
    .notNull()
    .references(() => orgs.id),
  mrnHash: varchar("mrn_hash", { length: 255 }),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tasks = mysqlTable("tasks", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  orgId: varchar("org_id", { length: 36 })
    .notNull()
    .references(() => orgs.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", taskStatusEnum).notNull().default("open"),
  priority: mysqlEnum("priority", taskPriorityEnum).notNull().default("medium"),
  assigneeId: varchar("assignee_id", { length: 36 }).references(() => users.id),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id),
  dueAt: timestamp("due_at"),
  source: mysqlEnum("source", taskSourceEnum).notNull().default("manual"),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const taskAuditLog = mysqlTable("task_audit_log", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  taskId: varchar("task_id", { length: 36 })
    .notNull()
    .references(() => tasks.id),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  action: varchar("action", { length: 255 }).notNull(),
  diff: text("diff"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskStatus = (typeof taskStatusEnum)[number];
export type TaskPriority = (typeof taskPriorityEnum)[number];
