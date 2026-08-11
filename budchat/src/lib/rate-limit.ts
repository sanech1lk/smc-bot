/**
 * Fixed-window in-memory rate limiter for the auth endpoints.
 *
 * Deliberately process-local: it stops password brute-forcing and signup
 * spam against a single-instance deployment without adding a Redis
 * dependency. If BudChat is ever scaled to several app instances this
 * should move to a shared store, since each process keeps its own counters.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Keep the map from growing without bound on a long-running server.
const MAX_TRACKED_KEYS = 10_000;

function sweepExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED_KEYS) sweepExpired(now);
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
    };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

/**
 * Per-account limits for the expensive authenticated endpoints. Auth routes
 * throttle by IP because there is no account yet; here the account is the
 * right key — a stolen session behind a rotating IP is exactly the case
 * where an IP limit does nothing.
 *
 * The numbers are set well above real site usage: a crew photographing a
 * whole flat still lands far under 60 uploads in 5 minutes, while a runaway
 * loop filling the disk hits the wall almost immediately.
 */
export const UPLOAD_LIMIT = { limit: 60, windowSeconds: 5 * 60 } as const;
export const MESSAGE_LIMIT = { limit: 120, windowSeconds: 60 } as const;

/**
 * Returns a ready 429 response when the caller is over budget, or null when
 * the request may proceed — so a route reads as
 * `const limited = enforceRateLimit(...); if (limited) return limited;`
 */
export function enforceRateLimit(
  scope: string,
  userId: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number }
): Response | null {
  const result = rateLimit(`${scope}:${userId}`, limit, windowSeconds);
  if (result.ok) return null;

  return Response.json(
    { error: "Слишком много запросов, подождите немного", code: "rateLimited" },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
  );
}

/** Best-effort client IP from the proxy headers a typical deployment sets. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/** Test seam so unit tests start from a clean slate. */
export function __resetRateLimits() {
  buckets.clear();
}
