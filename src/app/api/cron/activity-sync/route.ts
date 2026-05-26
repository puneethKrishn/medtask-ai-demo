import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { users, tasks } from "@/server/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { syncActivityMetrics } from "@/server/customerio/client";

/**
 * Daily activity sync to Customer.io.
 *
 * Call via cron (e.g. Vercel cron, external scheduler):
 *   POST /api/cron/activity-sync
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Syncs per-user: tasks_created_count, tasks_completed_count, team_members_count.
 */
export async function POST(req: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all users
    const allUsers = await db.select().from(users);

    let synced = 0;
    let errors = 0;

    for (const user of allUsers) {
      try {
        // Count tasks created by this user
        const [createdResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(tasks)
          .where(eq(tasks.createdBy, user.id));

        // Count completed tasks assigned to this user
        const [completedResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(tasks)
          .where(and(eq(tasks.assigneeId, user.id), eq(tasks.status, "done")));

        // Count team members in same org
        const [teamResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(eq(users.orgId, user.orgId));

        await syncActivityMetrics({
          userId: user.clerkUserId ?? user.id,
          tasksCreatedCount: createdResult?.count ?? 0,
          tasksCompletedCount: completedResult?.count ?? 0,
          teamMembersCount: teamResult?.count ?? 0,
        });

        synced++;
      } catch (err) {
        console.error(`Activity sync failed for user ${user.id}`, err);
        errors++;
      }
    }

    return NextResponse.json({ ok: true, synced, errors });
  } catch (err) {
    console.error("Activity sync cron failed", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
