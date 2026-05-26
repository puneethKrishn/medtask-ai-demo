import { NextRequest, NextResponse } from "next/server";

// In-memory store for MVP. Production: use Drizzle + waitlistEmails table.
const waitlist = new Map<string, { email: string; segment: string | null; createdAt: Date }>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email ?? "").trim().toLowerCase();
    const segment = body.segment ?? null;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    if (waitlist.has(email)) {
      return NextResponse.json({ ok: true, message: "Already on the waitlist!" });
    }

    waitlist.set(email, { email, segment, createdAt: new Date() });

    return NextResponse.json({ ok: true, message: "You're on the list!" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
