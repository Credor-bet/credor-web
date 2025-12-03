import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Friend {
  id: string
  username: string
  avatar_url: string | null
}

export interface FriendRequest {
  request_id: string
  sender_id: string
  username: string
  avatar_url: string | null
}

async function fetchFriends(): Promise<Friend[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) return []

  const { data, error } = await supabase.rpc('get_friends_with_stats', {
    uid: session.user.id,
  })

  if (error) {
    console.error('Error fetching friends:', error)
    return []
  }

  return (data ?? []) as Friend[]
}

async function fetchFriendRequests(): Promise<FriendRequest[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) return []

  const { data, error } = await supabase.rpc('get_friend_requests', {
    user_id: session.user.id,
  })

  if (error) {
    console.error('Error fetching friend requests:', error)
    return []
  }

  return (data ?? []) as FriendRequest[]
}

export function useFriends() {
  return useQuery({
    queryKey: ['friends'],
    queryFn: fetchFriends,
  })
}

export function useFriendRequests() {
  return useQuery({
    queryKey: ['friendRequests'],
    queryFn: fetchFriendRequests,
  })
}


