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

    const { error } = await supabase.rpc('update_user_privacy_settings', {
      p_profile_visibility: settings.profile_visibility ?? null,
      p_stats_visibility: settings.stats_visibility ?? null,
      p_bet_history_visibility: settings.bet_history_visibility ?? null,
      p_show_public_bet_participation: settings.show_public_bet_participation ?? null,
      p_show_bet_predictions: settings.show_bet_predictions ?? null,
      p_show_bet_amounts: settings.show_bet_amounts ?? null,
    })

    if (error) throw error
  },
}

