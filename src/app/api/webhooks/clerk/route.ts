import { headers } from "next/headers";
import { Webhook } from "svix";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { orgs, users } from "@/server/db/schema";

interface ClerkWebhookEvent {
  type: string;
  data: Record<string, unknown>;
}

function getWebhookSecret(): string {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) throw new Error("CLERK_WEBHOOK_SECRET not set");
  return secret;
}

export async function POST(req: Request) {
  const wh = new Webhook(getWebhookSecret());
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text();

  let event: ClerkWebhookEvent;
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }

  switch (event.type) {
    case "organization.created":
    case "organization.updated":
      await handleOrgSync(event.data);
      break;
    case "user.created":
    case "user.updated":
      await handleUserSync(event.data);
      break;
    case "organizationMembership.created":
    case "organizationMembership.updated":
      await handleMembershipSync(event.data);
      break;
  }

  return new Response("OK", { status: 200 });
}

async function handleOrgSync(data: Record<string, unknown>) {
  const clerkOrgId = data.id as string;
  const name = (data.name as string) || "Unnamed Org";

  const existing = await db
    .select({ id: orgs.id })
    .from(orgs)
    .where(eq(orgs.clerkOrgId, clerkOrgId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(orgs)
      .set({ name, updatedAt: new Date() })
      .where(eq(orgs.clerkOrgId, clerkOrgId));
  } else {
    await db.insert(orgs).values({ clerkOrgId, name });
  }
}

async function handleUserSync(data: Record<string, unknown>) {
  const clerkUserId = data.id as string;
  const emailAddresses = data.email_addresses as Array<{ email_address: string }>;
  const email = emailAddresses?.[0]?.email_address ?? "unknown@example.com";
  const firstName = (data.first_name as string) || "";
  const lastName = (data.last_name as string) || "";
  const name = `${firstName} ${lastName}`.trim() || email;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(users)
      .set({ email, name })
      .where(eq(users.clerkUserId, clerkUserId));
  }
}

async function handleMembershipSync(data: Record<string, unknown>) {
  const organization = data.organization as { id: string } | undefined;
  const publicUserData = data.public_user_data as {
    user_id: string;
    first_name?: string;
    last_name?: string;
    identifier?: string;
  } | undefined;
  const role = data.role as string | undefined;

  if (!organization?.id || !publicUserData?.user_id) return;

  const clerkOrgId = organization.id;
  const clerkUserId = publicUserData.user_id;

  let [org] = await db
    .select({ id: orgs.id })
    .from(orgs)
    .where(eq(orgs.clerkOrgId, clerkOrgId))
    .limit(1);

  if (!org) {
    const [newOrg] = await db
      .insert(orgs)
      .values({ clerkOrgId, name: "Pending" })
      .returning({ id: orgs.id });
    org = newOrg;
  }

  const localRole = mapClerkRole(role);
  const email = publicUserData.identifier ?? "unknown@example.com";
  const name =
    `${publicUserData.first_name ?? ""} ${publicUserData.last_name ?? ""}`.trim() || email;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(users)
      .set({ orgId: org.id, email, name, role: localRole })
      .where(eq(users.clerkUserId, clerkUserId));
  } else {
    await db.insert(users).values({
      clerkUserId,
      orgId: org.id,
      email,
      name,
      role: localRole,
    });
  }
}

function mapClerkRole(clerkRole?: string): "owner" | "admin" | "provider" | "staff" | "readonly" {
  switch (clerkRole) {
    case "org:admin":
      return "admin";
    case "org:owner":
      return "owner";
    case "org:provider":
      return "provider";
    case "org:staff":
      return "staff";
    default:
      return "staff";
  }
}
