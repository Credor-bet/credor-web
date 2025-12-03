import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface CurrentUser {
  id: string
  username: string
  email: string
  avatar_url: string | null
  full_name?: string | null
  is_profile_complete?: boolean
  total_bets?: number
  total_wins?: number
  total_losses?: number
  total_draws?: number
  win_rate?: number
  total_wagered?: number
  status?: string
  sports_preferences_set?: boolean
}

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) return null

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (error) {
    console.error('Error fetching current user:', error)
    return null
  }

  return data as CurrentUser
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: fetchCurrentUser,
  })
}


