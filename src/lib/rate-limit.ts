export const RATE_LIMIT = 10
export const WINDOW_MS = 15 * 60 * 1000

export interface RateLimitEntry {
  count: number
  resetAt: number
}

export function checkRateLimit(
  ip: string,
  map: Map<string, RateLimitEntry>,
  now: number
): { allowed: boolean; retryAfter?: number } {
  const entry = map.get(ip)
  if (!entry || now > entry.resetAt) {
    map.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true }
  }
  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }
  entry.count++
  return { allowed: true }
}
