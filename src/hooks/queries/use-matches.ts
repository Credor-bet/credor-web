import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export interface MatchWithTeams {
  id: string
  sport_id: string
  league_id: string | null
  home_team_id: string
  away_team_id: string
  start_time: string
  end_time: string | null
  status: MatchStatus
  home_score: number | null
  away_score: number | null
  match_result: 'home_win' | 'away_win' | 'draw' | null
  competition: string | null
  home_team: {
    id: string
    name: string
    logo_url: string | null
    cloudinary_logo_url?: string | null
    country: string | null
  }
  away_team: {
    id: string
    name: string
    logo_url: string | null
    cloudinary_logo_url?: string | null
    country: string | null
  }
  sport?: {
    id: string
    name: string
  }
}

async function fetchMatches(): Promise<MatchWithTeams[]> {
  const { data, error } = await supabase
    .from('matches')
    .select(
      `
      *,
      home_team:sports_teams!matches_home_team_id_fkey(*),
      away_team:sports_teams!matches_away_team_id_fkey(*)
    `,
    )
    .eq('status', 'scheduled')
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Error fetching matches:', error)
    return []
  }

  return (data ?? []) as MatchWithTeams[]
}

export function useMatches() {
  return useQuery({
    queryKey: ['matches'],
    queryFn: fetchMatches,
  })
}

// ============================================
// Upcoming Matches Query (with filters)
// ============================================

export interface UpcomingMatchesParams {
  sportId?: string
  homeTeamId?: string
  awayTeamId?: string
}

async function fetchUpcomingMatches(params: UpcomingMatchesParams): Promise<MatchWithTeams[]> {
  let query = supabase
    .from('matches')
    .select(`
      *,
      home_team:sports_teams!matches_home_team_id_fkey(id, name, logo_url, cloudinary_logo_url, country),
      away_team:sports_teams!matches_away_team_id_fkey(id, name, logo_url, cloudinary_logo_url, country),
      sport:sports(id, name)
    `)
    .eq('status', 'scheduled')
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(50)

  if (params.sportId) {
    query = query.eq('sport_id', params.sportId)
  }
  if (params.homeTeamId) {
    query = query.eq('home_team_id', params.homeTeamId)
  }
  if (params.awayTeamId) {
    query = query.eq('away_team_id', params.awayTeamId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching upcoming matches:', error)
    return []
  }

  return (data ?? []) as MatchWithTeams[]
}

export function useUpcomingMatches(params: UpcomingMatchesParams = {}) {
  return useQuery({
    queryKey: ['upcoming-matches', params],
    queryFn: () => fetchUpcomingMatches(params),
    enabled: !!(params.sportId || params.homeTeamId || params.awayTeamId),
    staleTime: 60 * 1000, // 1 minute
  })
}


