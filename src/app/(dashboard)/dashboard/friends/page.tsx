'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { 
  Users, 
  UserPlus, 
  MessageCircle, 
  Trash2, 
  Check, 
  X,
  Search,
  UserX,
  Plus,
  UserMinus,
  Shield,
  Trophy
} from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { CreateChallengeDialog } from '@/components/challenges/create-challenge-dialog'

interface FriendRequest {
  request_id: string
  sender_id: string
  username: string
  avatar_url: string
}

interface Friend {
  id: string
  username: string
  avatar_url: string
}

interface BlockedUser {
  id: string
  user_id: string
  username: string
  avatar_url: string
}

interface SearchUser {
  id: string
  username: string
  email: string
  avatar_url: string
  friendship_status?: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'blocked'
}

export default function FriendsPage() {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set())
  const [removingFriends, setRemovingFriends] = useState<Set<string>>(new Set())
  const [unblockingUsers, setUnblockingUsers] = useState<Set<string>>(new Set())
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [sendingRequests, setSendingRequests] = useState<Set<string>>(new Set())
  
  const { user } = useAuthStore()

  useEffect(() => {
    if (user?.id) {
      loadFriendsData()
    }
  }, [user?.id])

  // Search users with debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    const debounceTimer = setTimeout(() => {
      searchUsers(searchQuery)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery, user?.id])

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setShowSearchResults(false)
  }

  const loadFriendsData = async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      
      // Load friends using RPC, friend requests and blocked users using direct queries
      const [friendsResult, requestsQuery, blockedQuery] = await Promise.all([
        supabase.rpc('get_friends_with_stats', { uid: user.id }),
        supabase
          .from('friendships')
          .select(`
            id,
            user_id,
            users!friendships_user_id_fkey (
              id,
              username,
              avatar_url
            )
          `)
          .eq('friend_id', user.id)
          .eq('status', 'pending'),
        supabase
          .from('friendships')
          .select(`
            id,
            user_id,
            friend_id,
            status,
            sender:users!friendships_user_id_fkey (
              id,
              username,
              avatar_url
            ),
            receiver:users!friendships_friend_id_fkey (
              id,
              username,
              avatar_url
            )
          `)
          .or(`and(user_id.eq.${user.id},status.eq.blocked),and(friend_id.eq.${user.id},status.eq.blocked)`)
      ])



      // Handle friend requests from direct query
      if (requestsQuery.error) {
        console.error('Error fetching friend requests:', requestsQuery.error)
        toast.error('Failed to load friend requests')
      } else {
        const formattedRequests = (requestsQuery.data || []).map((request: any) => ({
          request_id: request.id,
          sender_id: request.user_id,
          username: request.users?.username || 'Unknown User',
          avatar_url: request.users?.avatar_url || null
        }))

        setFriendRequests(formattedRequests)
      }

      // Handle blocked users from direct query
      if (blockedQuery.error) {
        console.error('Error fetching blocked users:', blockedQuery.error)
        toast.error('Failed to load blocked users')
      } else {
        const formattedBlocked = (blockedQuery.data || []).map((blocked: any) => {
          // Determine which user is the "other" user (not the current user)
          const isCurrentUserSender = blocked.user_id === user.id
          const otherUser = isCurrentUserSender ? blocked.receiver : blocked.sender
          
          return {
            id: blocked.id,
            user_id: isCurrentUserSender ? blocked.friend_id : blocked.user_id,
            username: otherUser?.username || 'Unknown User',
            avatar_url: otherUser?.avatar_url || null
          }
        })

        setBlockedUsers(formattedBlocked)
      }

      // Handle friends from RPC query
      if (friendsResult.error) {
        console.error('Error fetching friends:', friendsResult.error)
        toast.error('Failed to load friends')
      } else {

        setFriends(friendsResult.data || [])
      }
    } catch (error) {
      console.error('Error loading friends data:', error)
      toast.error('Failed to load friends data')
    } finally {
      setIsLoading(false)
    }
  }

  const searchUsers = async (query: string) => {
    if (!user?.id || query.trim().length < 2) return
    
    setIsSearching(true)
    
    try {
      // Search for users by username or email
      const { data: users, error } = await supabase
        .from('users')
        .select('id, username, email, avatar_url')
        .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
        .neq('id', user.id) // Exclude current user
        .limit(10)

      if (error) {
        console.error('Error searching users:', error)
        toast.error('Failed to search users')
        return
      }

      // Get friendship status for each user and filter out existing friends
      const usersWithStatus = await Promise.all(
        (users || []).map(async (searchUser) => {
          try {
            // Check existing friendship status - use array query to handle multiple rows
            const { data: friendships, error: friendshipError } = await supabase
              .from('friendships')
              .select('status, user_id, friend_id')
              .or(`and(user_id.eq.${user.id},friend_id.eq.${searchUser.id}),and(user_id.eq.${searchUser.id},friend_id.eq.${user.id})`)

            if (friendshipError) {
              console.error('Error checking friendship status:', friendshipError)
            }

            let friendship_status: SearchUser['friendship_status'] = 'none'
            
            if (friendships && friendships.length > 0) {
              // Take the first/most recent friendship record
              const friendship = friendships[0]
              
              if (friendship.status === 'accepted') {
                friendship_status = 'friends'
              } else if (friendship.status === 'pending') {
                // Check if current user sent or received the request
                friendship_status = friendship.user_id === user.id ? 'pending_sent' : 'pending_received'
              } else if (friendship.status === 'blocked') {
                friendship_status = 'blocked'
              }
            }

            return {
              ...searchUser,
              friendship_status
            }
          } catch (error) {
            console.error('Error processing user friendship status:', error)
            return {
              ...searchUser,
              friendship_status: 'none' as const
            }
          }
        })
      )

      setSearchResults(usersWithStatus)
      setShowSearchResults(true)
    } catch (error) {
      console.error('Error searching users:', error)
      toast.error('Failed to search users')
    } finally {
      setIsSearching(false)
    }
  }

  const sendFriendRequest = async (targetUserId: string, username: string) => {
    setSendingRequests(prev => new Set(prev).add(targetUserId))
    
    try {
      // Insert new friendship with pending status
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: user?.id,
          friend_id: targetUserId,
          status: 'pending'
        })

      if (error) {
        console.error('Error sending friend request:', error)
        toast.error('Failed to send friend request')
        return
      }

      toast.success(`Friend request sent to ${username}!`)
      
      // Update the search results to reflect the new status
      setSearchResults(prev => prev.map(user => 
        user.id === targetUserId 
          ? { ...user, friendship_status: 'pending_sent' }
          : user
      ))
    } catch (error) {
      console.error('Error sending friend request:', error)
      toast.error('Failed to send friend request')
    } finally {
      setSendingRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(targetUserId)
        return newSet
      })
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    setProcessingRequests(prev => new Set(prev).add(requestId))
    
    try {
      const { error } = await supabase.rpc('accept_friend_request', {
        incoming_request_id: requestId
      })

      if (error) {
        console.error('Error accepting friend request:', error)
        toast.error('Failed to accept friend request')
        return
      }

      toast.success('Friend request accepted!')
      loadFriendsData() // Refresh both lists
    } catch (error) {
      console.error('Error accepting friend request:', error)
      toast.error('Failed to accept friend request')
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    setProcessingRequests(prev => new Set(prev).add(requestId))
    
    try {
      // Delete the friendship request entirely instead of marking as blocked
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId)

      if (error) {
        console.error('Error rejecting friend request:', error)
        toast.error('Failed to reject friend request')
        return
      }

      toast.success('Friend request rejected')
      loadFriendsData() // Refresh the list
    } catch (error) {
      console.error('Error rejecting friend request:', error)
      toast.error('Failed to reject friend request')
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  const handleUnblockUser = async (friendshipId: string, username: string) => {
    setUnblockingUsers(prev => new Set(prev).add(friendshipId))
    
    try {
      // Delete the blocked friendship record
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)

      if (error) {
        console.error('Error unblocking user:', error)
        toast.error('Failed to unblock user')
        return
      }

      toast.success(`${username} has been unblocked`)
      loadFriendsData() // Refresh the list
    } catch (error) {
      console.error('Error unblocking user:', error)
      toast.error('Failed to unblock user')
    } finally {
      setUnblockingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(friendshipId)
        return newSet
      })
    }
  }

  const handleRemoveFriend = async (friendId: string, username: string) => {
    if (!confirm(`Are you sure you want to remove ${username} from your friends?`)) {
      return
    }

    setRemovingFriends(prev => new Set(prev).add(friendId))
    
    try {
      // Remove the friendship by updating status or deleting the record
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${user?.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user?.id})`)

      if (error) {
        console.error('Error removing friend:', error)
        toast.error('Failed to remove friend')
        return
      }

      toast.success(`${username} removed from friends`)
      loadFriendsData() // Refresh the list
    } catch (error) {
      console.error('Error removing friend:', error)
      toast.error('Failed to remove friend')
    } finally {
      setRemovingFriends(prev => {
        const newSet = new Set(prev)
        newSet.delete(friendId)
        return newSet
      })
    }
  }

  if (isLoading) {
    return (
      <div className="md:ml-64 p-4 md:p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="md:ml-64 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Friends</h1>
          <p className="text-gray-600 mt-1">Manage your friends and challenge them to bets</p>
        </div>
        <div className="relative">
          <Input
            placeholder="Search for friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 pr-16"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {isSearching && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            )}
            {searchQuery && !isSearching && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="h-6 w-6 p-0 hover:bg-gray-100"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Search Results */}
        {showSearchResults && searchResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Search Results</span>
                <Badge variant="outline">
                  {searchResults.length} found
                </Badge>
              </CardTitle>
              <CardDescription>
                Found {searchResults.length} user{searchResults.length !== 1 ? 's' : ''} matching "{searchQuery}"
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {searchResults.map((searchUser) => (
                  <div key={searchUser.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={searchUser.avatar_url || ''} />
                        <AvatarFallback>
                          {searchUser.username?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{searchUser.username}</div>
                        <div className="text-sm text-gray-500">@{searchUser.username}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {searchUser.friendship_status === 'none' && (
                        <Button
                          size="sm"
                          onClick={() => sendFriendRequest(searchUser.id, searchUser.username)}
                          disabled={sendingRequests.has(searchUser.id)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {sendingRequests.has(searchUser.id) ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-1" />
                              Add Friend
                            </>
                          )}
                        </Button>
                      )}
                      {searchUser.friendship_status === 'pending_sent' && (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                          Request Sent
                        </Badge>
                      )}
                      {searchUser.friendship_status === 'pending_received' && (
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          Accept Request
                        </Badge>
                      )}
                      {searchUser.friendship_status === 'friends' && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Friends
                        </Badge>
                      )}
                      {searchUser.friendship_status === 'blocked' && (
                        <Badge variant="destructive">
                          Blocked
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty search state */}
        {showSearchResults && searchResults.length === 0 && searchQuery.trim().length >= 2 && !isSearching && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Search Results</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found matching "{searchQuery}"</p>
                <p className="text-sm">Try a different username or email</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Friend Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5" />
              <span>Friend Requests</span>
              {friendRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {friendRequests.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {friendRequests.length > 0 
                ? `You have ${friendRequests.length} pending friend request${friendRequests.length !== 1 ? 's' : ''}`
                : 'No new friend requests'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {friendRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending friend requests</p>
                <p className="text-sm">Friend requests will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {friendRequests.map((request) => (
                  <div key={request.request_id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={request.avatar_url || ''} />
                        <AvatarFallback>
                          {request.username?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{request.username}</div>
                        <div className="text-sm text-gray-500">wants to be your friend</div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptRequest(request.request_id)}
                        disabled={processingRequests.has(request.request_id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processingRequests.has(request.request_id) ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Accept
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectRequest(request.request_id)}
                        disabled={processingRequests.has(request.request_id)}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        {processingRequests.has(request.request_id) ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Friends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>My Friends</span>
                {friends.length > 0 && (
                  <Badge variant="outline">
                    {friends.length}
                  </Badge>
                )}
              </div>
              <Button variant="outline" size="sm" className="text-xs">
                View All
              </Button>
            </CardTitle>
            <CardDescription>
              {friends.length > 0 
                ? 'Challenge your friends to bets and compete together'
                : 'Add friends to challenge them and compete together'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {friends.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>You haven't added any friends yet</p>
                <p className="text-sm">Connect with others to challenge them and compete together</p>
                <Button className="mt-4" disabled>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Find Friends
                  <Badge variant="outline" className="ml-2 text-xs">Coming Soon</Badge>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={friend.avatar_url || ''} />
                        <AvatarFallback>
                          {friend.username?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{friend.username}</div>
                        <div className="text-sm text-gray-500">Active friend</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CreateChallengeDialog defaultOpponentId={friend.id}>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Trophy className="h-4 w-4 mr-1" />
                          Challenge
                        </Button>
                      </CreateChallengeDialog>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveFriend(friend.id, friend.username)}
                        disabled={removingFriends.has(friend.id)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        {removingFriends.has(friend.id) ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                        ) : (
                          <UserX className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Blocked Users */}
        {blockedUsers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Blocked Users</span>
                <Badge variant="outline" className="text-red-600 border-red-200">
                  {blockedUsers.length}
                </Badge>
              </CardTitle>
              <CardDescription>
                Users you have blocked. You can unblock them to allow friend requests again.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {blockedUsers.map((blockedUser) => (
                  <div key={blockedUser.id} className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50/30">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={blockedUser.avatar_url || ''} />
                        <AvatarFallback>
                          {blockedUser.username?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{blockedUser.username}</div>
                        <div className="text-sm text-red-600">Blocked user</div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUnblockUser(blockedUser.id, blockedUser.username)}
                      disabled={unblockingUsers.has(blockedUser.id)}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      {unblockingUsers.has(blockedUser.id) ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                      ) : (
                        <>
                          <UserMinus className="h-4 w-4 mr-1" />
                          Unblock
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}