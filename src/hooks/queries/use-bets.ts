import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { applyPrivacyRulesToBets } from '@/lib/privacy-utils'
import type { BetPredictionWithPrivacy } from '@/types/bets'

export type BetStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'settled'

export interface BetWithDetails {
  id: string
  creator_id: string
  opponent_id: string | null
  match_id: string
  min_opponent_amount: number
  status: BetStatus
  max_participants: number
  created_at: string
  updated_at: string
  settled_at: string | null
  is_system_generated?: boolean
  bet_predictions?: BetPredictionWithPrivacy[]
  matches?: {
    id: string
    fixture_id?: string
    start_time: string
    status: string
    match_result: string | null
    home_score: number | null
    away_score: number | null
    competition: string | null
    home_team?: {
      id: string
      name: string
      logo_url: string | null
      cloudinary_logo_url?: string | null
    }
    away_team?: {
      id: string
      name: string
      logo_url: string | null
      cloudinary_logo_url?: string | null
    }
    sport?: {
      id: string
      name: string
    }
    league?: {
      id: string
      name: string
      logo_url: string | null
      logo_url_dark: string | null
      tier: number | null
    } | null
  }
  creator?: {
    id: string
    username: string
    avatar_url: string | null
  }
  opponent?: {
    id: string
    username: string
    avatar_url: string | null
  }
  isParticipant?: boolean
}

async function fetchBets(): Promise<BetWithDetails[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) return []

  const userId = session.user.id

  // First, get all bet IDs where user is a participant
  const { data: participantBetIds } = await supabase
    .from('bet_predictions')
    .select('bet_id')
    .eq('user_id', userId)

  const betIdsFromPredictions = participantBetIds?.map(p => p.bet_id) ?? []

  // Fetch bets with full details including match, teams, and predictions
  // Include bets where user is creator, opponent, or has a prediction
  let query = supabase
    .from('bets')
    .select(`
      *,
      matches:matches(
        id,
        fixture_id,
        start_time,
        status,
        match_result,
        home_score,
        away_score,
        home_team:sports_teams!matches_home_team_id_fkey(id, name, logo_url, cloudinary_logo_url),
        away_team:sports_teams!matches_away_team_id_fkey(id, name, logo_url, cloudinary_logo_url),
        sport:sports(id, name),
        league:leagues(id, name, logo_url, logo_url_dark, tier)
      ),
      creator:users!bets_creator_id_fkey(id, username, avatar_url),
      opponent:users!bets_opponent_id_fkey(id, username, avatar_url),
      bet_predictions(user_id, prediction, amount)
    `)
    .order('created_at', { ascending: false })

  // Build filter: creator_id = userId OR opponent_id = userId OR id in betIdsFromPredictions
  if (betIdsFromPredictions.length > 0) {
    query = query.or(`creator_id.eq.${userId},opponent_id.eq.${userId},id.in.(${betIdsFromPredictions.join(',')})`)
  } else {
    query = query.or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching user bets:', error)
    return []
  }

  if (!data || data.length === 0) {
    return []
  }

  // Apply privacy rules to the bets
  const sanitizedBets = await applyPrivacyRulesToBets(data, userId)

  // Transform and mark participation
  return sanitizedBets.map((bet: any) => ({
    ...bet,
    isParticipant: bet.bet_predictions?.some((p: any) => p.user_id === userId) ?? false,
  })) as BetWithDetails[]
}

export function useBets() {
  return useQuery({
    queryKey: ['bets'],
    queryFn: fetchBets,
  })
}


