'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useFriends, useFriendRequests } from '@/hooks/queries/use-friends'

export function useFriendsStore() {
  const { data: friends = [], isLoading: isFriendsLoading } = useFriends()
  const {
    data: friendRequests = [],
    isLoading: isRequestsLoading,
  } = useFriendRequests()
  const queryClient = useQueryClient()

  const isLoadingFriends = isFriendsLoading || isRequestsLoading

  const refreshFriends = async () => {
    await queryClient.invalidateQueries({ queryKey: ['friends'] })
  }

  const refreshFriendRequests = async () => {
    await queryClient.invalidateQueries({ queryKey: ['friendRequests'] })
  }

  const setFriends = () => {
    // no-op: React Query owns data
  }

  const setFriendRequests = () => {
    // no-op
  }

  const setLoadingFriends = () => {
    // no-op
  }

  return {
    friends,
    friendRequests,
    isLoadingFriends,
    refreshFriends,
    refreshFriendRequests,
    setFriends,
    setFriendRequests,
    setLoadingFriends,
  }
}


