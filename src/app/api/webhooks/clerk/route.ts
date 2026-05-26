import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { trackUserSignup } from "@/server/customerio/client";

/**
 * Clerk webhook handler.
 * Listens for `user.created` events and fires `user.signup` to Customer.io.
 *
 * Clerk signs payloads with Svix. We verify using the raw body + headers.
 * For full Svix verification, install `svix` package; this uses HMAC fallback.
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  // Read raw body for signature verification
  const rawBody = await req.text();

  // Svix signature headers
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing Svix headers" }, { status: 400 });
  }

  // Verify signature (Svix HMAC-SHA256)
  const secret = webhookSecret.startsWith("whsec_")
    ? Buffer.from(webhookSecret.slice(6), "base64")
    : Buffer.from(webhookSecret, "base64");

  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signedContent)
    .digest("base64");

  const signatures = svixSignature.split(" ");
  const verified = signatures.some((sig) => {
    const sigValue = sig.startsWith("v1,") ? sig.slice(3) : sig;
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(sigValue)
    );
  });

  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse and handle event
  const event = JSON.parse(rawBody);

  if (event.type === "user.created") {
    const { id, email_addresses, first_name, unsafe_metadata } = event.data;

    const primaryEmail = email_addresses?.[0]?.email_address;
    if (!primaryEmail) {
      console.warn("user.created event missing email", { userId: id });
      return NextResponse.json({ ok: true });
    }

    // Map segment from metadata or default to "solo"
    const rawSegment = unsafe_metadata?.segment ?? "solo";
    const segment = (["solo", "clinic", "hospital"].includes(rawSegment) ? rawSegment : "solo") as
      | "solo"
      | "clinic"
      | "hospital";

    try {
      await trackUserSignup({
        userId: id,
        email: primaryEmail,
        firstName: first_name ?? "",
        segment,
      });
      console.log("Customer.io user.signup fired", { userId: id, segment });
    } catch (err) {
      console.error("Customer.io trackUserSignup failed", err);
      // Return 200 so Clerk doesn't retry indefinitely; log for alerting
    }
  }

  return NextResponse.json({ ok: true });
}
