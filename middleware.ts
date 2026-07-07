import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { checkRateLimit, RateLimitEntry } from './src/lib/rate-limit'

const ipMap = new Map<string, RateLimitEntry>()

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Rate limiting applies only to /api/auth routes
  if (pathname.startsWith('/api/auth')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const result = checkRateLimit(ip, ipMap, Date.now())
    if (!result.allowed) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': String(result.retryAfter),
        },
      })
    }
  }

  // Auth protection for dashboard and games routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/games')) {
    const token = await getToken({ req: request })
    if (!token) {
      const loginUrl = new URL('/auth/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export { proxy as default }

export const config = {
  matcher: ['/api/auth/:path*', '/dashboard/:path*', '/games/:path*'],
}
