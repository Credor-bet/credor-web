import { supabase } from './supabase'
import type { BetPrediction, BetPredictionWithPrivacy } from '@/types/bets'

type PrivacyFlags = {
  show_public_bet_participation: boolean
  show_bet_predictions: boolean
  show_bet_amounts: boolean
}

const DEFAULT_PRIVACY_FLAGS: PrivacyFlags = {
  show_public_bet_participation: true,
  show_bet_predictions: true,
  show_bet_amounts: false,
}

type BetWithPredictions<T> = T & {
  bet_predictions?: BetPrediction[]
}

const buildPrivacyMap = (rows: Array<{ user_id: string } & PrivacyFlags>): Map<string, PrivacyFlags> => {
  const map = new Map<string, PrivacyFlags>()
  rows.forEach(row => {
    map.set(row.user_id, {
      show_public_bet_participation: row.show_public_bet_participation,
      show_bet_predictions: row.show_bet_predictions,
      show_bet_amounts: row.show_bet_amounts,
    })
  })
  return map
}

const applyPrivacyToPrediction = (
  prediction: BetPrediction,
  viewerId: string | null,
  privacy: PrivacyFlags
): BetPredictionWithPrivacy | null => {
  const isSelf = viewerId === prediction.user_id

  if (!isSelf && !privacy.show_public_bet_participation) {
    return null
  }

  const canShowPrediction = isSelf || privacy.show_bet_predictions
  const canShowAmount = isSelf || privacy.show_bet_amounts

  return {
    user_id: prediction.user_id,
    prediction: canShowPrediction ? prediction.prediction : null,
    amount: canShowAmount ? prediction.amount : null,
    isPredictionHidden: !canShowPrediction,
    isAmountHidden: !canShowAmount,
  }
}

export async function applyPrivacyRulesToBets<T extends { bet_predictions?: BetPrediction[] }>(
  bets: T[],
  viewerId: string | null
): Promise<Array<BetWithPredictions<T> & { bet_predictions?: BetPredictionWithPrivacy[] }>> {
  if (!bets || bets.length === 0) {
    return bets
  }

  const userIds = new Set<string>()
  bets.forEach(bet => {
    bet.bet_predictions?.forEach(prediction => {
      if (prediction?.user_id) {
        userIds.add(prediction.user_id)
      }
    })
  })

  if (userIds.size === 0) {
    return bets as Array<BetWithPredictions<T> & { bet_predictions?: BetPredictionWithPrivacy[] }>
  }

  let privacyMap = new Map<string, PrivacyFlags>()
  try {
    const { data, error } = await supabase
      .from('user_privacy_settings')
      .select('user_id, show_public_bet_participation, show_bet_predictions, show_bet_amounts')
      .in('user_id', Array.from(userIds))

    if (error) {
      console.error('Error fetching privacy settings:', error)
    } else if (data) {
      privacyMap = buildPrivacyMap(data)
    }
  } catch (error) {
    console.error('Unexpected error fetching privacy settings:', error)
  }

  return bets.map(bet => {
    if (!bet.bet_predictions || bet.bet_predictions.length === 0) {
      return bet as BetWithPredictions<T> & { bet_predictions?: BetPredictionWithPrivacy[] }
    }

    // Check if this is a private bet (has opponent_id set)
    // Private bets should show both participants' data regardless of privacy settings
    const isPrivateBet = (bet as any).opponent_id !== null && (bet as any).opponent_id !== undefined

    // For private bets, skip privacy filtering - show all data for both participants
    if (isPrivateBet) {
      const unfilteredPredictions: BetPredictionWithPrivacy[] = bet.bet_predictions.map(prediction => ({
        user_id: prediction.user_id,
        prediction: prediction.prediction,
        amount: prediction.amount,
        isPredictionHidden: false,
        isAmountHidden: false,
      }))
      
      return {
        ...bet,
        bet_predictions: unfilteredPredictions,
      }
    }

    // For public bets, apply privacy rules
    const filteredPredictions = bet.bet_predictions
      .map(prediction => {
        const privacy = privacyMap.get(prediction.user_id) || DEFAULT_PRIVACY_FLAGS
        return applyPrivacyToPrediction(prediction, viewerId, privacy)
      })
      .filter((prediction): prediction is BetPredictionWithPrivacy => prediction !== null)

    return {
      ...bet,
      bet_predictions: filteredPredictions,
    }
  })
}

