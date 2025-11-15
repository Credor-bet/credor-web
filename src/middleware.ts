import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Only log in development to avoid performance impact
  if (process.env.NODE_ENV === 'development') {
    console.log('Middleware: Processing', req.nextUrl.pathname)
  }
  
  let supabaseResponse = NextResponse.next({
    request: req
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => req.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: req
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = req.nextUrl

  // Define route types
  const authRoutes = ['/signin', '/signup']
  const protectedRoutes = ['/dashboard']

  // If no session, only allow public routes
  if (!session) {
    if (protectedRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL('/signin', req.url))
    }
    return supabaseResponse
  }

  // User has session - check email confirmation using session data (source of truth)
  if (session.user) {
    const emailConfirmed = !!session.user.email_confirmed_at
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
    const isConfirmEmailRoute = pathname.startsWith('/confirm-email')
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

    // Email verification check (SECURITY CHECK - using session data, not database)
    if (!emailConfirmed) {
      // Allow access to confirm-email and auth pages
      if (isConfirmEmailRoute || isAuthRoute) {
        return supabaseResponse
      }
      // Redirect to email confirmation for protected routes
      if (isProtectedRoute) {
        return NextResponse.redirect(new URL(`/confirm-email?email=${encodeURIComponent(session.user.email || '')}`, req.url))
      }
      // Allow other public routes
      return supabaseResponse
    }

    // Email is confirmed - handle routing
    // Note: Profile completion is handled client-side (not a security check)
    // If user is on auth pages after login, redirect to dashboard
    if (isAuthRoute) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Allow access to all routes for authenticated, email-verified users
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - _next/webpack-hmr (webpack hot module replacement)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|_next/webpack-hmr).*)',
  ],
}