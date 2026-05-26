import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { orgs, users, patients, tasks } from "./schema";

const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000010";
const DEMO_PATIENT_1 = "00000000-0000-0000-0000-000000000100";
const DEMO_PATIENT_2 = "00000000-0000-0000-0000-000000000101";

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  console.log("Seeding database...");

  // Org
  await db
    .insert(orgs)
    .values({ id: DEMO_ORG_ID, name: "Demo Clinic", planTier: "free" })
    .onConflictDoNothing();

  // User
  await db
    .insert(users)
    .values({
      id: DEMO_USER_ID,
      orgId: DEMO_ORG_ID,
      email: "demo@medtask.local",
      name: "Dr. Demo Provider",
      role: "provider",
    })
    .onConflictDoNothing();

  // Patients
  await db
    .insert(patients)
    .values([
      {
        id: DEMO_PATIENT_1,
        orgId: DEMO_ORG_ID,
        displayName: "Mrs. Johnson",
      },
      {
        id: DEMO_PATIENT_2,
        orgId: DEMO_ORG_ID,
        displayName: "Sarah Kim",
      },
    ])
    .onConflictDoNothing();

  // Tasks
  await db
    .insert(tasks)
    .values([
      {
        orgId: DEMO_ORG_ID,
        title: "Review lab results for Mrs. Johnson",
        description:
          "CBC and metabolic panel came back — needs review before follow-up call",
        status: "open",
        priority: "high",
        patientId: DEMO_PATIENT_1,
        assigneeId: DEMO_USER_ID,
        dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        source: "ai_extracted",
        createdBy: DEMO_USER_ID,
      },
      {
        orgId: DEMO_ORG_ID,
        title: "Call pharmacy re: prescription renewal",
        description:
          "Patient Michael Torres — lisinopril 10mg needs 90-day renewal",
        status: "open",
        priority: "medium",
        assigneeId: DEMO_USER_ID,
        dueAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        source: "manual",
        createdBy: DEMO_USER_ID,
      },
      {
        orgId: DEMO_ORG_ID,
        title: "Complete chart notes from morning rounds",
        description:
          "4 patients seen, notes pending for rooms 201, 203, 207, 210",
        status: "in_progress",
        priority: "high",
        assigneeId: DEMO_USER_ID,
        dueAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
        source: "manual",
        createdBy: DEMO_USER_ID,
      },
      {
        orgId: DEMO_ORG_ID,
        title: "Submit prior auth for MRI — Sarah Kim",
        description:
          "Insurance requires prior authorization for lumbar MRI. Form started.",
        status: "open",
        priority: "urgent",
        patientId: DEMO_PATIENT_2,
        assigneeId: DEMO_USER_ID,
        dueAt: new Date(Date.now() + 30 * 60 * 1000),
        source: "manual",
        createdBy: DEMO_USER_ID,
      },
      {
        orgId: DEMO_ORG_ID,
        title: "Schedule follow-up: diabetes management",
        description:
          "Patient needs 3-month follow-up. A1C trending down — good progress.",
        status: "done",
        priority: "low",
        assigneeId: DEMO_USER_ID,
        source: "ai_extracted",
        createdBy: DEMO_USER_ID,
      },
    ])
    .onConflictDoNothing();

  console.log("Seed complete.");
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
