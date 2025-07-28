'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
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
  const [loading, setLoading] = useState(true)
  const { setUser: setStoreUser, setLoading: setStoreLoading } = useAuthStore()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
        setStoreLoading(false)
        
        if (session?.user) {
          // Fetch user profile
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (profile) {
            setStoreUser(profile)
          } else {
            // If no profile exists, create one
            const { data: newProfile } = await supabase
              .from('users')
              .insert({
                id: session.user.id,
                username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'user',
                email: session.user.email || '',
                is_email_verified: session.user.email_confirmed_at ? true : false,
              })
              .select()
              .single()
            
            if (newProfile) {
              setStoreUser(newProfile)
            }
          }
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
        setStoreLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        setUser(session?.user ?? null)
        setStoreLoading(false)
        
        if (session?.user) {
          // Fetch user profile
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (profile) {
            setStoreUser(profile)
          } else {
            // If no profile exists, create one
            const { data: newProfile } = await supabase
              .from('users')
              .insert({
                id: session.user.id,
                username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'user',
                email: session.user.email || '',
                is_email_verified: session.user.email_confirmed_at ? true : false,
              })
              .select()
              .single()
            
            if (newProfile) {
              setStoreUser(newProfile)
            }
          }
        } else {
          setStoreUser(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [setStoreUser, setStoreLoading])

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