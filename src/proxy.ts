import { auth } from '@/lib/auth/server'
import { NextResponse, type NextRequest } from 'next/server'

const inner = auth.middleware({ loginUrl: '/auth/login' })

// Neon Auth's middleware proxies the incoming request's method to the upstream
// `get-session` endpoint (GET-only), so POSTs — notably Next.js Server Actions,
// which have a `Next-Action` header — are rejected upstream and the middleware
// 307s to /auth/login. Server Actions already re-check auth via getSession(),
// so let them through here.
//
// Guest-accessible surfaces (G01): a first-time visitor can assess and browse
// with zero signup, so the discover flow, career browse, and the auth pages
// must not be bounced to /auth/login. Each page/route resolves the visitor to a
// real user or a signed guest id itself (getUserId / getOrCreateUserId), so
// auth is enforced where it matters rather than at the door.
const publicPrefixes = ['/discover', '/careers', '/auth']

function isPublic(pathname: string): boolean {
  if (pathname === '/') return true
  return publicPrefixes.some(p => pathname === p || pathname.startsWith(`${p}/`))
}

export async function proxy(request: NextRequest) {
  if (request.headers.get('next-action')) {
    return NextResponse.next()
  }
  if (isPublic(request.nextUrl.pathname)) {
    return NextResponse.next()
  }
  return inner(request)
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
