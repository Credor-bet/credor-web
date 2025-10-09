import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  console.log('🚀 MIDDLEWARE IS RUNNING for path:', req.nextUrl.pathname)
  
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

  console.log('=== MIDDLEWARE DEBUG ===')
  console.log('Pathname:', pathname)
  console.log('Session exists:', !!session)
  console.log('Session user:', session?.user?.email)
  console.log('Email confirmed:', !!session?.user?.email_confirmed_at)

  // Define route types
  const authRoutes = ['/signin', '/signup']
  const protectedRoutes = ['/dashboard', '/profile-completion']

  // If no session, only allow public routes
  if (!session) {
    if (protectedRoutes.some(route => pathname.startsWith(route))) {
      console.log('Middleware: No session, redirecting to /signin')
      return NextResponse.redirect(new URL('/signin', req.url))
    }
    console.log('Middleware: No session, allowing public route')
    return supabaseResponse
  }

  // User has session - check email confirmation and profile completion
  if (session.user) {
    try {
      // Check user profile in database for email confirmation status
      const { data: profile } = await supabase
        .from('users')
        .select('is_email_verified, is_profile_complete')
        .eq('id', session.user.id)
        .maybeSingle()

      console.log('Middleware: Profile data:', profile)

      // Check if email is confirmed using database field
      if (!profile?.is_email_verified) {
        // If on confirm-email page, allow access
        if (pathname.startsWith('/confirm-email')) {
          console.log('Middleware: Email not confirmed, allowing confirm-email page')
          return supabaseResponse
        }
        // If on auth pages, allow access
        if (authRoutes.some(route => pathname.startsWith(route))) {
          console.log('Middleware: Email not confirmed, allowing auth page access')
          return supabaseResponse
        }
        // Otherwise redirect to email confirmation
        console.log('Middleware: Email not confirmed, redirecting to /confirm-email')
        return NextResponse.redirect(new URL(`/confirm-email?email=${encodeURIComponent(session.user.email || '')}`, req.url))
      }

      // Email is confirmed - check profile completion
      console.log('Middleware: Profile completion status:', profile?.is_profile_complete)

      if (!profile?.is_profile_complete) {
        // If on profile-completion page, allow access
        if (pathname.startsWith('/profile-completion')) {
          console.log('Middleware: Profile incomplete, allowing profile-completion page')
          return supabaseResponse
        }
        // Otherwise redirect to profile completion
        console.log('Middleware: Profile incomplete, redirecting to /profile-completion')
        return NextResponse.redirect(new URL('/profile-completion', req.url))
      }

      // Profile is complete - if on auth pages or profile-completion, redirect to dashboard
      if (authRoutes.some(route => pathname.startsWith(route)) || pathname.startsWith('/profile-completion')) {
        console.log('Middleware: Profile complete, redirecting to /dashboard')
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }

      // Allow access to protected routes
      console.log('Middleware: Session and profile complete, allowing access')
      return supabaseResponse
    } catch (error) {
      console.error('Middleware: Error checking profile:', error)
      // On error, allow the request to continue
      return supabaseResponse
    }
  }

  console.log('Middleware: Allowing request to continue');
  return supabaseResponse;
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