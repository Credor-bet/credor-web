import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

export type BetSortBy = 'activity_score' | 'participant_count' | 'total_wagered' | 'start_time'
export type BetStatusFilter = 'all' | 'pending' | 'active' | 'settled'

interface BetFiltersState {
  // Filters
  selectedSportId: string | null
  selectedLeagueId: string | null
  sortBy: BetSortBy
  statusFilter: BetStatusFilter
  searchQuery: string

  // Actions
  setSelectedSport: (sportId: string | null) => void
  setSelectedLeague: (leagueId: string | null) => void
  setSortBy: (sort: BetSortBy) => void
  setStatusFilter: (status: BetStatusFilter) => void
  setSearchQuery: (query: string) => void
  resetFilters: () => void
}

const initialState = {
  selectedSportId: null,
  selectedLeagueId: null,
  sortBy: 'activity_score' as BetSortBy,
  statusFilter: 'all' as BetStatusFilter,
  searchQuery: '',
}

export const useBetFiltersStore = create<BetFiltersState>((set) => ({
  ...initialState,

  setSelectedSport: (sportId) =>
    set({ selectedSportId: sportId, selectedLeagueId: null }),

  setSelectedLeague: (leagueId) =>
    set({ selectedLeagueId: leagueId }),

  setSortBy: (sortBy) =>
    set({ sortBy }),

  setStatusFilter: (statusFilter) =>
    set({ statusFilter }),

  setSearchQuery: (searchQuery) =>
    set({ searchQuery }),

  resetFilters: () =>
    set(initialState),
}))

// Selector hooks for fine-grained subscriptions
export const useSelectedSportId = () =>
  useBetFiltersStore((s) => s.selectedSportId)

export const useSelectedLeagueId = () =>
  useBetFiltersStore((s) => s.selectedLeagueId)

export const useBetSortBy = () =>
  useBetFiltersStore((s) => s.sortBy)

export const useBetStatusFilter = () =>
  useBetFiltersStore((s) => s.statusFilter)

export const useBetSearchQuery = () =>
  useBetFiltersStore((s) => s.searchQuery)

// Use useShallow to prevent infinite loops when selecting multiple actions
export const useBetFiltersActions = () =>
  useBetFiltersStore(
    useShallow((s) => ({
      setSelectedSport: s.setSelectedSport,
      setSelectedLeague: s.setSelectedLeague,
      setSortBy: s.setSortBy,
      setStatusFilter: s.setStatusFilter,
      setSearchQuery: s.setSearchQuery,
      resetFilters: s.resetFilters,
    }))
  )

