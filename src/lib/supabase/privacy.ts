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

    const { error } = await supabase
      .from('user_privacy_settings')
      .update(settings)
      .eq('user_id', user.id)

    if (error) throw error
  },
}

