import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Helper function to create redirect response 
function createAuthRedirect(url: string) {
  return NextResponse.redirect(url)
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    
    // Debug: Log available cookies
    console.log('Auth callback - Available cookies:')
    cookieStore.getAll().forEach(cookie => {
      if (cookie.name.includes('supabase') || cookie.name.includes('sb-') || cookie.name.includes('apsxilfojvnxmmvxlkea')) {
        console.log(`  ${cookie.name}: ${cookie.value.substring(0, 50)}...`)
      }
    })
    
    // Specifically look for PKCE code verifier
    const codeVerifier = cookieStore.get('sb-apsxilfojvnxmmvxlkea-auth-token-code-verifier')
    console.log('Code verifier found:', !!codeVerifier?.value)
    if (codeVerifier?.value) {
      console.log('Code verifier length:', codeVerifier.value.length)
    }
    
    // Create Supabase server client with proper cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )
    
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (sessionError) {
      console.error('Error exchanging code for session:', sessionError)
      return NextResponse.redirect(requestUrl.origin + '/signin?error=auth_callback_error')
    }
    
    if (session?.user) {
      
      // Check if user profile exists
      const { data: profile, error } = await supabase
        .from('users')
        .select('is_profile_complete, is_email_verified')
        .eq('id', session.user.id)
        .maybeSingle()
      
      if (error) {
        console.error('Error fetching user profile:', error)
        // If there's an error, redirect to profile completion as fallback
        return NextResponse.redirect(requestUrl.origin + '/profile-completion')
      }
      
      if (!profile) {
        // User doesn't exist in users table yet (OAuth signup)
        // Generate a unique username
        const baseUsername = session.user.user_metadata?.full_name?.toLowerCase().replace(/\s+/g, '_') || 
                            session.user.email?.split('@')[0] || 
                            `user_${session.user.id.slice(0, 8)}`
        
        // Add timestamp to ensure uniqueness
        const uniqueUsername = `${baseUsername}_${Date.now().toString().slice(-6)}`
        
        const userData = {
          id: session.user.id,
          email: session.user.email,
          username: uniqueUsername,
          avatar_url: session.user.user_metadata?.avatar_url || null,
          is_email_verified: true, // OAuth users have verified emails
          is_profile_complete: false, // They still need to complete profile
          created_at: new Date().toISOString()
        }
        
        const { error: insertError } = await supabase
          .from('users')
          .insert(userData)
        
        if (insertError) {
          console.error('Error creating user profile:', insertError)
          // Still redirect to profile completion so user can retry
        }
        
        // New OAuth user always goes to profile completion
        return createAuthRedirect(requestUrl.origin + '/profile-completion')
      }
      
      if (profile.is_profile_complete) {
        // Profile is complete, redirect to dashboard
        return createAuthRedirect(requestUrl.origin + '/dashboard')
      } else {
        // Profile exists but is not complete, redirect to profile completion
        return createAuthRedirect(requestUrl.origin + '/profile-completion')
      }
    }
  }

  // Fallback redirect to signin if something goes wrong
  return NextResponse.redirect(requestUrl.origin + '/signin')
} 