'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useBets } from '@/hooks/queries/use-bets'

export function useBettingStore() {
  const { data: bets = [], isLoading } = useBets()
  const queryClient = useQueryClient()

  const activeBets = bets.filter(
    (bet) => bet.status === 'pending' || bet.status === 'accepted',
  )
  const betHistory = bets.filter(
    (bet) =>
      bet.status === 'settled' ||
      bet.status === 'cancelled' ||
      bet.status === 'rejected',
  )

  const refreshBets = async () => {
    await queryClient.invalidateQueries({ queryKey: ['bets'] })
  }

  const setActiveBets = () => {
    // no-op: React Query is source of truth
  }

  const setBetHistory = () => {
    // no-op
  }

  const setLoadingBets = () => {
    // no-op
  }

  const debugUserData = async () => {
    // optional helper, no-op here
  }

  return {
    activeBets,
    betHistory,
    isLoadingBets: isLoading,
    refreshBets,
    setActiveBets,
    setBetHistory,
    setLoadingBets,
    debugUserData,
  }
}


