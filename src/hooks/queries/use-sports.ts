import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Sport, SportPreference } from '@/types/sports'

// ============================================
// Sports Query
// ============================================

async function fetchSports(): Promise<Sport[]> {
  const { data, error } = await supabase
    .from('sports')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw new Error(error.message)
  return data ?? []
}

export function useSports() {
  return useQuery({
    queryKey: ['sports'],
    queryFn: fetchSports,
    staleTime: 5 * 60 * 1000, // Sports rarely change - 5 minutes
  })
}

// ============================================
// Leagues Query
// ============================================

export interface League {
  id: string
  sport_id: string
  name: string
  scope: 'domestic' | 'regional' | 'continental' | 'international'
  logo_url: string | null
  logo_url_dark: string | null
  tier: number | null
  is_active: boolean
}

async function fetchLeagues(sportId?: string): Promise<League[]> {
  let query = supabase
    .from('leagues')
    .select('*')
    .eq('is_active', true)
    .order('tier', { ascending: true, nullsFirst: false })

  if (sportId) {
    query = query.eq('sport_id', sportId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export function useLeagues(sportId?: string) {
  return useQuery({
    queryKey: ['leagues', sportId ?? 'all'],
    queryFn: () => fetchLeagues(sportId),
    staleTime: 5 * 60 * 1000, // Leagues rarely change
  })
}

// ============================================
// Sport Preferences Query
// ============================================

async function fetchSportPreferences(): Promise<SportPreference[]> {
  const { data, error } = await supabase.rpc('get_my_sport_preferences')

  if (error) throw new Error(error.message)
  return data ?? []
}

export function useSportPreferences() {
  return useQuery({
    queryKey: ['sport-preferences'],
    queryFn: fetchSportPreferences,
    staleTime: 5 * 60 * 1000,
  })
}

// ============================================
// Team Search Query
// ============================================

export interface Team {
  id: string
  sport_id: string
  name: string
  logo_url?: string | null
  cloudinary_logo_url?: string | null
  country?: string | null
}

async function searchTeams(
  searchTerm: string,
  sportId?: string,
  limit: number = 30
): Promise<Team[]> {
  if (!searchTerm.trim()) return []

  const { data, error } = await supabase.rpc('search_teams', {
    input_search: searchTerm,
    input_sport_id: sportId || null,
    limit_count: limit,
  })

  if (error) throw new Error(error.message)
  return data ?? []
}

export function useTeamSearch(searchTerm: string, sportId?: string, limit: number = 30) {
  return useQuery({
    queryKey: ['team-search', searchTerm, sportId, limit],
    queryFn: () => searchTeams(searchTerm, sportId, limit),
    enabled: searchTerm.trim().length > 0,
    staleTime: 60 * 1000, // 1 minute
  })
}

