import { supabase } from './supabase'
import { queryClient } from '@/lib/query-client'
import { applyPrivacyRulesToBets } from './privacy-utils'
import type { BetPredictionWithPrivacy, PredictionType } from '@/types/bets'
export type { PredictionType }

export interface Match {
  id: string
  sport_id: string
  home_team_id: string
  away_team_id: string
  fixture_id: string
  start_time: string
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  home_score?: number
  away_score?: number
  result?: 'home_win' | 'away_win' | 'draw'
  league?: {
    id: string
    name: string
    logo_url?: string | null
    logo_url_dark?: string | null
    tier?: number | null
  } | null
  home_team: {
    id: string
    name: string
    logo_url?: string
    cloudinary_logo_url?: string
    country?: string
  }
  away_team: {
    id: string
    name: string
    logo_url?: string
    cloudinary_logo_url?: string
    country?: string
  }
  sport: {
    id: string
    name: string
  }
}

export interface Sport {
  id: string
  name: string
  category?: string
}

export interface Team {
  id: string
  sport_id: string
  name: string
  logo_url?: string
  cloudinary_logo_url?: string
  country?: string
}

export interface Challenge {
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
  match?: Match
  creator?: {
    id: string
    username: string
    avatar_url?: string
  }
  opponent?: {
    id: string
    username: string
    avatar_url?: string
  }
  bet_predictions?: BetPredictionWithPrivacy[]
  isParticipant?: boolean
  participant_count?: number
  total_wagered?: number
  activity_score?: number
}
export type ChallengeType = 'friend' | 'public'

type ParticipantSource = {
  creator_id?: string | null
  opponent_id?: string | null
  bet_predictions?: BetPredictionWithPrivacy[]
}

const withParticipantFlag = <T extends ParticipantSource>(
  entity: T,
  viewerId: string | null
) => {
  if (!entity) {
    return entity
  }

  if (!viewerId) {
    return { ...entity, isParticipant: false }
  }

  const isCreator = entity.creator_id === viewerId
  const isOpponent = entity.opponent_id === viewerId
  const hasPrediction = entity.bet_predictions?.some(pred => pred.user_id === viewerId)
  // Only count opponent as participant if they've accepted (status is not pending)
  // For private bets, opponent should only be considered a participant after accepting
  const status = (entity as any).status
  const isParticipant = Boolean(
    isCreator || 
    hasPrediction || 
    (isOpponent && status !== 'pending') // Only count as participant if accepted
  )

  return {
    ...entity,
    isParticipant,
  }
}

// Challenge Service class
export class ChallengeService {
  
  /**
   * Get available sports for challenge creation
   */
  static async getSports(): Promise<Sport[]> {
    const { data, error } = await supabase
      .from('sports')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching sports:', error)
      throw new Error('Failed to fetch sports')
    }

    return data || []
  }

  /**
   * Search teams by sport and name
   */
  static async searchTeams(
    searchTerm: string, 
    sportId?: string, 
    limit: number = 30
  ): Promise<Team[]> {
    try {
      const { data, error } = await supabase
        .rpc('search_teams', {
          input_search: searchTerm,
          input_sport_id: sportId || null,
          limit_count: limit
        })

      if (error) {
        console.error('Error searching teams:', error)
        throw new Error('Failed to search teams')
      }

      return data || []
    } catch (error) {
      console.error('Error in searchTeams:', error)
      throw new Error('Failed to search teams')
    }
  }

  /**
   * Get upcoming matches for a sport or teams
   */
  static async getUpcomingMatches(
    sportId?: string,
    homeTeamId?: string,
    awayTeamId?: string,
    limit: number = 20
  ): Promise<Match[]> {
    let query = supabase
      .from('matches')
      .select(`
        *,
        home_team:sports_teams!matches_home_team_id_fkey(id, name, logo_url, cloudinary_logo_url, country),
        away_team:sports_teams!matches_away_team_id_fkey(id, name, logo_url, cloudinary_logo_url, country),
        sport:sports(*)
      `)
      .eq('status', 'scheduled')
      .gte('start_time', new Date().toISOString())
      .order('start_time')
      .limit(limit)

    if (sportId) {
      query = query.eq('sport_id', sportId)
    }
    
    if (homeTeamId) {
      query = query.eq('home_team_id', homeTeamId)
    }
    
    if (awayTeamId) {
      query = query.eq('away_team_id', awayTeamId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching matches:', error)
      throw new Error('Failed to fetch matches')
    }

    return data || []
  }

  /**
   * Create a new challenge/bet
   */
  static async createChallenge({
    opponentId,
    matchId,
    amount,
    minOpponentAmount,
    prediction,
    maxParticipants = 2,
    type = 'friend'
  }: {
    opponentId?: string
    matchId: string
    amount: number
    minOpponentAmount: number
    prediction: PredictionType
    maxParticipants?: number
    type?: ChallengeType
  }): Promise<string> {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      throw new Error('User not authenticated')
    }

    const userId = session.user.id

    try {
      // Call the place_bet function
      const { data: betId, error } = await supabase
        .rpc('place_bet', {
          p_creator_id: userId,
          p_opponent_id: type === 'friend' ? opponentId : null,
          p_match_id: matchId,
          p_amount: amount,
          p_min_opponent_amount: minOpponentAmount,
          p_prediction: prediction,
          p_max_participants: maxParticipants
        })

      if (error) {
        console.error('Error creating challenge:', error)
        throw new Error(error.message || 'Failed to create challenge')
      }

      // Invalidate bets and wallet so React Query refetches fresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bets'] }),
        queryClient.invalidateQueries({ queryKey: ['wallet'] }),
      ])

      return betId
    } catch (error) {
      console.error('Error in createChallenge:', error)
      throw error
    }
  }

  /**
   * Accept a challenge
   */
  static async acceptChallenge(
    challengeId: string,
    amount: number,
    prediction: PredictionType
  ): Promise<boolean> {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      throw new Error('User not authenticated')
    }

    const userId = session.user.id

    try {
      const { data: success, error } = await supabase
        .rpc('join_bet', {
          p_bet_id: challengeId,
          p_user_id: userId,
          p_amount: amount,
          p_prediction: prediction
        })

      if (error) {
        console.error('Error accepting challenge:', error)
        throw new Error(error.message || 'Failed to accept challenge')
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bets'] }),
        queryClient.invalidateQueries({ queryKey: ['wallet'] }),
      ])

      return success || false
    } catch (error) {
      console.error('Error in acceptChallenge:', error)
      throw error
    }
  }

  /**
   * Reject a challenge
   */
  static async rejectChallenge(challengeId: string): Promise<boolean> {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      throw new Error('User not authenticated')
    }

    const userId = session.user.id

    try {
      const { data: success, error } = await supabase
        .rpc('reject_bet', {
          p_bet_id: challengeId,
          p_user_id: userId
        })

      if (error) {
        console.error('Error rejecting challenge:', error)
        throw new Error(error.message || 'Failed to reject challenge')
      }

      await queryClient.invalidateQueries({ queryKey: ['bets'] })

      return success || false
    } catch (error) {
      console.error('Error in rejectChallenge:', error)
      throw error
    }
  }

  /**
   * Cancel a challenge (before it's accepted or while it's accepted but before match starts)
   */
  static async cancelChallenge(challengeId: string): Promise<boolean> {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      throw new Error('User not authenticated')
    }

    const userId = session.user.id

    try {
      const { data: success, error } = await supabase
        .rpc('cancel_bet', {
          p_bet_id: challengeId,
          p_user_id: userId
        })

      if (error) {
        console.error('Error canceling challenge:', error)
        throw new Error(error.message || 'Failed to cancel challenge')
      }

      await queryClient.invalidateQueries({ queryKey: ['bets'] })

      return success || false
    } catch (error) {
      console.error('Error in cancelChallenge:', error)
      throw error
    }
  }

  /**
   * Leave an accepted challenge
   */
  static async leaveChallenge(challengeId: string): Promise<boolean> {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      throw new Error('User not authenticated')
    }

    const userId = session.user.id

    try {
      const { data: success, error } = await supabase
        .rpc('leave_bet', {
          p_bet_id: challengeId,
          p_user_id: userId
        })

      if (error) {
        console.error('Error leaving challenge:', error)
        throw new Error(error.message || 'Failed to leave challenge')
      }

      await queryClient.invalidateQueries({ queryKey: ['bets'] })

      return success || false
    } catch (error) {
      console.error('Error in leaveChallenge:', error)
      throw error
    }
  }

  /**
   * Get challenge details by ID
   */
  static async getChallengeById(challengeId: string): Promise<Challenge | null> {
    try {
      const { data, error } = await supabase
        .from('bets')
        .select(`
          *,
          match:matches(*,
            home_team:sports_teams!matches_home_team_id_fkey(id, name, logo_url, cloudinary_logo_url, country),
            away_team:sports_teams!matches_away_team_id_fkey(id, name, logo_url, cloudinary_logo_url, country),
            sport:sports(*)
          ),
          creator:users!bets_creator_id_fkey(id, username, avatar_url),
          opponent:users!bets_opponent_id_fkey(id, username, avatar_url),
          bet_predictions(user_id, prediction, amount)
        `)
        .eq('id', challengeId)
        .single()

      if (error) {
        console.error('Error fetching challenge:', error)
        return null
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      const viewerId = session?.user?.id ?? null
      const [challenge] = await applyPrivacyRulesToBets(data ? [data] : [], viewerId)
      if (!challenge) {
        return null
      }

      return withParticipantFlag(challenge, viewerId) as Challenge
    } catch (error) {
      console.error('Error in getChallengeById:', error)
      return null
    }
  }

  /**
   * Get user's challenges
   */
  static async getUserChallenges(
    userId: string,
    status?: Challenge['status'][]
  ): Promise<Challenge[]> {
    try {
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
          opponent:users!bets_opponent_id_fkey(id, username, avatar_url),
          bet_predictions(user_id, prediction, amount)
        `)
        .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (status && status.length > 0) {
        query = query.in('status', status)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching user challenges:', error)
        throw new Error('Failed to fetch challenges')
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      const viewerId = session?.user?.id ?? null
      const challenges = await applyPrivacyRulesToBets(data || [], viewerId)
      return (challenges || []).map(challenge => withParticipantFlag(challenge, viewerId) as Challenge)
    } catch (error) {
      console.error('Error in getUserChallenges:', error)
      throw error
    }
  }

  /**
   * Get trending/public challenges
   * Uses bet_activity_metrics materialized view to efficiently query most popular bets
   * 
   * SQL equivalent:
   * SELECT 
   *   b.*,
   *   bam.participant_count,
   *   bam.total_wagered,
   *   bam.activity_score,
   *   json_build_object(
   *     'id', m.id,
   *     'home_team', json_build_object('id', ht.id, 'name', ht.name, 'logo_url', ht.logo_url, 'cloudinary_logo_url', ht.cloudinary_logo_url, 'country', ht.country),
   *     'away_team', json_build_object('id', at.id, 'name', at.name, 'logo_url', at.logo_url, 'cloudinary_logo_url', at.cloudinary_logo_url, 'country', at.country),
   *     'sport', json_build_object('id', s.id, 'name', s.name)
   *   ) as match,
   *   json_build_object('id', u.id, 'username', u.username, 'avatar_url', u.avatar_url) as creator,
   *   json_agg(json_build_object('user_id', bp.user_id, 'prediction', bp.prediction, 'amount', bp.amount)) as bet_predictions
   * FROM bet_activity_metrics bam
   * JOIN bets b ON b.id = bam.bet_id
   * JOIN matches m ON b.match_id = m.id
   * JOIN sports_teams ht ON m.home_team_id = ht.id
   * JOIN sports_teams at ON m.away_team_id = at.id
   * JOIN sports s ON m.sport_id = s.id
   * JOIN users u ON b.creator_id = u.id
   * LEFT JOIN bet_predictions bp ON b.id = bp.bet_id
   * GROUP BY b.id, bam.participant_count, bam.total_wagered, bam.activity_score, m.*, ht.*, at.*, s.*, u.*
   * ORDER BY bam.participant_count DESC
   * LIMIT 20;
   */
  static async getTrendingChallenges(limit: number = 20): Promise<Challenge[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const viewerId = session?.user?.id ?? null
      // Query the materialized view to get trending bet IDs and metrics
      // The view already filters for: status IN ('pending', 'accepted'), opponent_id IS NULL, match.status = 'scheduled', match.start_time > now()
      const { data: metricsData, error: metricsError } = await supabase
        .from('bet_activity_metrics')
        .select('bet_id, participant_count, total_wagered, activity_score, status')
        .order('participant_count', { ascending: false })
        .limit(limit)

      if (metricsError) {
        console.error('Error fetching bet activity metrics:', metricsError)
        throw new Error('Failed to fetch bet activity metrics')
      }

      console.log('📊 Bet activity metrics found:', metricsData?.length || 0, 'rows')
      if (metricsData && metricsData.length > 0) {
        console.log('📊 Sample metrics:', metricsData[0])
      }

      if (!metricsData || metricsData.length === 0) {
        console.log('⚠️ No bet activity metrics found')
        return []
      }

      // Extract bet IDs from metrics
      const betIds = metricsData.map((item: any) => item.bet_id)
      console.log('🔍 Fetching bets for IDs:', betIds)

      // Query bets table - try using .or() with multiple .eq() if .in() doesn't work
      // Build query with all bet IDs
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
      
      // Use .or() with individual .eq() for each bet_id instead of .in()
      if (betIds.length === 1) {
        query = query.eq('id', betIds[0])
      } else {
        // Build OR condition: id.eq.id1,id.eq.id2,...
        const orCondition = betIds.map(id => `id.eq.${id}`).join(',')
        query = query.or(orCondition)
      }
      
      const { data: betsData, error: betsError } = await query
      
      if (betsError) {
        console.error('Error fetching bets:', betsError)
        throw new Error('Failed to fetch bets')
      }

      console.log('🎲 Bets found:', betsData?.length || 0, 'rows')
      
      let betsWithPrivacy: Challenge[] = []
      if (betsData && betsData.length > 0) {
        const sanitizedBets = await applyPrivacyRulesToBets(betsData, viewerId)
        betsWithPrivacy = (sanitizedBets || []).map(bet => withParticipantFlag(bet, viewerId) as Challenge)
      }

      if (!betsWithPrivacy || betsWithPrivacy.length === 0) {
        console.warn('⚠️ No bets found for the bet_ids from metrics. Materialized view may be stale.')
        console.warn('   Falling back to direct bets query...')
        
        // Fallback: Query bets directly if materialized view has stale data
        const { data: fallbackBets, error: fallbackError } = await supabase
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
          .order('created_at', { ascending: false })
          .limit(limit)

        if (fallbackError) {
          console.error('Error in fallback query:', fallbackError)
          return []
        }

        if (!fallbackBets || fallbackBets.length === 0) {
          console.log('⚠️ No public pending bets found')
          return []
        }

        const sanitizedFallback = await applyPrivacyRulesToBets(fallbackBets, viewerId)
        const annotatedFallback = (sanitizedFallback || []).map(bet => withParticipantFlag(bet, viewerId) as Challenge)

        // Sort by participant count from bet_predictions
        const sortedFallback = annotatedFallback.sort((a: any, b: any) => {
          const aParticipants = a.bet_predictions?.length || 0
          const bParticipants = b.bet_predictions?.length || 0
          return bParticipants - aParticipants
        })

        console.log('✅ Fallback: Found', sortedFallback.length, 'trending bets from direct query')
        return sortedFallback.map((bet: any) => ({
          ...bet,
          participant_count: bet.bet_predictions?.length || 0,
          total_wagered: bet.bet_predictions?.reduce((sum: number, p: any) => sum + (Number(p.amount ?? 0) || 0), 0) || 0,
        }))
      }

      if (betsWithPrivacy && betsWithPrivacy.length > 0) {
        console.log('🎲 Sample bet:', {
          id: betsWithPrivacy[0].id,
          status: betsWithPrivacy[0].status,
          opponent_id: betsWithPrivacy[0].opponent_id,
          has_match: !!betsWithPrivacy[0].match
        })
      }

      // Step 4: Merge metrics with bet data
      const metricsMap = new Map(
        metricsData.map((item: any) => [item.bet_id, item])
      )

      // Filter out any bets that don't match the criteria (safety check)
      const validBets = (betsWithPrivacy || []).filter((bet: any) => {
        // Ensure bet is public (opponent_id is null) and has valid status
        const isValid = bet.opponent_id === null && 
                       (bet.status === 'pending' || bet.status === 'accepted')
        if (!isValid) {
          console.warn(`⚠️ Bet ${bet.id} doesn't match criteria:`, {
            opponent_id: bet.opponent_id,
            status: bet.status
          })
        }
        return isValid
      })

      const transformed = validBets
        .map((bet: any) => {
          const metrics = metricsMap.get(bet.id)
          return {
            ...bet,
            participant_count: metrics?.participant_count || bet.bet_predictions?.length || 0,
            total_wagered: metrics?.total_wagered || 0,
            activity_score: metrics?.activity_score || 0,
          }
        })
        // Maintain the order from metrics (most popular first)
        .sort((a: any, b: any) => {
          const aMetrics = metricsMap.get(a.id)
          const bMetrics = metricsMap.get(b.id)
          return (bMetrics?.participant_count || 0) - (aMetrics?.participant_count || 0)
        })

      console.log('✅ Transformed trending bets:', transformed.length, 'valid bets')
      return transformed
    } catch (error) {
      console.error('Error in getTrendingChallenges:', error)
      throw error
    }
  }
}