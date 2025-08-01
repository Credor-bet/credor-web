import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code)
    
    if (session?.user) {
      // Check if user profile exists and is complete
      const { data: profile } = await supabase
        .from('users')
        .select('is_profile_complete')
        .eq('id', session.user.id)
        .single()
      
      if (profile?.is_profile_complete) {
        // Profile is complete, redirect to dashboard
        return NextResponse.redirect(requestUrl.origin + '/dashboard')
      } else {
        // Profile is not complete, redirect to profile completion
        return NextResponse.redirect(requestUrl.origin + '/profile-completion')
      }
    }
  }

  // Fallback redirect to signin if something goes wrong
  return NextResponse.redirect(requestUrl.origin + '/signin')
} 