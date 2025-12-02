import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { applyPrivacyRulesToBets } from '@/lib/privacy-utils'
import type { BetPredictionWithPrivacy } from '@/types/bets'

export interface TrendingBet {
  id: string
  creator_id: string
  opponent_id: string | null
  match_id: string
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'settled'
  max_participants: number
  is_system_generated?: boolean
  created_at: string
  settled_at: string | null
  min_opponent_amount: number
  participant_count: number
  total_wagered: number
  activity_score: number
  isParticipant?: boolean
  match?: {
    id: string
    fixture_id?: string
    start_time: string
    status: string
    match_result: string | null
    home_score: number | null
    away_score: number | null
    competition: string | null
    home_team: {
      id: string
      name: string
      logo_url: string | null
      cloudinary_logo_url?: string | null
      country?: string | null
    }
    away_team: {
      id: string
      name: string
      logo_url: string | null
      cloudinary_logo_url?: string | null
      country?: string | null
    }
    sport?: {
      id: string
      name: string
    }
  }
  creator?: {
    id: string
    username: string
    avatar_url?: string | null
  }
  bet_predictions?: BetPredictionWithPrivacy[]
}

export interface TrendingBetsParams {
  sportId?: string
  leagueId?: string
  limit?: number
  orderBy?: 'activity_score' | 'participant_count' | 'total_wagered'
}

async function fetchTrendingBets(params: TrendingBetsParams): Promise<TrendingBet[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const viewerId = session?.user?.id ?? null

  // Query the materialized view to get trending bet IDs and metrics
  const { data: metricsData, error: metricsError } = await supabase
    .from('bet_activity_metrics')
    .select('bet_id, participant_count, total_wagered, activity_score, status')
    .order(params.orderBy ?? 'participant_count', { ascending: false })
    .limit(params.limit ?? 20)

  if (metricsError) {
    console.error('Error fetching bet activity metrics:', metricsError)
    throw new Error('Failed to fetch bet activity metrics')
  }

  if (!metricsData || metricsData.length === 0) {
    return []
  }

  // Extract bet IDs from metrics
  const betIds = metricsData.map((item) => item.bet_id)

  // Query bets with all related data
  let query = supabase
    .from('bets')
    .select(`
      *,
      match:matches(*,
        home_team:sports_teams!matches_home_team_id_fkey(id, name, logo_url, cloudinary_logo_url, country),
        away_team:sports_teams!matches_away_team_id_fkey(id, name, logo_url, cloudinary_logo_url, country),
        sport:sports(*)
      ),
      creator:users!bets_creator_id_fkey(id, username, avatar_url),
      bet_predictions(user_id, prediction, amount)
    `)

  // Apply optional sport/league filters via the embedded match relationship
  if (params.sportId) {
    query = query.eq('match.sport_id', params.sportId)
  }
  if (params.leagueId) {
    query = query.eq('match.league_id', params.leagueId)
  }

  // Build OR condition for bet IDs
  if (betIds.length === 1) {
    query = query.eq('id', betIds[0])
  } else {
    const orCondition = betIds.map((id) => `id.eq.${id}`).join(',')
    query = query.or(orCondition)
  }

  const { data: betsData, error: betsError } = await query

  if (betsError) {
    console.error('Error fetching bets:', betsError)
    throw new Error('Failed to fetch bets')
  }

  if (!betsData || betsData.length === 0) {
    // Fallback: Query bets directly if materialized view has stale data
    let fallbackQuery = supabase
      .from('bets')
      .select(`
        *,
        match:matches(*,
          home_team:sports_teams!matches_home_team_id_fkey(id, name, logo_url, cloudinary_logo_url, country),
          away_team:sports_teams!matches_away_team_id_fkey(id, name, logo_url, cloudinary_logo_url, country),
          sport:sports(*)
        ),
        creator:users!bets_creator_id_fkey(id, username, avatar_url),
        bet_predictions(user_id, prediction, amount)
      `)
      .eq('status', 'pending')
      .is('opponent_id', null)

    if (params.sportId) {
      fallbackQuery = fallbackQuery.eq('match.sport_id', params.sportId)
    }
    if (params.leagueId) {
      fallbackQuery = fallbackQuery.eq('match.league_id', params.leagueId)
    }

    const { data: fallbackBets, error: fallbackError } = await fallbackQuery
      .order('created_at', { ascending: false })
      .limit(params.limit ?? 20)

    if (fallbackError || !fallbackBets) {
      return []
    }

    const sanitizedFallback = await applyPrivacyRulesToBets(fallbackBets, viewerId)
    let fallbackResults = sanitizedFallback.map((bet: any) => ({
      ...bet,
      isParticipant: bet.bet_predictions?.some((p: any) => p.user_id === viewerId) ?? false,
      participant_count: bet.bet_predictions?.length || 0,
      total_wagered: bet.bet_predictions?.reduce((sum: number, p: any) => sum + (Number(p.amount ?? 0) || 0), 0) || 0,
      activity_score: 0,
    })) as TrendingBet[]

    // Apply client-side filtering for sport/league (as backup to server-side filtering)
    if (params.sportId) {
      fallbackResults = fallbackResults.filter((bet: any) => {
        return bet.match?.sport?.id === params.sportId
      })
    }
    if (params.leagueId) {
      fallbackResults = fallbackResults.filter((bet: any) => {
        const match = bet.match
        if (!match) return false
        return match.league_id === params.leagueId || match.competition === params.leagueId
      })
    }

    return fallbackResults
  }

  // Apply privacy rules
  const sanitizedBets = await applyPrivacyRulesToBets(betsData, viewerId)

  // Merge metrics with bet data
  const metricsMap = new Map(metricsData.map((item) => [item.bet_id, item]))

  // Filter and transform
  let validBets = sanitizedBets
    .filter((bet: any) => bet.opponent_id === null && (bet.status === 'pending' || bet.status === 'accepted'))
    .map((bet: any) => {
      const metrics = metricsMap.get(bet.id)
      return {
        ...bet,
        isParticipant: bet.bet_predictions?.some((p: any) => p.user_id === viewerId) ?? false,
        participant_count: metrics?.participant_count || bet.bet_predictions?.length || 0,
        total_wagered: metrics?.total_wagered || 0,
        activity_score: metrics?.activity_score || 0,
      } as TrendingBet
    })

  // Apply client-side filtering for sport/league (as backup to server-side filtering)
  if (params.sportId) {
    validBets = validBets.filter((bet: any) => {
      return bet.match?.sport?.id === params.sportId
    })
  }
  if (params.leagueId) {
    validBets = validBets.filter((bet: any) => {
      // Check if match has league_id or if competition matches
      const match = bet.match
      if (!match) return false
      // If league_id is available on match, use it; otherwise try to match by competition name
      return match.league_id === params.leagueId || match.competition === params.leagueId
    })
  }

  // Sort by metrics
  validBets.sort((a, b) => {
    const aMetrics = metricsMap.get(a.id)
    const bMetrics = metricsMap.get(b.id)
    return (bMetrics?.participant_count || 0) - (aMetrics?.participant_count || 0)
  })

  return validBets
}

export function useTrendingBets(params: TrendingBetsParams = {}) {
  return useQuery({
    queryKey: ['trending-bets', params],
    queryFn: () => fetchTrendingBets(params),
    staleTime: 30 * 1000, // 30 seconds - trending data changes frequently
  })
}

