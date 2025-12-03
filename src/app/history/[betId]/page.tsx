'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { useBetDetailsQuery } from '@/hooks/queries/use-bet-details'

/**
 * Redirect wrapper for history/[betId] route.
 * 
 * This route should only be used for bets the user has participated in.
 * All bet detail viewing is now handled by challenges/[betId].
 * 
 * Behavior:
 * - If bet exists and user has participated → redirect to /challenges/[betId]
 * - If bet doesn't exist or user hasn't participated → redirect to /home
 * - If it's an unaccepted incoming challenge → redirect to /challenges
 */
export default function HistoryBetRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const betId = params?.betId as string
  const { user } = useAuthStore()
  
  const { data: betData, isLoading, error } = useBetDetailsQuery(betId)

  useEffect(() => {
    if (isLoading) return

    // If bet doesn't exist or there's an error, redirect to home
    if (error || !betData) {
      router.replace('/home')
      return
    }

    // Check if user has participated (has a prediction)
    const hasParticipated = user && betData.bet_predictions?.some(
      (p) => p.user_id === user.id
    )

    // Check if it's an unaccepted incoming challenge
    const isUnacceptedIncomingChallenge =
      !!user &&
      betData.status === 'pending' &&
      betData.opponent_id === user.id &&
      betData.creator_id !== user.id &&
      !hasParticipated

    if (isUnacceptedIncomingChallenge) {
      // Unaccepted incoming challenges should go to challenges page
      router.replace('/challenges')
    } else if (hasParticipated) {
      // User has participated, redirect to challenges detail page
      router.replace(`/challenges/${betId}`)
    } else {
      // User hasn't participated, redirect to home
      router.replace('/home')
    }
  }, [isLoading, betData, error, user, betId, router])

  // Show loading state while determining redirect
  return (
    <div className="p-4 md:p-6 flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
}
