'use client'

import { useEffect, useState } from 'react'
import { useAuthStore, useBettingStore } from '@/lib/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  TrendingUp, 
  Users, 
  Trophy,
  DollarSign,
  Calendar,
  Target
} from 'lucide-react'
import { formatCurrency, formatDate, getBetStatusColor, getMatchOutcomeText } from '@/lib/utils'

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const { user, wallet, refreshUser, refreshWallet } = useAuthStore()
  const { activeBets, refreshBets } = useBettingStore()

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          refreshUser(),
          refreshWallet(),
          refreshBets()
        ])
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
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
            <div className="text-2xl font-bold">{activeBets?.length || 0}</div>
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
            <p className="text-xs text-muted-foreground">
              This month
            </p>
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Quick Actions</span>
            </CardTitle>
            <CardDescription>
              Create new bets and manage your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Create New Bet
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <DollarSign className="mr-2 h-4 w-4" />
              Add Funds
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Find Friends
            </Button>
          </CardContent>
        </Card>

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
            ) : !activeBets || activeBets.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No active bets</p>
                <p className="text-sm">Create your first bet to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(activeBets || []).slice(0, 3).map((bet) => (
                  <div key={bet.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Bet #{bet.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(bet.created_at)}
                        </p>
                      </div>
                    </div>
                    <Badge className={getBetStatusColor(bet.status)}>
                      {bet.status}
                    </Badge>
                  </div>
                ))}
                {(activeBets || []).length > 3 && (
                  <Button variant="ghost" className="w-full text-sm">
                    View all {(activeBets || []).length} active bets
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your latest betting activity and notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Bet won!</p>
                <p className="text-xs text-muted-foreground">
                  You won $25.00 on Manchester United vs Liverpool
                </p>
              </div>
              <span className="text-xs text-muted-foreground">2h ago</span>
            </div>

            <div className="flex items-center space-x-4 p-3 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">New friend request</p>
                <p className="text-xs text-muted-foreground">
                  @johndoe wants to be your friend
                </p>
              </div>
              <span className="text-xs text-muted-foreground">5h ago</span>
            </div>

            <div className="flex items-center space-x-4 p-3 bg-yellow-50 rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Bet pending</p>
                <p className="text-xs text-muted-foreground">
                  Waiting for @alice to accept your bet
                </p>
              </div>
              <span className="text-xs text-muted-foreground">1d ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 