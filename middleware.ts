import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import {
  checkRateLimit,
  classifyAuthRequest,
  AuthBucket,
  RateLimitEntry,
  DEMO_LIMIT,
  DEMO_WINDOW_MS,
} from './src/lib/rate-limit'
import { DEMO_EMAIL } from './src/lib/demo-credentials'

// One map per bucket so demo clicks, sign-ups and failed logins never use each other's allowance.
// In-memory: each server instance counts on its own.
const buckets: Record<AuthBucket, Map<string, RateLimitEntry>> = {
  credentials: new Map(),
  signup: new Map(),
  demo: new Map(),
}

const MESSAGES: Record<AuthBucket, string> = {
  credentials: 'Too many attempts. Please wait a few minutes and try again.',
  signup: 'Too many sign-up attempts. Please wait a few minutes and try again.',
  demo: 'The demo is busy. Please try again in a minute.',
}

// Browsers navigating get a real page; fetch calls get JSON the login/signup/demo UI can read.
function busyResponse(request: NextRequest, bucket: AuthBucket, retryAfter: number) {
  const headers = { 'Retry-After': String(retryAfter) }
  if (request.headers.get('accept')?.includes('text/html')) {
    return NextResponse.rewrite(new URL('/busy', request.url), { status: 429, headers })
  }
  if (bucket === 'signup') {
    return NextResponse.json({ error: MESSAGES.signup }, { status: 429, headers })
  }
  // next-auth's signIn() reads `url` and surfaces `error` plus the HTTP status to the caller.
  return NextResponse.json(
    { url: new URL('/auth/login?error=RateLimited', request.url).toString() },
    { status: 429, headers }
  )
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname.startsWith('/api/auth')) {
    let isDemoEmail = false
    if (request.method === 'POST' && pathname === '/api/auth/callback/credentials') {
      const body = await request.clone().text()
      isDemoEmail = new URLSearchParams(body).get('email') === DEMO_EMAIL
    }

    const bucket = classifyAuthRequest(request.method, pathname, isDemoEmail)
    if (bucket) {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip')
      // Without an IP everyone would share one bucket, so fail open instead of locking visitors out.
      if (ip) {
        const result =
          bucket === 'demo'
            ? checkRateLimit(ip, buckets.demo, Date.now(), DEMO_LIMIT, DEMO_WINDOW_MS)
            : checkRateLimit(ip, buckets[bucket], Date.now())
        if (!result.allowed) return busyResponse(request, bucket, result.retryAfter ?? 60)
      }
    }
  }

  // Auth protection for dashboard, games and insights routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/games') || pathname.startsWith('/insights')) {
    const token = await getToken({ req: request })
    if (!token || (typeof token.demoExpiresAt === 'number' && token.demoExpiresAt < Date.now())) {
      const loginUrl = new URL('/auth/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export { middleware as default }

export const config = {
  matcher: ['/api/auth/:path*', '/dashboard/:path*', '/games/:path*', '/insights/:path*'],
}
