// Simple in-memory rate limiter per org. Sliding window counter.
// Production: replace with Redis-backed limiter.

interface RateWindow {
  count: number;
  resetAt: number;
}

const windows = new Map<string, RateWindow>();

// Default: 20 extractions per minute per org
const DEFAULT_LIMIT = 20;
const WINDOW_MS = 60_000;

const PLAN_LIMITS: Record<string, number> = {
  free: 10,
  starter: 30,
  pro: 60,
  enterprise: 200,
};

export function checkRateLimit(
  orgId: string,
  planTier: string = "free"
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const limit = PLAN_LIMITS[planTier] ?? DEFAULT_LIMIT;

  let window = windows.get(orgId);
  if (!window || now >= window.resetAt) {
    window = { count: 0, resetAt: now + WINDOW_MS };
    windows.set(orgId, window);
  }

  if (window.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: window.resetAt };
  }

  window.count++;
  return { allowed: true, remaining: limit - window.count, resetAt: window.resetAt };
}
