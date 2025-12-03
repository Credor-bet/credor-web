import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import type { PredictionType } from '@/types/bets'

export interface BetSlipItem {
  matchId: string
  betId?: string // If joining existing bet
  prediction: PredictionType
  amount: number
  matchLabel: string // "Team A vs Team B"
  startTime?: string
}

interface BetSlipState {
  items: BetSlipItem[]
  isOpen: boolean

  // Actions
  addItem: (item: BetSlipItem) => void
  removeItem: (matchId: string) => void
  updateAmount: (matchId: string, amount: number) => void
  updatePrediction: (matchId: string, prediction: PredictionType) => void
  clearSlip: () => void
  toggleOpen: () => void
  setOpen: (open: boolean) => void
}

export const useBetSlipStore = create<BetSlipState>((set) => ({
  items: [],
  isOpen: false,

  addItem: (item) =>
    set((state) => {
      // Replace if same match already in slip
      const filtered = state.items.filter((i) => i.matchId !== item.matchId)
      return { items: [...filtered, item], isOpen: true }
    }),

  removeItem: (matchId) =>
    set((state) => ({
      items: state.items.filter((i) => i.matchId !== matchId),
    })),

  updateAmount: (matchId, amount) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.matchId === matchId ? { ...i, amount } : i
      ),
    })),

  updatePrediction: (matchId, prediction) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.matchId === matchId ? { ...i, prediction } : i
      ),
    })),

  clearSlip: () => set({ items: [] }),

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  setOpen: (isOpen) => set({ isOpen }),
}))

// Selectors
export const useBetSlipItems = () => useBetSlipStore((s) => s.items)
export const useBetSlipCount = () => useBetSlipStore((s) => s.items.length)
export const useBetSlipTotal = () =>
  useBetSlipStore((s) => s.items.reduce((sum, i) => sum + i.amount, 0))
export const useBetSlipIsOpen = () => useBetSlipStore((s) => s.isOpen)

// Use useShallow to prevent infinite loops when selecting multiple actions
export const useBetSlipActions = () =>
  useBetSlipStore(
    useShallow((s) => ({
      addItem: s.addItem,
      removeItem: s.removeItem,
      updateAmount: s.updateAmount,
      updatePrediction: s.updatePrediction,
      clearSlip: s.clearSlip,
      toggleOpen: s.toggleOpen,
      setOpen: s.setOpen,
    }))
  )

