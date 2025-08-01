'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { devLog, devError } from '@/lib/utils'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading] = useState(true)
  const { setUser: setStoreUser, setLoading: setStoreLoading } = useAuthStore()
  const profileFetchRef = useRef<Set<string>>(new Set())
  const isInitializedRef = useRef(false)

  // Memoized function to fetch user profile
  const fetchUserProfile = useCallback(async (userId: string) => {
    // Prevent duplicate fetches for the same user
    if (profileFetchRef.current.has(userId)) {
      return null
    }
    
    profileFetchRef.current.add(userId)
    
    try {
      // First try to find by user ID (primary key)
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (error) {
        devError('Auth provider: Error fetching profile by ID:', error)
        return null
      }
      
      if (profile) {
        return profile
      }
      
      // If not found by ID, try to find by email (in case of auth sync issues)
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const { data: profileByEmail, error: emailError } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.email)
          .maybeSingle()
        
        if (emailError) {
          devError('Auth provider: Error fetching profile by email:', emailError)
          return null
        }
        
        if (profileByEmail) {
          devLog('Auth provider: Found profile by email, user ID mismatch detected')
          return profileByEmail
        }
      }
      
      return null
    } catch (error) {
      devError('Auth provider: Error in profile fetch:', error)
      return null
    } finally {
      // Remove from tracking after a delay to allow for retries
      setTimeout(() => {
        profileFetchRef.current.delete(userId)
      }, 5000)
    }
  }, [])

  // Memoized function to sync email verification
  const syncEmailVerification = useCallback(async (userId: string, authEmailConfirmed: boolean, dbEmailVerified: boolean) => {
    if (authEmailConfirmed && !dbEmailVerified) {
      devLog('Auth provider: Syncing email verification status')
      try {
        const { error: updateError } = await supabase
          .from('users')
          .update({ is_email_verified: true })
          .eq('id', userId)
        
        if (updateError) {
          devError('Auth provider: Error updating email verification:', updateError)
          return false
        } else {
          devLog('Auth provider: Email verification status synced')
          return true
        }
      } catch (error) {
        devError('Auth provider: Error syncing email verification:', error)
        return false
      }
    }
    return false
  }, [])

  // Memoized function to create user profile
  const createUserProfile = useCallback(async (sessionUser: User) => {
    devLog('Auth provider: No profile found, creating new one')
    try {
      // Double-check that no profile exists before creating
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id')
        .eq('email', sessionUser.email)
        .maybeSingle()
      
      if (existingProfile) {
        devLog('Auth provider: Profile already exists, returning existing profile')
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', existingProfile.id)
          .single()
        return profile
      }
      
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert({
          id: sessionUser.id,
          username: sessionUser.user_metadata?.username || sessionUser.email?.split('@')[0] || 'user',
          email: sessionUser.email || '',
          is_email_verified: sessionUser.email_confirmed_at ? true : false,
          is_profile_complete: false,
        })
        .select()
        .single()
      
      if (createError) {
        // If it's a duplicate key error, try to fetch the existing profile
        if (createError.code === '23505') {
          devLog('Auth provider: Duplicate key error, fetching existing profile')
          const { data: existingProfile } = await supabase
            .from('users')
            .select('*')
            .eq('email', sessionUser.email)
            .single()
          return existingProfile
        }
        devError('Auth provider: Error creating profile:', createError)
        return null
      } else if (newProfile) {
        devLog('Auth provider: Created new profile')
        return newProfile
      }
    } catch (error) {
      devError('Auth provider: Error creating profile:', error)
    }
    return null
  }, [])

  // Memoized function to handle user session
  const handleUserSession = useCallback(async (session: { user?: User } | null) => {
    if (!session?.user) {
      devLog('Auth provider: No session, clearing user')
      setUser(null)
      setStoreUser(null)
      setStoreLoading(false)
      return
    }

    devLog('Auth provider: User session found, fetching profile')
    setUser(session.user)
    setStoreLoading(false)

    try {
      const profile = await fetchUserProfile(session.user.id)
      
      if (profile) {
        devLog('Auth provider: Found existing profile')
        
        // Check if we need to sync email verification status
        const authEmailConfirmed = !!session.user.email_confirmed_at
        const dbEmailVerified = profile.is_email_verified
        
        if (authEmailConfirmed && !dbEmailVerified) {
          const synced = await syncEmailVerification(session.user.id, authEmailConfirmed, dbEmailVerified)
          if (synced) {
            profile.is_email_verified = true
          }
        }
        
        setStoreUser(profile)
      } else {
        const newProfile = await createUserProfile(session.user)
        if (newProfile) {
          setStoreUser(newProfile)
        }
      }
    } catch (error) {
      devError('Auth provider: Error in profile handling:', error)
    }
  }, [fetchUserProfile, syncEmailVerification, createUserProfile, setStoreUser, setStoreLoading])

  useEffect(() => {
    // Get initial session only once
    const getInitialSession = async () => {
      if (isInitializedRef.current) return
      isInitializedRef.current = true
      
      try {
        const { data: { session } } = await supabase.auth.getSession()
        await handleUserSession(session)
      } catch (error) {
        devError('Error getting initial session:', error)
        setStoreLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        devLog('Auth state changed:', event, session?.user?.email, 'Email confirmed:', !!session?.user?.email_confirmed_at)
        await handleUserSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [handleUserSession, setStoreLoading])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 