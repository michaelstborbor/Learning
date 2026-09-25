import "server-only";

// In-memory sliding-window rate limiter, scoped per Node process.
//
// HONEST LIMITATION: this only works correctly on a single server
// instance. If this app is ever deployed across multiple instances behind
// a load balancer, each instance has its own independent counter — a
// determined attacker could get up to (limit × instance count) attempts
// by hitting different instances. For a single-instance MVP deployment
// (the realistic starting point for this platform) this is a real,
// working protection against casual brute-forcing and credential
// stuffing. If/when the app scales to multiple instances, this should be
// replaced with a shared store (Redis, e.g. via Upstash) — the function
// signature below is written so that swap only touches this one file.
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

/** Best-effort client identifier for rate limiting. Trusts
 * X-Forwarded-For because this app is expected to run behind a managed
 * platform's reverse proxy (e.g. Render) which sets it reliably; on a
 * setup without a trusted proxy in front, this header could be spoofed by
 * the client. Falls back to a constant so at least a single shared bucket
 * still applies rather than the check silently no-op-ing. */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}

/** Convenience wrapper for the common case in a route handler: check the
 * limit, and if exceeded, return a ready-made 429 response with a
 * friendly message — the caller just does
 * `const limited = rateLimitOrNull(...); if (limited) return limited;` */
export function rateLimitOrNull(
  request: Request,
  scope: string,
  options: { limit: number; windowSeconds: number },
): Response | null {
  const key = `${scope}:${getClientIp(request)}`;
  const result = checkRateLimit(key, options);
  if (result.allowed) return null;

  return new Response(
    JSON.stringify({
      error: "Too many attempts. Please wait a moment and try again.",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSeconds),
      },
    },
  );
}
