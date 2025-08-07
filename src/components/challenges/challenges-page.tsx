'use client'

import { useState, useEffect } from 'react'
import { useAuthStore, useBettingStore } from '@/lib/store'
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
  Target
} from 'lucide-react'
import { CreateChallengeDialog } from './create-challenge-dialog'
import { ChallengeCard } from './challenge-card'
import { toast } from 'sonner'

export function ChallengesPage() {
  const [activeTab, setActiveTab] = useState('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [trendingChallenges, setTrendingChallenges] = useState<Challenge[]>([])
  
  const { user } = useAuthStore()
  const { activeBets, betHistory, refreshBets } = useBettingStore()

  // Convert active bets to challenges format (only current/actionable challenges)
  const currentChallenges = activeBets.map(bet => ({
    ...bet,
    creator: bet.creator,
    opponent: bet.opponent,
    match: bet.matches,
    bet_predictions: bet.bet_predictions
  })) as Challenge[]

  const pendingChallenges = currentChallenges.filter(c => 
    c.status === 'pending' && (
      c.creator_id === user?.id || // Show bets created by the user
      c.opponent_id === user?.id   // Show bets directed at the user
    )
  )
  
  const activeChallenges = currentChallenges.filter(c => c.status === 'accepted')

  useEffect(() => {
    loadTrendingChallenges()
    refreshBets()
  }, [refreshBets])

  const loadTrendingChallenges = async () => {
    try {
      setIsLoading(true)
      const trending = await ChallengeService.getTrendingChallenges(20)
      setTrendingChallenges(trending)
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
          <p className="text-muted-foreground">Manage active challenges and discover new opportunities</p>
        </div>
        
        <CreateChallengeDialog>
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            New Challenge
          </Button>
        </CreateChallengeDialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      </div>

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