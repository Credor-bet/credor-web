'use client'

import { supabase } from './supabase'

export interface UpcomingMatch {
  id: string
  fixture_id: string
  start_time: string
  status: string
  home_team_id: string
  away_team_id: string
  home_score: number | null
  away_score: number | null
  home_team: {
    name: string
    logo_url: string | null
    cloudinary_logo_url?: string | null
  }
  away_team: {
    name: string
    logo_url: string | null
    cloudinary_logo_url?: string | null
  }
}

/**
 * Fetch upcoming scheduled matches from the database
 * These are matches that are scheduled to start soon and would have live updates
 */
export async function fetchUpcomingMatches(limit: number = 10): Promise<UpcomingMatch[]> {
  try {
    console.log('🔍 Fetching upcoming scheduled matches...')
    
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        id,
        fixture_id,
        start_time,
        status,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        home_team:sports_teams!matches_home_team_id_fkey (
          name,
          logo_url,
          cloudinary_logo_url
        ),
        away_team:sports_teams!matches_away_team_id_fkey (
          name,
          logo_url,
          cloudinary_logo_url
        )
      `)
      .in('status', ['scheduled', 'in_progress', 'live'])
      .gte('start_time', new Date().toISOString()) // Only future matches
      .order('start_time', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('❌ Error fetching upcoming matches:', error)
      return []
    }

    console.log(`✅ Found ${matches?.length || 0} upcoming matches`)
    
    // Transform and log the matches for debugging
    const transformedMatches = matches?.map(match => ({
      ...match,
      home_team: Array.isArray(match.home_team) ? match.home_team[0] : match.home_team,
      away_team: Array.isArray(match.away_team) ? match.away_team[0] : match.away_team
    })) || []

    if (transformedMatches.length > 0) {
      console.log('📅 Upcoming matches:', transformedMatches.map(match => ({
        fixture_id: match.fixture_id,
        start_time: match.start_time,
        status: match.status,
        teams: `${match.home_team?.name} vs ${match.away_team?.name}`
      })))
    }

    return transformedMatches
  } catch (error) {
    console.error('💥 Error in fetchUpcomingMatches:', error)
    return []
  }
}

/**
 * Fetch matches that are currently live or about to start (within next hour)
 */
export async function fetchLiveAndSoonMatches(): Promise<UpcomingMatch[]> {
  try {
    console.log('🔍 Fetching live and soon-to-start matches...')
    
    const oneHourFromNow = new Date()
    oneHourFromNow.setHours(oneHourFromNow.getHours() + 1)
    
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        id,
        fixture_id,
        start_time,
        status,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        home_team:sports_teams!matches_home_team_id_fkey (
          name,
          logo_url,
          cloudinary_logo_url
        ),
        away_team:sports_teams!matches_away_team_id_fkey (
          name,
          logo_url,
          cloudinary_logo_url
        )
      `)
      .or(`status.in.(in_progress,live),and(status.eq.scheduled,start_time.lte.${oneHourFromNow.toISOString()})`)
      .order('start_time', { ascending: true })
      .limit(20)

    if (error) {
      console.error('❌ Error fetching live/soon matches:', error)
      return []
    }

    console.log(`⚡ Found ${matches?.length || 0} live or soon-to-start matches`)
    
    // Transform matches to handle potential array returns from foreign key joins
    const transformedMatches = matches?.map(match => ({
      ...match,
      home_team: Array.isArray(match.home_team) ? match.home_team[0] : match.home_team,
      away_team: Array.isArray(match.away_team) ? match.away_team[0] : match.away_team
    })) || []
    
    return transformedMatches
  } catch (error) {
    console.error('💥 Error in fetchLiveAndSoonMatches:', error)
    return []
  }
}

/**
 * Get matches that have active bets (challenges) - these are the most important to track
 */
export async function fetchMatchesWithActiveBets(): Promise<UpcomingMatch[]> {
  try {
    console.log('🎯 Fetching matches with active bets...')
    
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        id,
        fixture_id,
        start_time,
        status,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        home_team:sports_teams!matches_home_team_id_fkey (
          name,
          logo_url,
          cloudinary_logo_url
        ),
        away_team:sports_teams!matches_away_team_id_fkey (
          name,
          logo_url,
          cloudinary_logo_url
        ),
        bets!inner (
          id,
          status
        )
      `)
      .in('status', ['scheduled', 'in_progress', 'live'])
      .in('bets.status', ['active', 'pending'])
      .order('start_time', { ascending: true })
      .limit(15)

    if (error) {
      console.error('❌ Error fetching matches with active bets:', error)
      return []
    }

    console.log(`🎲 Found ${matches?.length || 0} matches with active bets`)
    
    // Transform matches to handle potential array returns from foreign key joins
    const transformedMatches = matches?.map(match => ({
      ...match,
      home_team: Array.isArray(match.home_team) ? match.home_team[0] : match.home_team,
      away_team: Array.isArray(match.away_team) ? match.away_team[0] : match.away_team
    })) || []
    
    return transformedMatches
  } catch (error) {
    console.error('💥 Error in fetchMatchesWithActiveBets:', error)
    return []
  }
}
