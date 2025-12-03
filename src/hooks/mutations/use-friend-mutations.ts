'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ============================================
// Accept Friend Request Mutation
// ============================================

async function acceptFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('accept_friend_request', {
    incoming_request_id: requestId,
  })
  if (error) throw new Error(error.message)
}

export function useAcceptFriendRequestMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['accept-friend-request'],
    mutationFn: acceptFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] })
      queryClient.invalidateQueries({ queryKey: ['friends'] })
    },
  })
}

// ============================================
// Send Friend Request Mutation
// ============================================

export interface SendFriendRequestVariables {
  friendId: string
}

async function sendFriendRequest(variables: SendFriendRequestVariables): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    throw new Error('User not authenticated')
  }

  const { error } = await supabase.from('friendships').insert({
    user_id: session.user.id,
    friend_id: variables.friendId,
    status: 'pending',
  })
  if (error) throw new Error(error.message)
}

export function useSendFriendRequestMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['send-friend-request'],
    mutationFn: sendFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] })
    },
  })
}

// ============================================
// Remove Friend Mutation
// ============================================

export interface RemoveFriendVariables {
  friendId: string
}

async function removeFriend(variables: RemoveFriendVariables): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    throw new Error('User not authenticated')
  }

  // Delete both directions of the friendship
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(
      `and(user_id.eq.${session.user.id},friend_id.eq.${variables.friendId}),and(user_id.eq.${variables.friendId},friend_id.eq.${session.user.id})`
    )

  if (error) throw new Error(error.message)
}

export function useRemoveFriendMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['remove-friend'],
    mutationFn: removeFriend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] })
    },
  })
}

