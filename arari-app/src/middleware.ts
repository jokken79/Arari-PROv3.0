import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login']

// Routes that should be excluded from middleware (API routes, static files, etc.)
const EXCLUDED_PATHS = [
  '/api/',
  '/_next/',
  '/favicon.ico',
  '/logo-',
  '/public/',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for excluded paths
  if (EXCLUDED_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next()
  }

  // Check for auth token in cookies or headers
  // Note: Since we're using localStorage, we can't check it server-side
  // This is a limitation of client-side auth. In production, consider using httpOnly cookies.

  // For now, we'll handle auth checks on the client side
  // The middleware will only redirect if there's clear evidence of no auth

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
