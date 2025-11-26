import { supabase } from '../supabase'

export interface DiscordLink {
  discord_id: string
  discord_username: string
  linked_at: string
}

export const discordService = {
  /**
   * Get current user's Discord link status
   */
  async getMyDiscordLink(): Promise<DiscordLink | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('user_discord_links')
      .select('discord_id, discord_username, linked_at')
      .eq('user_id', user.id)
      .single()

    if (error) {
      // If no rows found, return null (not linked)
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return data
  },

  /**
   * Link Discord account using verification code
   */
  async linkDiscordAccount(code: string): Promise<DiscordLink> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Verify code exists and hasn't expired
    const { data: linkCode, error: codeError } = await supabase
      .from('discord_link_codes')
      .select('*')
      .eq('code', code)
      .single()

    if (codeError || !linkCode) {
      throw new Error('This code is invalid or has expired. Generate a new code in Discord using /link start.')
    }

    // Check if code has expired
    if (new Date(linkCode.expires_at) < new Date()) {
      throw new Error('This code is invalid or has expired. Generate a new code in Discord using /link start.')
    }

    // Check if Discord account is already linked to another user
    const { data: existingLink } = await supabase
      .from('user_discord_links')
      .select('user_id')
      .eq('discord_id', linkCode.discord_id)
      .single()

    if (existingLink) {
      throw new Error('This Discord account is already linked to another user.')
    }

    // Check if current user already has a Discord link
    const { data: userLink } = await supabase
      .from('user_discord_links')
      .select('discord_id')
      .eq('user_id', user.id)
      .single()

    if (userLink) {
      throw new Error('You already have a Discord account linked. Please unlink it first.')
    }

    // Create the link
    const { data: newLink, error: linkError } = await supabase
      .from('user_discord_links')
      .insert({
        user_id: user.id,
        discord_id: linkCode.discord_id,
        discord_username: linkCode.discord_username,
      })
      .select('discord_id, discord_username, linked_at')
      .single()

    if (linkError) {
      throw linkError
    }

    // Delete the used code
    await supabase
      .from('discord_link_codes')
      .delete()
      .eq('code', code)

    return newLink
  },

  /**
   * Unlink Discord account for current user
   */
  async unlinkDiscordAccount(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { error } = await supabase
      .from('user_discord_links')
      .delete()
      .eq('user_id', user.id)

    if (error) throw error
  },
}

