import { create } from 'zustand'
import { supabase } from './supabase'
import type { Tables } from './supabase'

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
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          set({ user: profile, isAuthenticated: true })
        }
      } else {
        set({ user: null, isAuthenticated: false })
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
      set({ user: null, isAuthenticated: false })
    }
  },

  refreshWallet: async () => {
    try {
      const { user } = get()
      if (!user) return

      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (wallet) {
        set({ wallet })
      }
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
      const { data: userBets } = await supabase
        .from('view_user_bets')
        .select('*')
        .order('created_at', { ascending: false })

      if (userBets) {
        const active = userBets.filter(bet => 
          ['pending', 'accepted'].includes(bet.status)
        )
        const history = userBets.filter(bet => 
          ['settled', 'cancelled', 'rejected'].includes(bet.status)
        )
        
        set({ activeBets: active, betHistory: history })
      }
    } catch (error) {
      console.error('Error refreshing bets:', error)
      set({ activeBets: [], betHistory: [] })
    } finally {
      set({ isLoadingBets: false })
    }
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

export const useFriendsStore = create<FriendsStore>((set, get) => ({
  friends: [],
  friendRequests: [],
  isLoadingFriends: false,

  setFriends: (friends) => set({ friends }),
  setFriendRequests: (friendRequests) => set({ friendRequests }),
  setLoadingFriends: (isLoadingFriends) => set({ isLoadingFriends }),

  refreshFriends: async () => {
    const { user } = useAuthStore.getState()
    if (!user) return

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
    }
  },

  refreshFriendRequests: async () => {
    const { user } = useAuthStore.getState()
    if (!user) return

    try {
      const { data: requests } = await supabase
        .rpc('get_friend_requests', { user_id: user.id })

      if (requests) {
        set({ friendRequests: requests })
      }
    } catch (error) {
      console.error('Error refreshing friend requests:', error)
    }
  },
})) 