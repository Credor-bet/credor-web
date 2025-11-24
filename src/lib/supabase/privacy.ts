import { supabase } from '../supabase'
import type { UserPrivacySettings } from '@/types/privacy'

export const privacyService = {
  /**
   * Get current user's privacy settings
   */
  async getMyPrivacySettings(): Promise<UserPrivacySettings> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('user_privacy_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update privacy settings (partial update supported)
   */
  async updatePrivacySettings(
    settings: Partial<UserPrivacySettings>
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Only include fields that are allowed to be updated
    const updateableFields: Partial<Pick<UserPrivacySettings, 
      'profile_visibility' | 
      'stats_visibility' | 
      'bet_history_visibility' | 
      'show_public_bet_participation' | 
      'show_bet_predictions' | 
      'show_bet_amounts'
    >> = {}
    
    if (settings.profile_visibility !== undefined) updateableFields.profile_visibility = settings.profile_visibility
    if (settings.stats_visibility !== undefined) updateableFields.stats_visibility = settings.stats_visibility
    if (settings.bet_history_visibility !== undefined) updateableFields.bet_history_visibility = settings.bet_history_visibility
    if (settings.show_public_bet_participation !== undefined) updateableFields.show_public_bet_participation = settings.show_public_bet_participation
    if (settings.show_bet_predictions !== undefined) updateableFields.show_bet_predictions = settings.show_bet_predictions
    if (settings.show_bet_amounts !== undefined) updateableFields.show_bet_amounts = settings.show_bet_amounts

    const { error } = await supabase
      .from('user_privacy_settings')
      .update({
        ...updateableFields,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (error) throw error
  },
}

