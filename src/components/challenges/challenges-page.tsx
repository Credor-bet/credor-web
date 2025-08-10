'use client'

import { useState, useEffect } from 'react'
import { useAuthStore, useBettingStore, useMatchStore } from '@/lib/store'
import { ChallengeService, type Challenge } from '@/lib/challenge-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Trophy,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Clock,
  Users,
  Target,
  Wifi,
  WifiOff
} from 'lucide-react'
import { CreateChallengeDialog } from './create-challenge-dialog'
import { ChallengeCard } from './challenge-card'
import { toast } from 'sonner'
import { useWebSocket } from '@/hooks/use-websocket'
import { shouldAutoConnect } from '@/lib/websocket-config'
import { WebSocketTest } from '@/components/debug/websocket-test'
import { ConnectionTest } from '@/components/debug/connection-test'
import { LiveScoreTest } from '@/components/debug/live-score-test'
import { ServerDiagnostic } from '@/components/debug/server-diagnostic'
import { ServerStatusCard } from '@/components/debug/server-status-card'
import { MatchDebug } from '@/components/debug/match-debug'

export function ChallengesPage() {
  const [activeTab, setActiveTab] = useState('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [trendingChallenges, setTrendingChallenges] = useState<Challenge[]>([])
  
  const { user } = useAuthStore()
  const { activeBets, betHistory, refreshBets } = useBettingStore()
  const { getLiveMatch } = useMatchStore()
  
  // Helper function to get current match status (live data takes priority)
  const getCurrentMatchStatus = (challenge: Challenge): string => {
    if (!challenge.match) return 'unknown'
    const fixtureId = (challenge.match as any)?.fixture_id
    const liveMatch = fixtureId ? getLiveMatch(fixtureId) : null
    const finalStatus = liveMatch?.status ?? challenge.match.status
    
    // Debug logging for status resolution (development only)
    if (process.env.NODE_ENV === 'development' && liveMatch && liveMatch.status !== challenge.match.status) {
      console.log(`📊 Status override for ${fixtureId}: DB="${challenge.match.status}" → Live="${liveMatch.status}"`)
    }
    
    return finalStatus
  }
  
  // Initialize WebSocket connection for live match updates
  const { isConnected, subscribeToMatch, connect } = useWebSocket({
    autoConnect: shouldAutoConnect(), // Use configuration to determine auto-connect
    enableNotifications: true, // Enable notifications to see live events
    enableErrorToasts: true // Enable error toasts since we're using production server
  })

  // Convert active bets to challenges format (only current/actionable challenges)
  const currentChallenges = activeBets.map(bet => ({
    ...bet,
    creator: bet.creator,
    opponent: bet.opponent,
    match: bet.matches,
    bet_predictions: bet.bet_predictions
  })) as Challenge[]

  const pendingChallenges = currentChallenges.filter(c => {
    const currentStatus = getCurrentMatchStatus(c)
    return c.status === 'pending' && 
           currentStatus === 'scheduled' && // Only show if match hasn't started yet
           (
             c.creator_id === user?.id || // Show bets created by the user
             c.opponent_id === user?.id   // Show bets directed at the user
           )
  })
  
  const activeChallenges = currentChallenges.filter(c => {
    const currentStatus = getCurrentMatchStatus(c)
    const isActive = c.status === 'accepted' && 
                    currentStatus !== 'cancelled' &&
                    currentStatus !== 'completed' &&
                    currentStatus !== 'finished' // Also exclude any 'finished' status
    
    // Debug logging for filtering (development only)
    if (process.env.NODE_ENV === 'development' && c.status === 'accepted' && !isActive) {
      console.log(`🚫 Filtered out challenge ${c.id}: status="${currentStatus}" (DB: ${c.match?.status})`)
    }
    
    return isActive
  })

  useEffect(() => {
    loadTrendingChallenges()
    refreshBets()
  }, [refreshBets])

  // Subscribe to live match updates for all active challenges
  useEffect(() => {
    if (!isConnected) return

    const challengesToSubscribe = [...currentChallenges, ...trendingChallenges]
      .filter(challenge => {
        const currentStatus = getCurrentMatchStatus(challenge)
        return (challenge.match as any)?.fixture_id && 
               challenge.status === 'accepted' &&
               challenge.match &&
               ['scheduled', 'live', 'in_progress'].includes(currentStatus)
      })

    const subscribeToMatches = async () => {
      console.log(`🎯 Found ${challengesToSubscribe.length} challenges with matches to subscribe to`)
      
      for (const challenge of challengesToSubscribe) {
        const fixtureId = (challenge.match as any)?.fixture_id
        if (fixtureId && challenge.match) {
          try {
            console.log(`🔔 Subscribing to fixture: ${fixtureId}`)
            console.log(`   📊 Match: ${challenge.match.home_team?.name} vs ${challenge.match.away_team?.name}`)
            console.log(`   📅 Start: ${new Date(challenge.match.start_time).toLocaleString()}`)
            console.log(`   🎲 Challenge: ${challenge.id}`)
            
            await subscribeToMatch(fixtureId)
          } catch (error) {
            console.error(`❌ Failed to subscribe to match ${fixtureId}:`, error)
          }
        }
      }
      
      if (challengesToSubscribe.length === 0) {
        console.log('⚠️ No active challenges with live matches found for subscription')
      }
    }

    subscribeToMatches()
  }, [isConnected, currentChallenges.length, trendingChallenges.length, subscribeToMatch])

  const loadTrendingChallenges = async () => {
    try {
      setIsLoading(true)
      const trending = await ChallengeService.getTrendingChallenges(20)
      // Filter out challenges for cancelled or completed matches
      const activeTrending = trending.filter(challenge => {
        const currentStatus = getCurrentMatchStatus(challenge)
        return currentStatus !== 'cancelled' && 
               currentStatus !== 'completed' &&
               currentStatus === 'scheduled' // Only show pending challenges for scheduled matches
      })
      setTrendingChallenges(activeTrending)
    } catch (error) {
      console.error('Error loading trending challenges:', error)
      toast.error('Failed to load trending challenges')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredChallenges = (challenges: Challenge[]) => {
    if (!searchTerm) return challenges
    
    return challenges.filter(challenge => 
      challenge.match?.home_team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      challenge.match?.away_team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      challenge.match?.sport?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      challenge.creator?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      challenge.opponent?.username.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  return (
    <div className="md:ml-64 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Challenges</h1>
          <div className="flex items-center space-x-3">
            <p className="text-muted-foreground">Manage active challenges and discover new opportunities</p>
            
            {/* Connection Status Indicator */}
            <div className="flex items-center space-x-1">
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-green-600">Live Updates</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-500">Offline</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <CreateChallengeDialog>
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            New Challenge
          </Button>
        </CreateChallengeDialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Challenges</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeChallenges.length}</div>
            <p className="text-xs text-muted-foreground">
              Currently in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingChallenges.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Challenges</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentChallenges.length}</div>
            <p className="text-xs text-muted-foreground">
              Total current challenges
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trending</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trendingChallenges.length}</div>
            <p className="text-xs text-muted-foreground">
              Public challenges
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Updates</CardTitle>
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? 'ON' : 'OFF'}
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {isConnected ? 'Real-time match scores' : 'No live connection'}
            </p>
            {!isConnected && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={connect}
                className="w-full"
              >
                <Wifi className="h-3 w-3 mr-1" />
                Connect
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

             {/* Debug Components - Development Only */}
       {process.env.NODE_ENV === 'development' && (
         <div className="space-y-6">
           <ServerStatusCard />
           <ServerDiagnostic />
           <ConnectionTest />
           <LiveScoreTest />
           <MatchDebug />
           <WebSocketTest />
         </div>
       )}

       {/* Search and Filter */}
       <div className="flex items-center space-x-4">
         <div className="relative flex-1 max-w-md">
           <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
           <Input
             placeholder="Search challenges..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="pl-10"
           />
         </div>
         
         <Button variant="outline" size="sm">
           <Filter className="h-4 w-4 mr-2" />
           Filter
         </Button>
       </div>

      {/* Challenges Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Pending
            {pendingChallenges.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingChallenges.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">
            Active
            {activeChallenges.length > 0 && (
              <Badge variant="default" className="ml-2">
                {activeChallenges.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="trending">
            Trending
            <TrendingUp className="h-3 w-3 ml-1" />
          </TabsTrigger>
        </TabsList>



        <TabsContent value="pending" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Pending Challenges</h3>
            <Badge variant="outline" className="text-yellow-600">
              {pendingChallenges.length} waiting
            </Badge>
          </div>
          
          {filteredChallenges(pendingChallenges).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No pending challenges</h3>
                <p className="text-muted-foreground text-center">
                  All caught up! No challenges waiting for your response.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredChallenges(pendingChallenges).map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Active Challenges</h3>
            <Badge variant="outline" className="text-blue-600">
              {activeChallenges.length} active
            </Badge>
          </div>
          
          {filteredChallenges(activeChallenges).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No active challenges</h3>
                <p className="text-muted-foreground text-center">
                  No challenges currently in progress. Create or accept one to get started!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredChallenges(activeChallenges).map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trending" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Trending Public Challenges</h3>
            <Button variant="outline" size="sm" onClick={loadTrendingChallenges}>
              Refresh
            </Button>
          </div>
          
          {isLoading ? (
            <div className="grid gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-8 bg-gray-200 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredChallenges(trendingChallenges).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No trending challenges</h3>
                <p className="text-muted-foreground text-center">
                  No public challenges available right now. Check back later!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredChallenges(trendingChallenges).map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}