import { supabase } from './supabase'

/**
 * Find user email by username or email
 * @param identifier - Username or email
 * @returns User email if found, null otherwise
 */
export async function findUserEmail(identifier: string): Promise<string | null> {
  try {
    console.log('Finding user email for identifier:', identifier)
    
    // First, try to find by email (exact match)
    const { data: emailUser, error: emailError } = await supabase
      .from('users')
      .select('email')
      .eq('email', identifier)
      .maybeSingle()

    if (emailError) {
      console.error('Error finding user by email:', emailError)
    } else if (emailUser) {
      console.log('Found user by email:', emailUser.email)
      return emailUser.email
    }

    // If not found by email, try to find by username
    const { data: usernameUser, error: usernameError } = await supabase
      .from('users')
      .select('email')
      .eq('username', identifier)
      .maybeSingle()

    if (usernameError) {
      console.error('Error finding user by username:', usernameError)
    } else if (usernameUser) {
      console.log('Found user by username:', usernameUser.email)
      return usernameUser.email
    }

    console.log('No user found for identifier:', identifier)
    return null
  } catch (error) {
    console.error('Error finding user email:', error)
    return null
  }
}

/**
 * Sign in with username or email
 * @param identifier - Username or email
 * @param password - User password
 * @returns Sign in result
 */
export async function signInWithUsernameOrEmail(
  identifier: string, 
  password: string
): Promise<{
  success: boolean
  error?: string
  needsConfirmation?: boolean
  email?: string
}> {
  try {
    // First, try to find the user's email
    const email = await findUserEmail(identifier)
    
    if (!email) {
      // If we can't find the user in the database, try direct sign-in
      // This handles cases where the user exists in auth but not in our users table
      console.log('User not found in database, trying direct sign-in with identifier')
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier,
        password,
      })
      
      if (error) {
        return {
          success: false,
          error: 'User not found. Please check your username/email and try again.'
        }
      }
      
      if (data.user) {
        return {
          success: true
        }
      }
      
      return {
        success: false,
        error: 'User not found. Please check your username/email and try again.'
      }
    }

    // Try to sign in with the email
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.log('Sign in error:', error.message)
      // Check if the error is related to email confirmation
      if (error.message.includes('Email not confirmed') || 
          error.message.includes('email_confirmed_at') ||
          error.message.includes('confirm') ||
          error.message.includes('Email not verified')) {
        console.log('Detected unconfirmed email, redirecting to confirmation flow')
        return {
          success: false,
          needsConfirmation: true,
          email: email
        }
      }
      
      return {
        success: false,
        error: error.message
      }
    }

    if (data.user) {
      // Check email confirmation status in the database
      const { data: profile } = await supabase
        .from('users')
        .select('is_email_verified')
        .eq('id', data.user.id)
        .maybeSingle()
      
      console.log('Auth utils: Database email verification status:', profile?.is_email_verified)
      
      // Check if email is confirmed using database field
      if (!profile?.is_email_verified) {
        console.log('Email not confirmed based on database field')
        return {
          success: false,
          needsConfirmation: true,
          email: email
        }
      }

      return {
        success: true
      }
    }

    return {
      success: false,
      error: 'Sign in failed. Please try again.'
    }
  } catch (error) {
    console.error('Error in signInWithUsernameOrEmail:', error)
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.'
    }
  }
} 