import { checkRateLimit, RATE_LIMIT, WINDOW_MS, RateLimitEntry } from '@/src/lib/rate-limit'

describe('checkRateLimit', () => {
  let map: Map<string, RateLimitEntry>
  const ip = '192.168.1.1'
  const now = 1000000

  beforeEach(() => {
    map = new Map()
  })

  test('Test 1: First 10 requests from same IP all return allowed=true', () => {
    for (let i = 0; i < RATE_LIMIT; i++) {
      const result = checkRateLimit(ip, map, now)
      expect(result.allowed).toBe(true)
    }
  })

  test('Test 2: 11th request from same IP returns allowed=false with status 429', () => {
    for (let i = 0; i < RATE_LIMIT; i++) {
      checkRateLimit(ip, map, now)
    }
    const result = checkRateLimit(ip, map, now)
    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBeDefined()
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  test('Test 3: 12th request also returns allowed=false (window still active)', () => {
    for (let i = 0; i < RATE_LIMIT + 1; i++) {
      checkRateLimit(ip, map, now)
    }
    const result = checkRateLimit(ip, map, now)
    expect(result.allowed).toBe(false)
  })

  test('Test 4: After resetAt timestamp passes, counter resets and allows again', () => {
    for (let i = 0; i < RATE_LIMIT; i++) {
      checkRateLimit(ip, map, now)
    }
    // 11th request blocked
    const blocked = checkRateLimit(ip, map, now)
    expect(blocked.allowed).toBe(false)

    // Advance time past the window
    const futureTime = now + WINDOW_MS + 1
    const result = checkRateLimit(ip, map, futureTime)
    expect(result.allowed).toBe(true)
  })

  test('Test 5: Requests from two different IPs are tracked independently', () => {
    const ip2 = '10.0.0.1'

    // Exhaust ip1
    for (let i = 0; i < RATE_LIMIT; i++) {
      checkRateLimit(ip, map, now)
    }
    const ip1Blocked = checkRateLimit(ip, map, now)
    expect(ip1Blocked.allowed).toBe(false)

    // ip2 should still be allowed
    for (let i = 0; i < RATE_LIMIT; i++) {
      const result = checkRateLimit(ip2, map, now)
      expect(result.allowed).toBe(true)
    }
    // ip2 11th request should also be blocked
    const ip2Blocked = checkRateLimit(ip2, map, now)
    expect(ip2Blocked.allowed).toBe(false)
  })

  test('Test 6: 429 response includes Retry-After header with positive integer value (seconds remaining)', () => {
    for (let i = 0; i < RATE_LIMIT; i++) {
      checkRateLimit(ip, map, now)
    }
    const result = checkRateLimit(ip, map, now)
    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBeDefined()
    // retryAfter should be a positive integer (seconds)
    expect(Number.isInteger(result.retryAfter)).toBe(true)
    expect(result.retryAfter!).toBeGreaterThan(0)
    // Should be roughly WINDOW_MS / 1000 seconds
    expect(result.retryAfter!).toBeLessThanOrEqual(Math.ceil(WINDOW_MS / 1000))
  })
})

import { classifyAuthRequest, checkRateLimit as check, DEMO_LIMIT, DEMO_WINDOW_MS } from '@/src/lib/rate-limit'

describe('classifyAuthRequest', () => {
  test('NextAuth internal routes are never throttled', () => {
    for (const path of ['/api/auth/session', '/api/auth/csrf', '/api/auth/providers', '/api/auth/_log', '/api/auth/signout']) {
      expect(classifyAuthRequest('GET', path, false)).toBeNull()
      expect(classifyAuthRequest('POST', path, false)).toBeNull()
    }
  })

  test('only credential POSTs and signup are throttled, demo gets its own bucket', () => {
    expect(classifyAuthRequest('POST', '/api/auth/callback/credentials', false)).toBe('credentials')
    expect(classifyAuthRequest('POST', '/api/auth/callback/credentials', true)).toBe('demo')
    expect(classifyAuthRequest('POST', '/api/auth/signup', false)).toBe('signup')
    expect(classifyAuthRequest('GET', '/api/auth/callback/credentials', false)).toBeNull()
  })
})

describe('checkRateLimit with a custom limit', () => {
  test('demo bucket allows a burst of clicks and resets after a minute', () => {
    const map = new Map<string, RateLimitEntry>()
    for (let i = 0; i < DEMO_LIMIT; i++) expect(check('1.1.1.1', map, 0, DEMO_LIMIT, DEMO_WINDOW_MS).allowed).toBe(true)
    expect(check('1.1.1.1', map, 0, DEMO_LIMIT, DEMO_WINDOW_MS).allowed).toBe(false)
    expect(check('2.2.2.2', map, 0, DEMO_LIMIT, DEMO_WINDOW_MS).allowed).toBe(true)
    expect(check('1.1.1.1', map, DEMO_WINDOW_MS + 1, DEMO_LIMIT, DEMO_WINDOW_MS).allowed).toBe(true)
  })
})
