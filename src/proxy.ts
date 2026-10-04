import { auth } from '@/lib/auth/server'
import { NextResponse, type NextRequest } from 'next/server'

const inner = auth.middleware({ loginUrl: '/auth/login' })

// Neon Auth's middleware proxies the incoming request's method to the upstream
// `get-session` endpoint (GET-only), so POSTs — notably Next.js Server Actions,
// which have a `Next-Action` header — are rejected upstream and the middleware
// 307s to /auth/login. Server Actions already re-check auth via getSession(),
// so let them through here.
const publicPaths = new Set(['/'])
const publicPrefixes = ['/auth', '/careers', '/discover']

export async function proxy(request: NextRequest) {
  if (request.headers.get('next-action')) {
    return NextResponse.next()
  }
  if (publicPaths.has(request.nextUrl.pathname)) {
    return NextResponse.next()
  }
  if (publicPrefixes.some(prefix =>
    request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`),
  )) {
    return NextResponse.next()
  }
  return inner(request)
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
