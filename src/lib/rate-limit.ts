import "server-only";
import { prisma } from "@/lib/db";

// Fixed-window rate limiting. The counters live in Postgres (the
// rate_limits table), so every server instance shares them: on serverless
// hosting each request can land on a different instance, and per-instance
// counters would let an attacker multiply their attempts.
//
// The in-memory limiter below is the fallback when the database can't be
// reached, so a database hiccup never turns rate limiting off.
const buckets = new Map<string, { count: number; resetAt: number }>();

// Periodic cleanup so `buckets` doesn't grow unbounded over a long-running
// process — not load-bearing for correctness, just housekeeping.
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();
function cleanupIfDue() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Returns whether this key (e.g. `login:<ip>`) is still within its quota
 * for the current window. Callers should return HTTP 429 with a friendly
 * message when `allowed` is false. */
export function checkRateLimit(
  key: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number },
): RateLimitResult {
  cleanupIfDue();
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Shared (database-backed) version of checkRateLimit. */
export async function rateLimit(
  key: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number },
): Promise<RateLimitResult> {
  try {
    // One atomic statement: start a new window if the old one ran out,
    // otherwise count this request in the current one.
    const rows = await prisma.$queryRaw<{ count: number; reset_at: Date }[]>`
      INSERT INTO rate_limits (key, count, reset_at)
      VALUES (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.reset_at <= now() THEN 1 ELSE rate_limits.count + 1 END,
        reset_at = CASE WHEN rate_limits.reset_at <= now() THEN EXCLUDED.reset_at ELSE rate_limits.reset_at END
      RETURNING count, reset_at`;
    const row = rows[0];
    // Housekeeping now and then, so expired rows don't pile up.
    if (Math.random() < 0.05) {
      prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } }).catch(() => {});
    }
    if (!row || row.count <= limit) return { allowed: true, retryAfterSeconds: 0 };
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1000)),
    };
  } catch (error) {
    console.error("Rate limit store unavailable, using in-memory limits", error);
    return checkRateLimit(key, { limit, windowSeconds });
  }
}

/** The ready-made 429 response for a request over its limit. */
export function tooManyRequests(
  result: RateLimitResult,
  message = "Too many attempts. Please wait a moment and try again.",
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(result.retryAfterSeconds),
    },
  });
}

/** Best-effort client identifier for rate limiting. On Vercel, x-real-ip
 * and x-forwarded-for are set by the platform's edge and can't be spoofed
 * by the client; on a setup without a trusted proxy in front, they could
 * be. Falls back to a constant so at least a single shared bucket still
 * applies rather than the check silently no-op-ing. */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}

/** Convenience wrapper for the common case in a route handler: check the
 * limit for this client's IP, and if exceeded, return a ready-made 429
 * response — the caller just does
 * `const limited = await rateLimitOrNull(...); if (limited) return limited;` */
export async function rateLimitOrNull(
  request: Request,
  scope: string,
  options: { limit: number; windowSeconds: number },
): Promise<Response | null> {
  const result = await rateLimit(`${scope}:${getClientIp(request)}`, options);
  return result.allowed ? null : tooManyRequests(result);
}
