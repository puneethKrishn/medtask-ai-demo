/**
 * In-memory audit log for MVP. Production: write to task_audit_log table via Drizzle.
 * Each entry records who did what, when, and the diff.
 */

import { randomUUID } from "crypto";
import { scrubPhi } from "./phi-scrubber";

export interface AuditEntry {
  id: string;
  taskId: string | null;
  userId: string | null;
  action: string;     // e.g. "tasks.create", "tasks.update", "tasks.delete"
  input: string;      // PHI-scrubbed JSON of the mutation input
  createdAt: Date;
}

const auditLog: AuditEntry[] = [];

export function writeAuditEntry(entry: Omit<AuditEntry, "id" | "createdAt">): AuditEntry {
  const record: AuditEntry = {
    ...entry,
    id: randomUUID(),
    createdAt: new Date(),
  };
  auditLog.push(record);

  // Console log (PHI-scrubbed) for observability
  console.log(
    `[AUDIT] ${record.createdAt.toISOString()} action=${record.action} taskId=${record.taskId ?? "n/a"} userId=${record.userId ?? "anonymous"} input=${scrubPhi(record.input)}`
  );

  return record;
}

export function getAuditLog(): readonly AuditEntry[] {
  return auditLog;
}
