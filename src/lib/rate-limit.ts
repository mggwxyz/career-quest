// Sliding-window rate limiter, in-memory per server instance.
// ponytail: per-instance only — counts reset on cold start and aren't shared
// across instances. Good enough to stop runaway spend from one client; move to
// a durable store (Postgres/Upstash) if real abuse shows up.
const buckets = new Map<string, { hits: number[], expiresAt: number }>()
const SWEEP_INTERVAL_MS = 60_000
let nextSweepAt = 0

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  // Sweep on traffic so idle keys are reclaimed without a background timer.
  if (now >= nextSweepAt) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.expiresAt <= now) buckets.delete(bucketKey)
    }
    nextSweepAt = now + SWEEP_INTERVAL_MS
  }

  const hits = (buckets.get(key)?.hits ?? []).filter(t => now - t < windowMs)
  const allowed = hits.length < limit
  if (allowed) hits.push(now)
  if (hits.length > 0) {
    buckets.set(key, { hits, expiresAt: hits[hits.length - 1] + windowMs })
  }
  else {
    buckets.delete(key)
  }
  return allowed
}
