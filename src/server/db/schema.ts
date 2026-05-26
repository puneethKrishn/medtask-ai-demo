import { pgTable, text, timestamp, uuid, pgEnum, boolean, integer } from "drizzle-orm/pg-core";

export const taskStatusEnum = pgEnum("task_status", [
  "open",
  "in_progress",
  "done",
  "snoozed",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const taskSourceEnum = pgEnum("task_source", [
  "manual",
  "ai_extracted",
  "ehr_sync",
]);

export const userRoleEnum = pgEnum("user_role", [
  "owner",
  "admin",
  "provider",
  "staff",
  "readonly",
]);

export const orgs = pgTable("orgs", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkOrgId: text("clerk_org_id").unique(),
  name: text("name").notNull(),
  planTier: text("plan_tier").notNull().default("free"),
  mfaRequired: boolean("mfa_required").notNull().default(false),
  sessionTimeoutMinutes: integer("session_timeout_minutes").notNull().default(15),
  settings: text("settings"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").unique(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => orgs.id),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("provider"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => orgs.id),
  mrnHash: text("mrn_hash"),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => orgs.id),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("open"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  assigneeId: uuid("assignee_id").references(() => users.id),
  patientId: uuid("patient_id").references(() => patients.id),
  dueAt: timestamp("due_at"),
  source: taskSourceEnum("source").notNull().default("manual"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const taskAuditLog = pgTable("task_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id),
  userId: uuid("user_id").references(() => users.id),
  action: text("action").notNull(),
  diff: text("diff"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Task = typeof tasks.;
export type NewTask = typeof tasks.;
export type TaskStatus = (typeof taskStatusEnum.enumValues)[number];
export type TaskPriority = (typeof taskPriorityEnum.enumValues)[number];
