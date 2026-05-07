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
