export type PredictionType = 'home_win' | 'away_win' | 'draw'

export interface BetPrediction {
  user_id: string
  prediction: PredictionType
  amount: number
}

export interface BetPredictionWithPrivacy extends Omit<BetPrediction, 'prediction' | 'amount'> {
  prediction: PredictionType | null
  amount: number | null
  isPredictionHidden?: boolean
  isAmountHidden?: boolean
}

