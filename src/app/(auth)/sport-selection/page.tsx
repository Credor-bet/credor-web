'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { SportSelection } from '@/components/onboarding/sport-selection'
import { sportsService } from '@/lib/supabase/sports'

export default function SportSelectionPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuthAndPreferences = async () => {
      try {
        // Check authentication
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push('/signin')
          return
        }

        // Check if profile is complete
        if (!user?.is_profile_complete) {
          router.push('/profile-completion')
          return
        }

        // Check if user already has explicit sport preferences
        // If they have any sport with is_interested = false, they've made explicit choices
        // If they only have all sports with is_interested = true, that's likely defaults from trigger
        const hasExplicit = await sportsService.hasExplicitPreferences()
        
        // If they have explicit preferences (any false values), they've already made choices
        // Skip selection and go to dashboard
        if (hasExplicit) {
          router.push('/dashboard')
          return
        }

        setIsChecking(false)
      } catch (error) {
        console.error('Error checking auth and preferences:', error)
        // On error, allow them to proceed (better UX than blocking)
        setIsChecking(false)
      }
    }

    checkAuthAndPreferences()
  }, [user, router])

  const handleComplete = () => {
    router.push('/dashboard')
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <SportSelection onComplete={handleComplete} />
    </div>
  )
}

