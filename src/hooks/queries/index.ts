// User queries
export { useCurrentUser, type CurrentUser } from './use-current-user'

// Wallet queries
export { useWallet, type Wallet } from './use-wallet'

// Bet queries
export { useBets, type BetWithDetails, type BetStatus } from './use-bets'
export { useTrendingBets, type TrendingBet, type TrendingBetsParams } from './use-trending-bets'
export { useBetDetailsQuery, type BetDetails } from './use-bet-details'

// Friend queries
export { useFriends, useFriendRequests, type Friend, type FriendRequest } from './use-friends'

// Match queries
export { 
  useMatches, 
  useUpcomingMatches, 
  type MatchWithTeams, 
  type MatchStatus, 
  type UpcomingMatchesParams 
} from './use-matches'

// Transaction queries
export { useTransactions, type Transaction } from './use-transactions'

// Sports queries
export {
  useSports,
  useLeagues,
  useSportPreferences,
  useTeamSearch,
  type League,
  type Team,
} from './use-sports'

