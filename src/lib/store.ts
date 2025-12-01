import { create } from 'zustand'
import type { MatchUpdate } from './websocket-service'
export { useAuthStore } from '@/hooks/use-auth-store'
export { useBettingStore } from '@/hooks/use-betting-store'
export { useFriendsStore } from '@/hooks/use-friends-store'

// UI state store (modals, filters, form drafts)

export interface BetSlipDraft {
  matchId: string
  betId?: string
  prediction: 'home_win' | 'away_win' | 'draw'
  amount: number
  matchLabel: string
}

interface UIState {
  // Modal states
  isCreateChallengeOpen: boolean
  isDepositModalOpen: boolean
  isWithdrawModalOpen: boolean

  // Form drafts
  betSlipDraft: BetSlipDraft | null

  // Filters
  selectedSport: string | null
  selectedLeague: string | null

  // Actions
  openCreateChallenge: () => void
  closeCreateChallenge: () => void
  openDepositModal: () => void
  closeDepositModal: () => void
  openWithdrawModal: () => void
  closeWithdrawModal: () => void
  setBetSlipDraft: (draft: BetSlipDraft | null) => void
  setSelectedSport: (sport: string | null) => void
  setSelectedLeague: (league: string | null) => void
  resetFilters: () => void
}

export const useUIStore = create<UIState>((set) => ({
  isCreateChallengeOpen: false,
  isDepositModalOpen: false,
  isWithdrawModalOpen: false,
  betSlipDraft: null,
  selectedSport: null,
  selectedLeague: null,

  openCreateChallenge: () => set({ isCreateChallengeOpen: true }),
  closeCreateChallenge: () => set({ isCreateChallengeOpen: false }),

  openDepositModal: () => set({ isDepositModalOpen: true }),
  closeDepositModal: () => set({ isDepositModalOpen: false }),

  openWithdrawModal: () => set({ isWithdrawModalOpen: true }),
  closeWithdrawModal: () => set({ isWithdrawModalOpen: false }),

  setBetSlipDraft: (betSlipDraft) => set({ betSlipDraft }),

  setSelectedSport: (selectedSport) => set({ selectedSport, selectedLeague: null }),
  setSelectedLeague: (selectedLeague) => set({ selectedLeague }),

  resetFilters: () => set({ selectedSport: null, selectedLeague: null }),
}))

// Minimal auth session store (no user profile data)

interface AuthSessionState {
  isAuthenticated: boolean
  sessionId: string | null
}

interface AuthSessionActions {
  setSession: (session: { access_token?: string | null } | null) => void
  clearSession: () => void
}

type AuthSessionStore = AuthSessionState & AuthSessionActions

export const useAuthSessionStore = create<AuthSessionStore>((set) => ({
  isAuthenticated: false,
  sessionId: null,

  setSession: (session) =>
    set({
      isAuthenticated: !!session,
      sessionId: session?.access_token ?? null,
    }),

  clearSession: () => set({ isAuthenticated: false, sessionId: null }),
}))

// WebSocket / live match state (real-time only, not DB mirrors)

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
  setMatchId: (fixtureId: string, matchId: string) => void
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
