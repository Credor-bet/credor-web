'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, useBettingStore } from '@/lib/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  Target,
  Zap,
  Users,
  ExternalLink
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { ActiveBetsModal } from '@/components/challenges/active-bets-modal'
import { ChallengeService, type Challenge } from '@/lib/challenge-service'
import { TrendingBetModal } from '@/components/challenges/trending-bet-modal'
import { getBetOriginLabel, isPublicEvent, PUBLIC_EVENT_LABEL } from '@/lib/bet-display'
import Link from 'next/link'

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isActiveBetsModalOpen, setIsActiveBetsModalOpen] = useState(false)
  const [trendingBet, setTrendingBet] = useState<Challenge | null>(null)
  const [isLoadingTrending, setIsLoadingTrending] = useState(true)
  const [isTrendingBetModalOpen, setIsTrendingBetModalOpen] = useState(false)
  const [selectedTrendingBet, setSelectedTrendingBet] = useState<Challenge | null>(null)
  const router = useRouter()
  const { user, refreshUser } = useAuthStore()
  
  // Defensive Zustand store access
  const bettingStore = useBettingStore();
  const activeBets = Array.isArray(bettingStore?.activeBets) ? bettingStore.activeBets : [];
  const refreshBets = bettingStore?.refreshBets;
  
  // Refs to prevent duplicate calls
  const dataLoadRef = useRef(false)
  const userLoadRef = useRef<string | null>(null)

  // Memoized data loading function
  const loadDashboardData = useCallback(async () => {
    if (dataLoadRef.current) return
    dataLoadRef.current = true

    // Add timeout to prevent infinite loading
    const timeoutPromise = new Promise(resolve => {
      setTimeout(() => {
        resolve(null)
      }, 10000) // 10 second timeout
    })

    try {
      // First, ensure user is loaded
      await refreshUser().catch(err => {
        console.error('Error refreshing user:', err)
        return null
      })
      
      // Then load bets if user exists
      if (user?.id) {
        const promises = []
        
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
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [refreshUser, refreshBets, user?.id])

  // Main data loading effect
  useEffect(() => {
    // Only load data if user changes or on initial load
    if (user?.id !== userLoadRef.current) {
      userLoadRef.current = user?.id || null
      dataLoadRef.current = false
      loadDashboardData()
    }
  }, [user?.id, loadDashboardData])

  // Client-side profile completion check (UX improvement, not security)
  useEffect(() => {
    if (user && !user.is_profile_complete) {
      // Redirect to profile completion if profile is incomplete
      // This is a UX check, middleware allows access but we redirect for better UX
      router.push('/profile-completion')
    }
  }, [user, router])

  // Check if user has sport preferences
  useEffect(() => {
    const checkSportPreferences = async () => {
      if (!user?.id || !user.is_profile_complete) return

      try {
        const { sportsService } = await import('@/lib/supabase/sports')
        const hasExplicit = await sportsService.hasExplicitPreferences()
        
        // If user has no explicit preferences (no false values), they likely only have defaults
        // Redirect to sport selection to let them make explicit choices
        if (!hasExplicit) {
          router.push('/sport-selection')
        }
      } catch (error) {
        // On error, allow access (better UX than blocking)
        console.error('Error checking sport preferences:', error)
      }
    }

    checkSportPreferences()
  }, [user, router])

  // Load trending bets
  useEffect(() => {
    const loadTrendingBets = async () => {
      try {
        setIsLoadingTrending(true)
        // getTrendingChallenges already returns bets sorted by participant_count (most popular first)
        const bets = await ChallengeService.getTrendingChallenges(1)
        
        // Get the most popular bet (first result)
        if (bets.length > 0) {
          setTrendingBet(bets[0])
        }
      } catch (error) {
        console.error('Error loading trending bets:', error)
      } finally {
        setIsLoadingTrending(false)
      }
    }
    
    if (user?.id) {
      loadTrendingBets()
    }
  }, [user?.id])

  if (isLoading) {
    return (
      <div className="md:ml-64 p-4 md:p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const trendingIsPublicEvent = trendingBet ? isPublicEvent(trendingBet) : false
  const trendingOriginLabel = trendingBet ? getBetOriginLabel(trendingBet, PUBLIC_EVENT_LABEL) : ''
  const trendingIsParticipant = trendingBet
    ? (trendingBet.isParticipant ?? trendingBet.bet_predictions?.some(pred => pred.user_id === user?.id))
    : false

  return (
    <div className="md:ml-64 p-4 md:p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setIsActiveBetsModalOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bets</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBets.length}</div>
            <p className="text-xs text-muted-foreground">
              Pending and accepted • Click to view all
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trending Bets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Trending Bets</span>
            </div>
            <Link 
              href="/dashboard/challenges" 
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              onClick={(e) => e.stopPropagation()}
            >
              <span>View All</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </CardTitle>
          <CardDescription>
            Most popular bet right now
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTrending ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading trending bets...</p>
            </div>
          ) : !trendingBet ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium mb-2">No trending bets</p>
              <p className="text-sm">Check back later for popular bets!</p>
            </div>
          ) : (
            <div 
              className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedTrendingBet(trendingBet)
                setIsTrendingBetModalOpen(true)
              }}
            >
              {trendingBet.match?.home_team && trendingBet.match?.away_team ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="flex items-center space-x-2 flex-1">
                        {trendingBet.match.home_team.cloudinary_logo_url || trendingBet.match.home_team.logo_url ? (
                          <img 
                            src={trendingBet.match.home_team.cloudinary_logo_url || trendingBet.match.home_team.logo_url || ''} 
                            alt={trendingBet.match.home_team.name}
                            className="w-8 h-8 object-contain"
                          />
                        ) : null}
                        <span className="font-semibold text-sm">{trendingBet.match.home_team.name}</span>
                      </div>
                      <span className="text-muted-foreground">vs</span>
                      <div className="flex items-center space-x-2 flex-1">
                        {trendingBet.match.away_team.cloudinary_logo_url || trendingBet.match.away_team.logo_url ? (
                          <img 
                            src={trendingBet.match.away_team.cloudinary_logo_url || trendingBet.match.away_team.logo_url || ''} 
                            alt={trendingBet.match.away_team.name}
                            className="w-8 h-8 object-contain"
                          />
                        ) : null}
                        <span className="font-semibold text-sm">{trendingBet.match.away_team.name}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {trendingIsPublicEvent ? (
                          <>
                            <div className="h-6 w-6 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[10px] font-semibold flex items-center justify-center">
                              {PUBLIC_EVENT_LABEL.slice(0, 1)}
                            </div>
                            <span className="text-muted-foreground">{PUBLIC_EVENT_LABEL}</span>
                          </>
                        ) : (
                          <>
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={trendingBet.creator?.avatar_url || ''} />
                              <AvatarFallback className="text-xs">
                                {trendingBet.creator?.username?.charAt(0).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-muted-foreground">by {trendingOriginLabel}</span>
                          </>
                        )}
                        {trendingIsParticipant && (
                          <Badge variant="outline" className="text-[10px]">
                            Joined
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {trendingBet.participant_count || trendingBet.bet_predictions?.length || 0} {(trendingBet.participant_count || trendingBet.bet_predictions?.length || 0) === 1 ? 'participant' : 'participants'}
                        </span>
                      </div>
                    </div>
                    {trendingBet.match?.start_time && (
                      <span className="text-muted-foreground">
                        {formatDate(trendingBet.match.start_time)}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-medium">Bet #{trendingBet.id.slice(0, 8)}</p>
                  {trendingBet.creator && (
                    <p className="text-sm text-muted-foreground">
                      by {trendingBet.creator.username}
                    </p>
                  )}
                  <div className="flex items-center space-x-1 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {trendingBet.participant_count || trendingBet.bet_predictions?.length || 0} {(trendingBet.participant_count || trendingBet.bet_predictions?.length || 0) === 1 ? 'participant' : 'participants'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Bets Modal */}
      <ActiveBetsModal 
        isOpen={isActiveBetsModalOpen} 
        onClose={() => setIsActiveBetsModalOpen(false)} 
      />
      <TrendingBetModal
        bet={selectedTrendingBet}
        isOpen={isTrendingBetModalOpen}
        onClose={() => {
          setIsTrendingBetModalOpen(false)
          setSelectedTrendingBet(null)
        }}
      />
    </div>
  )
} 