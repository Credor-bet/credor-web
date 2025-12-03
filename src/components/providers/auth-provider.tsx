'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthSessionStore } from '@/lib/store'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthSessionStore((s) => s.setSession)
  const clearSession = useAuthSessionStore((s) => s.clearSession)
  const queryClient = useQueryClient()

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session)
      } else {
        clearSession()
      }
    })

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setSession(session)
      } else {
        clearSession()
      }

      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        queryClient.invalidateQueries()
      }
    })

    return () => subscription.unsubscribe()
  }, [setSession, clearSession, queryClient])

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (session) {
          setSession(session)
        } else {
          clearSession()
        }
        // React Query will refetch on window focus per config
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [setSession, clearSession])

  return <>{children}</>
}