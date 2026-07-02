// Sliding-window rate limiter, in-memory per server instance.
// ponytail: per-instance only — counts reset on cold start and aren't shared
// across instances. Good enough to stop runaway spend from one client; move to
// a durable store (Postgres/Upstash) if real abuse shows up.
const buckets = new Map<string, number[]>()

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const hits = (buckets.get(key) ?? []).filter(t => now - t < windowMs)
  const allowed = hits.length < limit
  if (allowed) hits.push(now)
  buckets.set(key, hits)
  return allowed
}
