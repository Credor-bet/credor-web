import { supabase } from '../supabase'
import type { Sport, SportPreference } from '@/types/sports'

export const sportsService = {
  /**
   * Get all active sports from the database
   */
  async getActiveSports(): Promise<Sport[]> {
    const { data, error } = await supabase
      .from('sports')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    return data || []
  },

  /**
   * Get user's sport preferences (returns all sports with is_interested flag)
   */
  async getMySportPreferences(): Promise<SportPreference[]> {
    const { data, error } = await supabase.rpc('get_my_sport_preferences')

    if (error) throw error
    return data || []
  },

  /**
   * Update a single sport preference
   */
  async updateSportPreference(
    sportId: string,
    isInterested: boolean,
    priority: number = 0
  ): Promise<void> {
    const { error } = await supabase.rpc('update_my_sport_preferences', {
      p_sport_id: sportId,
      p_is_interested: isInterested,
      p_priority: priority,
    })

    if (error) throw error
  },

  /**
   * Bulk update sport preferences (for onboarding)
   */
  async bulkUpdateSportPreferences(
    preferences: Array<{ sportId: string; isInterested: boolean; priority?: number }>
  ): Promise<void> {
    const promises = preferences.map(pref =>
      this.updateSportPreference(pref.sportId, pref.isInterested, pref.priority || 0)
    )

    await Promise.all(promises)
  },

  /**
   * Check if user has explicitly set sport preferences
   * Checks the sports_preferences_set flag in the users table
   */
  async hasExplicitPreferences(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    
    const { data: userProfile } = await supabase
      .from('users')
      .select('sports_preferences_set')
      .eq('id', user.id)
      .single()
    
    return userProfile?.sports_preferences_set ?? false
  },

  /**
   * Skip sport preferences selection
   * Marks the user as having set preferences (even though they skipped)
   */
  async skipSportPreferences(): Promise<void> {
    const { error } = await supabase.rpc('skip_sport_preferences')
    if (error) throw error
  },
}

