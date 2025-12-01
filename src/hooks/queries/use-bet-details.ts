import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { applyPrivacyRulesToBets } from '@/lib/privacy-utils'
import type { BetPredictionWithPrivacy } from '@/types/bets'

export interface BetDetails {
  id: string
  creator_id: string
  opponent_id: string | null
  match_id: string
  min_opponent_amount: number
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'settled'
  max_participants: number
  is_system_generated?: boolean
  created_at: string
  updated_at: string
  settled_at: string | null
  matches?: {
    home_team_id: string
    away_team_id: string
    start_time: string
    status: string
    match_result: string | null
    home_score: number | null
    away_score: number | null
    competition: string | null
    home_team?: {
      name: string
      logo_url: string | null
      cloudinary_logo_url?: string | null
    }
    away_team?: {
      name: string
      logo_url: string | null
      cloudinary_logo_url?: string | null
    }
    sport?: {
      id: string
      name: string
    }
  }
  creator?: {
    username: string
    avatar_url: string | null
  }
  opponent?: {
    username: string
    avatar_url: string | null
  }
  bet_predictions?: BetPredictionWithPrivacy[]
}

async function fetchBetDetails(betId: string): Promise<BetDetails | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const viewerId = session?.user?.id ?? null

  const { data, error } = await supabase
    .from('bets')
    .select(`
      *,
      matches:matches!inner(
        *,
        home_team:sports_teams!matches_home_team_id_fkey(id, name, logo_url, cloudinary_logo_url),
        away_team:sports_teams!matches_away_team_id_fkey(id, name, logo_url, cloudinary_logo_url),
        sport:sports(id, name)
      ),
      creator:users!bets_creator_id_fkey(id, username, avatar_url),
      opponent:users!bets_opponent_id_fkey(id, username, avatar_url),
      bet_predictions(user_id, prediction, amount)
    `)
    .eq('id', betId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null
    }
    console.error('Error fetching bet details:', error)
    throw new Error(error.message)
  }

  if (!data) {
    return null
  }

  // Apply privacy rules
  const [sanitizedBet] = await applyPrivacyRulesToBets([data], viewerId)

  return sanitizedBet as BetDetails
}

export function useBetDetailsQuery(betId: string | undefined) {
  return useQuery({
    queryKey: ['bet-details', betId],
    queryFn: () => fetchBetDetails(betId!),
    enabled: !!betId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

