'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PredictionType } from '@/types/bets'

// ============================================
// Join Bet Mutation
// ============================================

export interface JoinBetVariables {
  betId: string
  amount: number
  prediction: PredictionType
}

async function joinBet(variables: JoinBetVariables): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase.rpc('join_bet', {
    p_bet_id: variables.betId,
    p_user_id: session.user.id,
    p_amount: variables.amount,
    p_prediction: variables.prediction,
  })

  if (error) throw new Error(error.message)
  return data ?? false
}

export function useJoinBetMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['join-bet'],
    mutationFn: joinBet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bets'] })
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['trending-bets'] })
    },
  })
}

// ============================================
// Place Bet (Create Challenge) Mutation
// ============================================

export interface PlaceBetVariables {
  opponentId?: string | null
  matchId: string
  amount: number
  minOpponentAmount: number
  prediction: PredictionType
  maxParticipants?: number
}

async function placeBet(variables: PlaceBetVariables): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase.rpc('place_bet', {
    p_creator_id: session.user.id,
    p_opponent_id: variables.opponentId ?? null,
    p_match_id: variables.matchId,
    p_amount: variables.amount,
    p_min_opponent_amount: variables.minOpponentAmount,
    p_prediction: variables.prediction,
    p_max_participants: variables.maxParticipants ?? 2,
  })

  if (error) throw new Error(error.message)
  return data // Returns new bet ID
}

export function usePlaceBetMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['place-bet'],
    mutationFn: placeBet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bets'] })
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['trending-bets'] })
    },
  })
}

// ============================================
// Leave Bet Mutation
// ============================================

export interface LeaveBetVariables {
  betId: string
}

async function leaveBet(variables: LeaveBetVariables): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase.rpc('leave_bet', {
    p_bet_id: variables.betId,
    p_user_id: session.user.id,
  })

  if (error) throw new Error(error.message)
  return data ?? false
}

export function useLeaveBetMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['leave-bet'],
    mutationFn: leaveBet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bets'] })
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['trending-bets'] })
    },
  })
}

// ============================================
// Reject Bet Mutation
// ============================================

export interface RejectBetVariables {
  betId: string
}

async function rejectBet(variables: RejectBetVariables): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase.rpc('reject_bet', {
    p_bet_id: variables.betId,
    p_user_id: session.user.id,
  })

  if (error) throw new Error(error.message)
  return data ?? false
}

export function useRejectBetMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['reject-bet'],
    mutationFn: rejectBet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bets'] })
    },
  })
}

// ============================================
// Cancel Bet Mutation
// ============================================

export interface CancelBetVariables {
  betId: string
}

async function cancelBet(variables: CancelBetVariables): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase.rpc('cancel_bet', {
    p_bet_id: variables.betId,
    p_user_id: session.user.id,
  })

  if (error) throw new Error(error.message)
  return data ?? false
}

export function useCancelBetMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['cancel-bet'],
    mutationFn: cancelBet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bets'] })
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['trending-bets'] })
    },
  })
}

