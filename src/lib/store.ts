import { create } from 'zustand'
import { supabase } from './supabase'
import { MatchUpdate } from './websocket-service'

interface User {
  id: string
  username: string
  email: string
  full_name: string | null
  avatar_url: string | null
  country: string | null
  preferred_currency: string
  is_profile_complete: boolean
  total_wagered: number
  total_won: number
  total_lost: number
  total_bets: number
  total_wins: number
  total_losses: number
  win_rate: number
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
  bet_predictions?: Array<{
    user_id: string
    prediction: string
    amount: number
  }>
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

           if (!userBets || userBets.length === 0) {
             set({ activeBets: [], betHistory: [] })
             return
           }

           // Now let's get the detailed data for the bets we found
           const betIds = userBets.map(bet => bet.id)
           
           const { data: detailedBets, error: detailedError } = await supabase
             .from('bets')
             .select(`
               *,
               matches!bets_match_id_fkey(*, home_team:sports_teams!matches_home_team_id_fkey(*), away_team:sports_teams!matches_away_team_id_fkey(*)),
               bet_predictions(user_id, prediction, amount),
               creator:users!bets_creator_id_fkey(username, avatar_url),
               opponent:users!bets_opponent_id_fkey(username, avatar_url)
             `)
             .in('id', betIds)
             .order('created_at', { ascending: false })

           if (detailedError) {
             console.error('Error fetching detailed bets:', detailedError)
             set({ activeBets: [], betHistory: [] })
             return
           }

                                               if (detailedBets) {
                          // Don't pre-process user_prediction, let the component handle it
                          const processedBets = detailedBets

              const active = processedBets.filter(bet => 
                ['pending', 'accepted'].includes(bet.status)
              )
              const history = processedBets.filter(bet => 
                ['settled', 'cancelled', 'rejected'].includes(bet.status)
              )
              
              set({ activeBets: active, betHistory: history })
            }
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