import { auth } from '@/lib/auth/server'

export const proxy = auth.middleware({ loginUrl: '/auth/login' })

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
