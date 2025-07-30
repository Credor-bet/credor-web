'use client'

import { useEffect, useState } from 'react'
import { useAuthStore, useBettingStore } from '@/lib/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  // Users, // Removed unused import
  Trophy,
  DollarSign,
  Target,
  // Clock, // Removed unused import
  Zap,
  Eye
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const { user, wallet, refreshUser, refreshWallet } = useAuthStore()
  
  // Defensive Zustand store access
  const bettingStore = useBettingStore();
  const activeBets = Array.isArray(bettingStore?.activeBets) ? bettingStore.activeBets : [];
  const refreshBets = bettingStore?.refreshBets;

  // Helper function to get bet indicator
  const getBetIndicator = (bet: { creator_id: string; opponent_id: string | null; status: string }) => {
    const isCreator = bet.creator_id === user?.id
    const isOpponent = bet.opponent_id === user?.id
    
    if (bet.status === 'accepted') {
      return { color: 'bg-green-500', text: 'Accepted' }
    } else if (bet.status === 'pending') {
      if (isCreator) {
        return { color: 'bg-yellow-500', text: 'Waiting for opponent' }
      } else if (isOpponent) {
        return { color: 'bg-blue-500', text: 'Waiting for you' }
      }
    }
    return { color: 'bg-gray-500', text: bet.status }
  }

  // Helper function to get bet role
  const getBetRole = (bet: { creator_id: string; opponent_id: string | null }) => {
    if (bet.creator_id === user?.id) return 'Creator'
    if (bet.opponent_id === user?.id) return 'Opponent'
    return 'Participant'
  }

  useEffect(() => {
    const loadData = async () => {
      console.log('Starting dashboard data load...')
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise(resolve => {
        setTimeout(() => {
          console.log('Dashboard load timeout - forcing completion')
          resolve(null)
        }, 10000) // 10 second timeout
      })

      try {
        const promises = [
          refreshUser().catch(err => {
            console.error('Error refreshing user:', err)
            return null
          }),
          refreshWallet().catch(err => {
            console.error('Error refreshing wallet:', err)
            return null
          })
        ]
        
        // Only add refreshBets if it exists
        if (refreshBets) {
          promises.push(
            refreshBets().catch(err => {
              console.error('Error refreshing bets:', err)
              return null
            })
          )
        }

        // Race between data loading and timeout
        await Promise.race([
          Promise.all(promises),
          timeoutPromise
        ])
        
        console.log('Dashboard data loaded successfully')
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        console.log('Setting loading to false')
        setIsLoading(false)
      }
    }

    loadData()
  }, [refreshUser, refreshWallet, refreshBets])

  if (isLoading) {
    return (
      <div className="md:ml-64 p-4 md:p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Debug logging
  console.log('Dashboard render - User:', user?.id, 'Wallet:', wallet?.balance, 'Active bets:', activeBets.length)

  return (
    <div className="md:ml-64 p-4 md:p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user?.avatar_url || ''} />
            <AvatarFallback className="text-lg">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user?.username}!</h1>
            <p className="text-blue-100">Ready to place some bets?</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(wallet?.balance || 0, wallet?.currency || 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              Available to bet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bets</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBets.length}</div>
            <p className="text-xs text-muted-foreground">
              Pending and accepted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user?.win_rate || 0}%
            </div>
            {/* <p className="text-xs text-muted-foreground">
              This month
            </p> */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bets</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.total_bets || 0}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Trending Bets - Coming Soon */}
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Trending Bets</span>
              <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
            </CardTitle>
            <CardDescription>
              Discover popular bets and trending matches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium mb-2">Trending Bets</p>
              <p className="text-sm">This feature is coming soon!</p>
              <p className="text-xs mt-2">You&apos;ll be able to see popular bets and trending matches here.</p>
            </div>
          </CardContent>
        </Card>

        {/* Active Bets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Active Bets</span>
            </CardTitle>
            <CardDescription>
              Your current betting activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Loading bets...</p>
              </div>
            ) : activeBets.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No active bets</p>
                <p className="text-sm">Create your first bet to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeBets.slice(0, 3).map((bet: { id: string; creator_id: string; opponent_id: string | null; status: string; created_at: string }) => {
                  const indicator = getBetIndicator(bet)
                  const role = getBetRole(bet)
                  
                  return (
                    <div key={bet.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 ${indicator.color} rounded-full`}></div>
                        <div>
                          <p className="text-sm font-medium">Bet #{typeof bet.id === "string" ? bet.id.slice(0, 8) : ''}</p>
                          <p className="text-xs text-muted-foreground">
                            {role} • {formatDate(bet.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {indicator.text}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            // TODO: Navigate to bet details
                            console.log('View bet details:', bet.id)
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
                {activeBets.length > 3 && (
                  <Button variant="ghost" className="w-full text-sm">
                    View all {activeBets.length} active bets
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 