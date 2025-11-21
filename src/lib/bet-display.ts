import type { BetPredictionWithPrivacy } from '@/types/bets'
import { formatCurrency } from './utils'

export const PUBLIC_EVENT_LABEL = 'Public Event'

interface MatchLike {
  home_team?: { name?: string | null }
  away_team?: { name?: string | null }
}

interface CreatorLike {
  username?: string | null
  avatar_url?: string | null
}

export interface BetEntityWithOrigin {
  is_system_generated?: boolean | null
  creator?: CreatorLike | null
}

export function isPublicEvent(entity?: BetEntityWithOrigin | null): boolean {
  return Boolean(entity?.is_system_generated)
}

export function getBetOriginLabel(
  entity?: BetEntityWithOrigin | null,
  fallback: string = 'Unknown user'
): string {
  if (isPublicEvent(entity)) {
    return PUBLIC_EVENT_LABEL
  }

  return entity?.creator?.username || fallback
}

export function getPredictionDisplay(
  prediction?: BetPredictionWithPrivacy | null,
  match?: MatchLike | null,
  fallback: string = 'Not set'
): string {
  if (!prediction) return fallback
  if (prediction.isPredictionHidden) return 'Hidden'

  const value = prediction.prediction
  if (!value) return fallback

  switch (value) {
    case 'home_win':
      return match?.home_team?.name || 'Home Win'
    case 'away_win':
      return match?.away_team?.name || 'Away Win'
    case 'draw':
      return 'Draw'
    default:
      return value
  }
}

export function getAmountDisplay(
  prediction?: BetPredictionWithPrivacy | null,
  currency: string = 'CREDORR',
  fallback: string = '—'
): string {
  if (!prediction) return fallback
  if (prediction.isAmountHidden) return 'Hidden'

  const amount = prediction.amount
  if (amount == null) return fallback

  return formatCurrency(amount, currency)
}

