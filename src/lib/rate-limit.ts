export const RATE_LIMIT = 10
export const WINDOW_MS = 15 * 60 * 1000

// The demo account is public and resets on every login, so it gets its own, much looser bucket.
export const DEMO_LIMIT = 30
export const DEMO_WINDOW_MS = 60 * 1000

export type AuthBucket = 'credentials' | 'signup' | 'demo'

// Only these requests are throttled. NextAuth's internal routes (session, csrf, providers,
// _log) are hit on every page load and must never count against anyone.
export function classifyAuthRequest(method: string, pathname: string, isDemoEmail: boolean): AuthBucket | null {
  if (method !== 'POST') return null
  if (pathname === '/api/auth/callback/credentials') return isDemoEmail ? 'demo' : 'credentials'
  if (pathname === '/api/auth/signup') return 'signup'
  return null
}

export interface RateLimitEntry {
  count: number
  resetAt: number
}

export function checkRateLimit(
  ip: string,
  map: Map<string, RateLimitEntry>,
  now: number,
  limit: number = RATE_LIMIT,
  windowMs: number = WINDOW_MS
): { allowed: boolean; retryAfter?: number } {
  const entry = map.get(ip)
  if (!entry || now > entry.resetAt) {
    map.set(ip, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }
  if (entry.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }
  entry.count++
  return { allowed: true }
}
