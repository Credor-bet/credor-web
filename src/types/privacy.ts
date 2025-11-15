export type PrivacyLevel = 'all' | 'friends' | 'none'

export interface UserPrivacySettings {
  user_id: string
  profile_visibility: PrivacyLevel
  stats_visibility: PrivacyLevel
  bet_history_visibility: PrivacyLevel
  show_public_bet_participation: boolean
  show_bet_predictions: boolean
  show_bet_amounts: boolean
  created_at: string
  updated_at: string
}

