import { supabase } from './supabase'
import { useAuthStore, useBettingStore } from './store'

export interface Match {
  id: string
  sport_id: string
  home_team_id: string
  away_team_id: string
  start_time: string
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  home_score?: number
  away_score?: number
  result?: 'home_win' | 'away_win' | 'draw'
  home_team: {
    id: string
    name: string
    logo_url?: string
    country?: string
  }
  away_team: {
    id: string
    name: string
    logo_url?: string
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
  bet_predictions?: Array<{
    user_id: string
    prediction: 'home_win' | 'away_win' | 'draw'
    amount: number
  }>
}

export type ChallengeType = 'friend' | 'public'
export type PredictionType = 'home_win' | 'away_win' | 'draw'

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
        home_team:sports_teams!matches_home_team_id_fkey(*),
        away_team:sports_teams!matches_away_team_id_fkey(*),
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
    const { user } = useAuthStore.getState()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    try {
      // Call the place_bet function
      const { data: betId, error } = await supabase
        .rpc('place_bet', {
          p_creator_id: user.id,
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

      // Refresh bets to update the UI
      const bettingStore = useBettingStore.getState()
      if (bettingStore.refreshBets) {
        await bettingStore.refreshBets()
      }

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
    const { user } = useAuthStore.getState()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    try {
      const { data: success, error } = await supabase
        .rpc('join_bet', {
          p_bet_id: challengeId,
          p_user_id: user.id,
          p_amount: amount,
          p_prediction: prediction
        })

      if (error) {
        console.error('Error accepting challenge:', error)
        throw new Error(error.message || 'Failed to accept challenge')
      }

      // Refresh bets to update the UI
      const bettingStore = useBettingStore.getState()
      if (bettingStore.refreshBets) {
        await bettingStore.refreshBets()
      }

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
    const { user } = useAuthStore.getState()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    try {
      const { data: success, error } = await supabase
        .rpc('reject_bet', {
          p_bet_id: challengeId,
          p_user_id: user.id
        })

      if (error) {
        console.error('Error rejecting challenge:', error)
        throw new Error(error.message || 'Failed to reject challenge')
      }

      // Refresh bets to update the UI
      const bettingStore = useBettingStore.getState()
      if (bettingStore.refreshBets) {
        await bettingStore.refreshBets()
      }

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
    const { user } = useAuthStore.getState()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    try {
      const { data: success, error } = await supabase
        .rpc('cancel_bet', {
          p_bet_id: challengeId,
          p_user_id: user.id
        })

      if (error) {
        console.error('Error canceling challenge:', error)
        throw new Error(error.message || 'Failed to cancel challenge')
      }

      // Refresh bets to update the UI
      const bettingStore = useBettingStore.getState()
      if (bettingStore.refreshBets) {
        await bettingStore.refreshBets()
      }

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
    const { user } = useAuthStore.getState()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    try {
      const { data: success, error } = await supabase
        .rpc('leave_bet', {
          p_bet_id: challengeId,
          p_user_id: user.id
        })

      if (error) {
        console.error('Error leaving challenge:', error)
        throw new Error(error.message || 'Failed to leave challenge')
      }

      // Refresh bets to update the UI
      const bettingStore = useBettingStore.getState()
      if (bettingStore.refreshBets) {
        await bettingStore.refreshBets()
      }

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
            home_team:sports_teams!matches_home_team_id_fkey(*),
            away_team:sports_teams!matches_away_team_id_fkey(*),
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

      return data
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
            home_team:sports_teams!matches_home_team_id_fkey(*),
            away_team:sports_teams!matches_away_team_id_fkey(*),
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

      return data || []
    } catch (error) {
      console.error('Error in getUserChallenges:', error)
      throw error
    }
  }

  /**
   * Get trending/public challenges
   */
  static async getTrendingChallenges(limit: number = 20): Promise<Challenge[]> {
    try {
      const { data, error } = await supabase
        .from('bets')
        .select(`
          *,
          match:matches(*,
            home_team:sports_teams!matches_home_team_id_fkey(*),
            away_team:sports_teams!matches_away_team_id_fkey(*),
            sport:sports(*)
          ),
          creator:users!bets_creator_id_fkey(id, username, avatar_url),
          bet_predictions(user_id, prediction, amount)
        `)
        .eq('status', 'pending')
        .is('opponent_id', null) // Public challenges
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching trending challenges:', error)
        throw new Error('Failed to fetch trending challenges')
      }

      return data || []
    } catch (error) {
      console.error('Error in getTrendingChallenges:', error)
      throw error
    }
  }
}