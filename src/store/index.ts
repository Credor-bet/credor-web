// Re-export all stores for convenience

// UI stores
export {
  useBetFiltersStore,
  useSelectedSportId,
  useSelectedLeagueId,
  useBetSortBy,
  useBetStatusFilter,
  useBetSearchQuery,
  useBetFiltersActions,
  type BetSortBy,
  type BetStatusFilter,
} from './bet-filters-store'

export {
  useBetSlipStore,
  useBetSlipItems,
  useBetSlipCount,
  useBetSlipTotal,
  useBetSlipIsOpen,
  useBetSlipActions,
  type BetSlipItem,
} from './bet-slip-store'

// Legacy stores from lib/store.ts (for backwards compatibility during migration)
export {
  useUIStore,
  useAuthSessionStore,
  useMatchStore,
  useAuthStore,
  useBettingStore,
  useFriendsStore,
} from '@/lib/store'

