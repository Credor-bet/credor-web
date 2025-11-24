import { create } from 'zustand'
import { supabase } from './supabase'
import { MatchUpdate } from './websocket-service'
import { applyPrivacyRulesToBets } from './privacy-utils'
import type { BetPredictionWithPrivacy } from '@/types/bets'

interface User {
  id: string
  username: string
  email: string
  full_name: string | null
  avatar_url: string | null
  phone_number: string | null
  date_of_birth: string | null
  country: string | null
  preferred_currency: string
  total_wagered: number
  total_bets: number
  total_wins: number
  total_losses: number
  total_draws: number
  win_rate: number
  status: string
  is_email_verified: boolean
  is_phone_verified: boolean
  last_login: string | null
  created_at: string
  updated_at: string
  is_profile_complete: boolean
  sports_preferences_set?: boolean
}

interface Wallet {
  balance: number
  locked_balance: number
  currency: string
}

interface Bet {
  id: string
  creator_id: string
  opponent_id: string | null
  match_id: string
  min_opponent_amount: number
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'settled'
  max_participants: number
  is_system_generated?: boolean
  isParticipant?: boolean
  created_at: string
  updated_at: string
  settled_at: string | null
  fixture_id: string // Add the fixture_id field
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
  // user_prediction will be computed in the component from bet_predictions
  bet_predictions?: BetPredictionWithPrivacy[]
}

interface AuthState {
  user: User | null
  wallet: Wallet | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface AuthActions {
  setUser: (user: User | null) => void
  setWallet: (wallet: Wallet | null) => void
  setLoading: (loading: boolean) => void
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  refreshWallet: () => Promise<void>
}

type AuthStore = AuthState & AuthActions

// Request deduplication
const pendingRequests = new Map<string, Promise<void>>()

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  wallet: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setWallet: (wallet) => set({ wallet }),
  setLoading: (isLoading) => set({ isLoading }),

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, wallet: null, isAuthenticated: false })
  },

  refreshUser: async () => {
    const requestKey = 'refreshUser'
    
    // Check if request is already pending
    if (pendingRequests.has(requestKey)) {
      return pendingRequests.get(requestKey)
    }

    const request = (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Try to find profile by ID first
          let { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()
          
          // If not found by ID, try by email (in case of auth sync issues)
          if (!profile && user.email) {
            const { data: profileByEmail } = await supabase
              .from('users')
              .select('*')
              .eq('email', user.email)
              .maybeSingle()
            
            if (profileByEmail) {
              profile = profileByEmail
            }
          }
          
          if (profile) {
            set({ user: profile, isAuthenticated: true })
          } else {
            set({ user: null, isAuthenticated: false })
          }
        } else {
          set({ user: null, isAuthenticated: false })
        }
      } catch (error) {
        console.error('Error refreshing user:', error)
        set({ user: null, isAuthenticated: false })
      } finally {
        pendingRequests.delete(requestKey)
      }
    })()

    pendingRequests.set(requestKey, request)
    return request
  },

  refreshWallet: async () => {
    try {
      const { user } = get()
      
      if (!user) {
        return
      }

      const requestKey = `refreshWallet_${user.id}`
      
      // Check if request is already pending for this user
      if (pendingRequests.has(requestKey)) {
        return pendingRequests.get(requestKey)
      }

      const request = (async () => {
        try {
          const { data: wallet, error } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', user.id)
            .single()

          if (error) {
            console.error('Error fetching wallet:', error)
            return
          }

          if (wallet) {
            set({ wallet })
          } else {
            set({ wallet: null })
          }
        } catch (error) {
          console.error('Error refreshing wallet:', error)
        } finally {
          pendingRequests.delete(requestKey)
        }
      })()

      pendingRequests.set(requestKey, request)
      return request
    } catch (error) {
      console.error('Error refreshing wallet:', error)
    }
  },
}))

// Betting store
interface BettingState {
  activeBets: Bet[]
  betHistory: Bet[]
  isLoadingBets: boolean
}

interface BettingActions {
  setActiveBets: (bets: Bet[]) => void
  setBetHistory: (bets: Bet[]) => void
  setLoadingBets: (loading: boolean) => void
  refreshBets: () => Promise<void>
  debugUserData: () => Promise<void>
}

type BettingStore = BettingState & BettingActions

export const useBettingStore = create<BettingStore>((set) => ({
  activeBets: [],
  betHistory: [],
  isLoadingBets: false,

  setActiveBets: (activeBets) => set({ activeBets }),
  setBetHistory: (betHistory) => set({ betHistory }),
  setLoadingBets: (isLoadingBets) => set({ isLoadingBets }),

  refreshBets: async () => {
    set({ isLoadingBets: true })
    
    try {
      // Wait for user to be loaded
      let attempts = 0
      const maxAttempts = 10
      
             while (attempts < maxAttempts) {
         const { user } = useAuthStore.getState()
         
         if (user) {
           break
         }
         
         // Wait 500ms before next attempt
         await new Promise(resolve => setTimeout(resolve, 500))
         attempts++
       }
       
       const { user } = useAuthStore.getState()
       
       if (!user) {
         set({ activeBets: [], betHistory: [] })
         return
       }

       const requestKey = `refreshBets_${user.id}`
       
       // Check if request is already pending for this user
       if (pendingRequests.has(requestKey)) {
         return pendingRequests.get(requestKey)
       }

       const request = (async () => {
         try {
          const { data: userBets, error } = await supabase
            .from('bets')
            .select('*')
            .or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`)
            .order('created_at', { ascending: false })
          
          if (error) {
            console.error('Error fetching bets:', error)
            set({ activeBets: [], betHistory: [] })
            return
          }

          const directBetIds = userBets?.map(bet => bet.id) ?? []

          // Fetch all bets where user has a prediction (includes public bets)
          const { data: participantRows, error: participantError } = await supabase
            .from('bet_predictions')
            .select('bet_id')
            .eq('user_id', user.id)

          if (participantError) {
            console.error('Error fetching participant bets:', participantError)
          }

          const participantBetIds = participantRows?.map(row => row.bet_id) ?? []
          const allBetIds = Array.from(new Set([...directBetIds, ...participantBetIds]))
          
          // Debug logging to help identify missing bets
          if (process.env.NODE_ENV === 'development') {
            console.log('📊 Bet refresh debug:', {
              directBetCount: directBetIds.length,
              participantBetCount: participantBetIds.length,
              totalBetIds: allBetIds.length,
              directBetIds: directBetIds.slice(0, 5), // First 5 for debugging
              participantBetIds: participantBetIds.slice(0, 5), // First 5 for debugging
            })
          }
          
          if (allBetIds.length === 0) {
            set({ activeBets: [], betHistory: [] })
            return
          }
           
          // Query bets - use a union approach to ensure RLS allows access
          // First get direct bets (creator/opponent)
          const { data: directDetailedBets, error: directDetailedError } = await supabase
             .from('bets')
             .select(`
               *,
               matches!bets_match_id_fkey(*, 
                 home_team:sports_teams!matches_home_team_id_fkey(*), 
                 away_team:sports_teams!matches_away_team_id_fkey(*),
                 sport:sports(*)
               ),
               bet_predictions(user_id, prediction, amount),
               creator:users!bets_creator_id_fkey(username, avatar_url),
               opponent:users!bets_opponent_id_fkey(username, avatar_url)
             `)
            .in('id', directBetIds)
             .order('created_at', { ascending: false })

          // Then get participant bets by querying through bet_predictions
          // This ensures RLS policies allow access to bets where user has a prediction
          let participantDetailedBets: any[] = []
          let participantDetailedError: any = null
          
          if (participantBetIds.length > 0) {
            // Filter out bet IDs we already got from direct query to avoid duplicates
            const participantOnlyBetIds = participantBetIds.filter(id => !directBetIds.includes(id))
            
            if (participantOnlyBetIds.length > 0) {
              // Try querying through bet_predictions with a simpler approach
              // First, get the bet_predictions rows to ensure RLS allows access
              const { data: predictionRows, error: predictionCheckError } = await supabase
                .from('bet_predictions')
                .select('bet_id')
                .eq('user_id', user.id)
                .in('bet_id', participantOnlyBetIds)
              
              if (predictionCheckError) {
                console.error('Error checking bet_predictions access:', predictionCheckError)
              }
              
              const accessibleBetIds = (predictionRows || []).map(row => row.bet_id)
              
              if (accessibleBetIds.length > 0) {
                // Now query bets directly for the accessible bet IDs
                // Since we verified the user has predictions, RLS should allow this
                const participantQuery = await supabase
                  .from('bets')
                  .select(`
                    *,
                    matches!bets_match_id_fkey(*, 
                      home_team:sports_teams!matches_home_team_id_fkey(*), 
                      away_team:sports_teams!matches_away_team_id_fkey(*),
                      sport:sports(*)
                    ),
                    bet_predictions(user_id, prediction, amount),
                    creator:users!bets_creator_id_fkey(username, avatar_url),
                    opponent:users!bets_opponent_id_fkey(username, avatar_url)
                  `)
                  .in('id', accessibleBetIds)
                  .order('created_at', { ascending: false })
                
                participantDetailedBets = participantQuery.data || []
                participantDetailedError = participantQuery.error
                
                if (process.env.NODE_ENV === 'development') {
                  console.log('📊 Participant bets query (direct):', {
                    requestedBetIds: participantOnlyBetIds.length,
                    accessibleBetIds: accessibleBetIds.length,
                    returnedBets: participantDetailedBets.length,
                    error: participantDetailedError,
                  })
                }
              } else {
                if (process.env.NODE_ENV === 'development') {
                  console.warn('⚠️ No accessible bet IDs found through bet_predictions check')
                }
              }
            }
          }

          // Combine results, avoiding duplicates
          const directBetsMap = new Map((directDetailedBets || []).map(bet => [bet.id, bet]))
          const participantBets = participantDetailedBets
            .map((row: any) => row.bets)
            .filter((bet: any) => bet && !directBetsMap.has(bet.id))
          
          let detailedBets = [
            ...(directDetailedBets || []),
            ...participantBets
          ]

          // Check if we're missing any bets
          const returnedBetIds = new Set(detailedBets.map(b => b.id))
          const missingBetIds = allBetIds.filter(id => !returnedBetIds.has(id))
          
          // If we have missing bets and participant query failed, try direct query as fallback
          if (missingBetIds.length > 0) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('⚠️ Missing bets detected, trying fallback query:', {
                missingBetIds,
                participantQueryError: participantDetailedError,
              })
            }
            
            // Fallback: Try direct query for missing bets
            const { data: fallbackBets, error: fallbackError } = await supabase
              .from('bets')
              .select(`
                *,
                matches!bets_match_id_fkey(*, 
                  home_team:sports_teams!matches_home_team_id_fkey(*), 
                  away_team:sports_teams!matches_away_team_id_fkey(*),
                  sport:sports(*)
                ),
                bet_predictions(user_id, prediction, amount),
                creator:users!bets_creator_id_fkey(username, avatar_url),
                opponent:users!bets_opponent_id_fkey(username, avatar_url)
              `)
              .in('id', missingBetIds)
              .order('created_at', { ascending: false })
            
            if (fallbackError) {
              if (process.env.NODE_ENV === 'development') {
                console.warn('⚠️ Fallback query failed (likely RLS blocking):', fallbackError)
              }
            } else if (fallbackBets && fallbackBets.length > 0) {
              detailedBets = [...detailedBets, ...fallbackBets]
              if (process.env.NODE_ENV === 'development') {
                console.log('✅ Fallback query retrieved', fallbackBets.length, 'additional bets')
              }
            }
          }

          // Only fail if direct query failed (participant query failure is handled by fallback)
          if (directDetailedError) {
            console.error('Error fetching direct bets:', directDetailedError)
            set({ activeBets: [], betHistory: [] })
            return
          }

           // Debug: Check if all requested bets were returned
           if (process.env.NODE_ENV === 'development') {
             const finalReturnedBetIds = new Set(detailedBets.map(b => b.id))
             const finalMissingBetIds = allBetIds.filter(id => !finalReturnedBetIds.has(id))
             if (finalMissingBetIds.length > 0) {
               console.warn('⚠️ Some bets were not returned (likely RLS restrictions):', {
                 requestedCount: allBetIds.length,
                 returnedCount: detailedBets.length,
                 missingBetIds: finalMissingBetIds,
                 directBetCount: directDetailedBets?.length || 0,
                 participantBetCount: participantBets.length,
               })
             } else {
               console.log('✅ All bets successfully retrieved:', {
                 requestedCount: allBetIds.length,
                 returnedCount: detailedBets.length,
               })
             }
           }

          const processedBets = await applyPrivacyRulesToBets(detailedBets || [], user.id)
          const participantIdSet = new Set(participantBetIds)

          const annotatedBets = processedBets.map(bet => {
            const isCreator = bet.creator_id === user.id
            const isOpponent = bet.opponent_id === user.id
            const hasPrediction = bet.bet_predictions?.some((prediction: BetPredictionWithPrivacy) => prediction.user_id === user.id)
            // Only count opponent as participant if they've accepted (status is not pending)
            // For private bets, opponent should only be considered a participant after accepting
            const isParticipant = isCreator || 
              hasPrediction || 
              participantIdSet.has(bet.id) ||
              (isOpponent && bet.status !== 'pending') // Only count as participant if accepted

            return {
              ...bet,
              isParticipant,
            }
          })

          const active = annotatedBets.filter(bet => {
            const isActiveStatus = ['pending', 'accepted'].includes(bet.status)
            // Also exclude bets where match has completed (they should be in history)
            const matchCompleted = bet.matches?.status === 'completed' || bet.matches?.status === 'finished'
            return isActiveStatus && !matchCompleted
          })
          
          const history = annotatedBets.filter(bet => {
            const isHistoryStatus = ['settled', 'cancelled', 'rejected'].includes(bet.status)
            // Also include bets where match has completed, even if bet status isn't settled yet
            // This ensures ended public bets show up in history
            const matchCompleted = bet.matches?.status === 'completed' || bet.matches?.status === 'finished'
            return isHistoryStatus || matchCompleted
          })
          
          // Debug logging to help identify missing settled bets
          if (process.env.NODE_ENV === 'development') {
            const publicBetsInHistory = history.filter(bet => bet.is_system_generated)
            const settledPublicBets = history.filter(bet => 
              bet.is_system_generated && bet.status === 'settled'
            )
            console.log('📊 History filtering debug:', {
              totalAnnotatedBets: annotatedBets.length,
              activeCount: active.length,
              historyCount: history.length,
              publicBetsInHistory: publicBetsInHistory.length,
              settledPublicBets: settledPublicBets.length,
              allBetStatuses: [...new Set(annotatedBets.map(b => b.status))],
              publicBetStatuses: [...new Set(annotatedBets.filter(b => b.is_system_generated).map(b => b.status))],
            })
          }
          
          set({ activeBets: active, betHistory: history })
        } catch (error) {
          console.error('Error refreshing bets:', error)
          set({ activeBets: [], betHistory: [] })
        } finally {
          set({ isLoadingBets: false })
          pendingRequests.delete(requestKey)
        }
      })()

      pendingRequests.set(requestKey, request)
      return request
    } catch (error) {
      console.error('Error refreshing bets:', error)
      set({ activeBets: [], betHistory: [] })
    } finally {
      set({ isLoadingBets: false })
    }
  },

  debugUserData: async () => {
    try {
      const { user } = useAuthStore.getState()
      if (!user) {
        console.log('No user found for debug')
        return
      }

      console.log('=== DEBUG USER DATA ===')
      console.log('User ID:', user.id)
      console.log('=== END DEBUG ===')
    } catch (error) {
      console.error('Error in debugUserData:', error)
    }
  },
}))

// Recent Activity store
interface Transaction {
  id: string
  type: string
  amount: number
  status: 'pending' | 'completed' | 'failed'
  created_at: string
  currency: string
  provider: string
  // Crypto-specific fields
  tx_hash?: string
  to_address?: string
  from_address?: string
  network?: string
  is_crypto?: boolean
}

interface RecentActivity {
  transactions: Transaction[]
  isLoadingActivity: boolean
}

interface RecentActivityActions {
  setTransactions: (transactions: Transaction[]) => void
  setLoadingActivity: (loading: boolean) => void
  refreshTransactions: () => Promise<void>
}

type RecentActivityStore = RecentActivity & RecentActivityActions

export const useRecentActivityStore = create<RecentActivityStore>((set) => ({
  transactions: [],
  isLoadingActivity: false,

  setTransactions: (transactions) => set({ transactions }),
  setLoadingActivity: (isLoadingActivity) => set({ isLoadingActivity }),

  refreshTransactions: async () => {
    const { user } = useAuthStore.getState()
    if (!user) return

    const requestKey = `refreshTransactions_${user.id}`
    
    // Check if request is already pending for this user
    if (pendingRequests.has(requestKey)) {
      return pendingRequests.get(requestKey)
    }

    const request = (async () => {
      set({ isLoadingActivity: true })
      try {
        const { data: transactions } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (transactions) {
          set({ transactions })
        }
      } catch (error) {
        console.error('Error refreshing transactions:', error)
        set({ transactions: [] })
      } finally {
        set({ isLoadingActivity: false })
        pendingRequests.delete(requestKey)
      }
    })()

    pendingRequests.set(requestKey, request)
    return request
  },
}))

// Friends store
interface Friend {
  id: string
  username: string
  avatar_url: string | null
}

interface FriendRequest {
  request_id: string
  sender_id: string
  username: string
  avatar_url: string | null
}

interface FriendsState {
  friends: Friend[]
  friendRequests: FriendRequest[]
  isLoadingFriends: boolean
}

interface FriendsActions {
  setFriends: (friends: Friend[]) => void
  setFriendRequests: (requests: FriendRequest[]) => void
  setLoadingFriends: (loading: boolean) => void
  refreshFriends: () => Promise<void>
  refreshFriendRequests: () => Promise<void>
}

type FriendsStore = FriendsState & FriendsActions

export const useFriendsStore = create<FriendsStore>((set) => ({
  friends: [],
  friendRequests: [],
  isLoadingFriends: false,

  setFriends: (friends) => set({ friends }),
  setFriendRequests: (friendRequests) => set({ friendRequests }),
  setLoadingFriends: (isLoadingFriends) => set({ isLoadingFriends }),

  refreshFriends: async () => {
    const { user } = useAuthStore.getState()
    if (!user) return

    const requestKey = `refreshFriends_${user.id}`
    
    // Check if request is already pending for this user
    if (pendingRequests.has(requestKey)) {
      return pendingRequests.get(requestKey)
    }

    const request = (async () => {
      set({ isLoadingFriends: true })
      try {
        const { data: friends } = await supabase
          .rpc('get_friends_with_stats', { uid: user.id })

        if (friends) {
          set({ friends })
        }
      } catch (error) {
        console.error('Error refreshing friends:', error)
      } finally {
        set({ isLoadingFriends: false })
        pendingRequests.delete(requestKey)
      }
    })()

    pendingRequests.set(requestKey, request)
    return request
  },

  refreshFriendRequests: async () => {
    const { user } = useAuthStore.getState()
    if (!user) return

    const requestKey = `refreshFriendRequests_${user.id}`
    
    // Check if request is already pending for this user
    if (pendingRequests.has(requestKey)) {
      return pendingRequests.get(requestKey)
    }

    const request = (async () => {
      try {
        const { data: requests } = await supabase
          .rpc('get_friend_requests', { user_id: user.id })

        if (requests) {
          set({ friendRequests: requests })
        }
      } catch (error) {
        console.error('Error refreshing friend requests:', error)
      } finally {
        pendingRequests.delete(requestKey)
      }
    })()

    pendingRequests.set(requestKey, request)
    return request
  },
}))

// Match tracking store for live updates
interface LiveMatch {
  fixture_id: string
  match_id?: string // Our internal match ID if we have it
  home_score: number
  away_score: number
  status: 'scheduled' | 'in_progress' | 'live' | 'completed' | 'cancelled'
  last_updated: string
  last_valid_scores?: { home: number, away: number } // Track last scores that weren't null
}

interface MatchState {
  liveMatches: Map<string, LiveMatch> // keyed by fixture_id
  connectedFixtures: Set<string>
  isConnected: boolean
}

interface MatchActions {
  updateMatch: (update: MatchUpdate) => void
  addConnectedFixture: (fixtureId: string) => void
  removeConnectedFixture: (fixtureId: string) => void
  setConnectionStatus: (connected: boolean) => void
  getLiveMatch: (fixtureId: string) => LiveMatch | null
  clearAllMatches: () => void
}

type MatchStore = MatchState & MatchActions

export const useMatchStore = create<MatchStore>((set, get) => ({
  liveMatches: new Map(),
  connectedFixtures: new Set(),
  isConnected: false,

  updateMatch: (update: MatchUpdate) => {
    const { liveMatches } = get()
    const newLiveMatches = new Map(liveMatches)
    
    const existingMatch = newLiveMatches.get(update.fixture_id)
    
    // Debug logging for match updates (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 updateMatch called for ${update.fixture_id}:`, {
        updateType: update.type,
        updateScores: `${update.home_score}-${update.away_score}`,
        existingScores: existingMatch ? `${existingMatch.home_score}-${existingMatch.away_score}` : 'none',
        existingStatus: existingMatch?.status || 'none'
      })
    }
    
    // Handle status updates - match_start should set status to live
    let newStatus = existingMatch?.status ?? 'scheduled'
    if (update.type === 'match_start') {
      newStatus = 'live' // Use 'live' to match challenge service expectations
    } else if (update.type === 'goal') {
      // Goal events should keep the match as live
      newStatus = 'live'
    } else if (update.status) {
      // Map server status to our internal status
      if (update.status === 'in_progress') {
        newStatus = 'live'
      } else {
        newStatus = update.status
      }
    } else if (update.type === 'match_end') {
      newStatus = 'completed'
    } else if (update.type === 'match_cancelled') {
      newStatus = 'cancelled'
    }
    
    // Track and preserve valid scores
    let finalHomeScore = update.home_score
    let finalAwayScore = update.away_score
    let lastValidScores = existingMatch?.last_valid_scores
    
    // If we receive valid scores (not null), update our tracking
    if (update.home_score !== null && update.away_score !== null && 
        update.home_score !== undefined && update.away_score !== undefined) {
      lastValidScores = { home: update.home_score, away: update.away_score }
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 Storing valid scores: ${update.home_score}-${update.away_score}`)
      }
    }
    
    // For match_end events, use last valid scores if server sends null values
    if (update.type === 'match_end' && (update.home_score === null || update.away_score === null)) {
      if (lastValidScores) {
        finalHomeScore = lastValidScores.home
        finalAwayScore = lastValidScores.away
        if (process.env.NODE_ENV === 'development') {
          console.log(`🏁 Match ended - using last valid scores: ${finalHomeScore}-${finalAwayScore}`)
        }
      } else {
        // Fallback to existing match scores
        finalHomeScore = existingMatch?.home_score ?? 0
        finalAwayScore = existingMatch?.away_score ?? 0
        if (process.env.NODE_ENV === 'development') {
          console.log(`🏁 Match ended - using existing scores: ${finalHomeScore}-${finalAwayScore}`)
        }
      }
    }
    
    const updatedMatch: LiveMatch = {
      fixture_id: update.fixture_id,
      match_id: existingMatch?.match_id, // Preserve our internal match ID
      home_score: finalHomeScore ?? existingMatch?.home_score ?? 0,
      away_score: finalAwayScore ?? existingMatch?.away_score ?? 0,
      status: newStatus,
      last_updated: update.timestamp,
      last_valid_scores: lastValidScores
    }
    
    newLiveMatches.set(update.fixture_id, updatedMatch)
    set({ liveMatches: newLiveMatches })
    
    console.log(`🔥 Live match update for fixture ${update.fixture_id}:`, {
      type: update.type,
      scores: `${updatedMatch.home_score}-${updatedMatch.away_score}`,
      status: updatedMatch.status,
      timestamp: updatedMatch.last_updated,
      team: update.team?.name || 'N/A'
    })
  },

  addConnectedFixture: (fixtureId: string) => {
    const { connectedFixtures } = get()
    const newConnectedFixtures = new Set(connectedFixtures)
    newConnectedFixtures.add(fixtureId)
    set({ connectedFixtures: newConnectedFixtures })
  },

  removeConnectedFixture: (fixtureId: string) => {
    const { connectedFixtures, liveMatches } = get()
    const newConnectedFixtures = new Set(connectedFixtures)
    const newLiveMatches = new Map(liveMatches)
    
    newConnectedFixtures.delete(fixtureId)
    newLiveMatches.delete(fixtureId)
    
    set({ 
      connectedFixtures: newConnectedFixtures,
      liveMatches: newLiveMatches 
    })
  },

  setConnectionStatus: (isConnected: boolean) => {
    set({ isConnected })
    
    // Clear all matches if disconnected
    if (!isConnected) {
      set({ liveMatches: new Map(), connectedFixtures: new Set() })
    }
  },

  getLiveMatch: (fixtureId: string) => {
    const { liveMatches } = get()
    return liveMatches.get(fixtureId) || null
  },

  clearAllMatches: () => {
    set({ 
      liveMatches: new Map(), 
      connectedFixtures: new Set(),
      isConnected: false 
    })
  },

  // Helper function to associate our internal match ID with a fixture ID
  setMatchId: (fixtureId: string, matchId: string) => {
    const { liveMatches } = get()
    const newLiveMatches = new Map(liveMatches)
    
    const existingMatch = newLiveMatches.get(fixtureId)
    if (existingMatch) {
      existingMatch.match_id = matchId
      newLiveMatches.set(fixtureId, existingMatch)
      set({ liveMatches: newLiveMatches })
    } else {
      // Create initial match entry
      const initialMatch: LiveMatch = {
        fixture_id: fixtureId,
        match_id: matchId,
        home_score: 0,
        away_score: 0,
        status: 'scheduled',
        last_updated: new Date().toISOString()
      }
      newLiveMatches.set(fixtureId, initialMatch)
      set({ liveMatches: newLiveMatches })
    }
  },
})) 