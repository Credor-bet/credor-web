'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/queries/use-current-user'
import { useTrendingBets, type TrendingBet } from '@/hooks/queries/use-trending-bets'
import { useSports, useLeagues } from '@/hooks/queries/use-sports'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Zap, Users } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function DashboardPage() {
  const [selectedSportId, setSelectedSportId] = useState<string | 'all'>('all')
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | 'all'>('all')
  const router = useRouter()

  const { data: user, isLoading: isUserLoading } = useCurrentUser()
  const { data: sports = [], isLoading: isSportsLoading } = useSports()
  const { data: leagues = [], isLoading: isLeaguesLoading } = useLeagues(
    selectedSportId === 'all' ? undefined : selectedSportId,
  )

  const sportFilter = selectedSportId === 'all' ? undefined : selectedSportId
  const leagueFilter = selectedLeagueId === 'all' ? undefined : selectedLeagueId

  const {
    data: trendingBetsRaw = [],
    isLoading: isTrendingLoading,
  } = useTrendingBets({
    sportId: sportFilter,
    leagueId: leagueFilter,
    limit: 50,
    orderBy: 'activity_score',
  })

  // Client-side filtering to ensure only bets matching the selected filters are shown
  // This is a safety measure in case server-side filtering doesn't work correctly
  const trendingBets = trendingBetsRaw.filter((bet) => {
    // Filter out bets without matches
    if (!bet.match) return false

    // If a sport is selected, ensure the bet's match sport matches
    if (sportFilter && bet.match.sport?.id !== sportFilter) {
      return false
    }

    // If a league is selected, ensure the bet's match league matches
    if (leagueFilter) {
      // Check if match has league_id or if competition matches
      const matchLeagueId = bet.match.league_id
      const matchCompetition = bet.match.competition
      // Note: We might need to check league name if league_id isn't available
      // For now, we'll rely on the server-side filtering and this is just a safety check
      if (matchLeagueId && matchLeagueId !== leagueFilter) {
        return false
      }
    }

    return true
  })

  // Client-side profile completion check (UX improvement, not security)
  useEffect(() => {
    if (user && !user.is_profile_complete) {
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

        if (!hasExplicit) {
          router.push('/sport-selection')
        }
      } catch (error) {
        console.error('Error checking sport preferences:', error)
      }
    }

    checkSportPreferences()
  }, [user, router])

  // Reset league filter when sport changes
  useEffect(() => {
    setSelectedLeagueId('all')
  }, [selectedSportId])

  if (isUserLoading) {
    return (
      <div className="md:ml-64 p-4 md:p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const renderTrendingCard = (bet: TrendingBet) => {
    const match = bet.match
    const sportName = match?.sport?.name ?? 'Unknown sport'
    const leagueName = match?.competition ?? 'League'

    return (
      <Card
        key={bet.id}
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => router.push(`/challenges/${bet.id}`)}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{sportName}</span>
            <span>{leagueName}</span>
          </div>

          {match?.home_team && match?.away_team ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <div className="flex items-center space-x-2 flex-1">
                  {match.home_team.cloudinary_logo_url || match.home_team.logo_url ? (
                    <img
                      src={match.home_team.cloudinary_logo_url || match.home_team.logo_url || ''}
                      alt={match.home_team.name}
                      className="w-8 h-8 object-contain"
                    />
                  ) : null}
                  <span className="font-semibold text-sm truncate">{match.home_team.name}</span>
                </div>
                <span className="text-muted-foreground text-xs">vs</span>
                <div className="flex items-center space-x-2 flex-1 justify-end">
                  {match.away_team.cloudinary_logo_url || match.away_team.logo_url ? (
                    <img
                      src={match.away_team.cloudinary_logo_url || match.away_team.logo_url || ''}
                      alt={match.away_team.name}
                      className="w-8 h-8 object-contain"
                    />
                  ) : null}
                  <span className="font-semibold text-sm truncate text-right">
                    {match.away_team.name}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Bet #{bet.id.slice(0, 8).toUpperCase()}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <Users className="h-3 w-3" />
                <span>
                  {bet.participant_count || bet.bet_predictions?.length || 0}{' '}
                  {(bet.participant_count || bet.bet_predictions?.length || 0) === 1
                    ? 'participant'
                    : 'participants'}
                </span>
              </div>
              <span>Min stake {bet.min_opponent_amount}</span>
            </div>
            {match?.start_time && <span>{formatDate(match.start_time)}</span>}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="md:ml-64">
      {/* Sticky header with title and filters - flush to top on desktop, below mobile header on mobile */}
      <div className="sticky top-14 md:top-0 z-10 bg-background border-b px-4 md:px-6 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-5 w-5 text-blue-600" />
          <h1 className="text-xl font-semibold">Trending Markets</h1>
        </div>

        {/* Sports row */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={selectedSportId === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedSportId('all')}
          >
            All
          </Button>
          {isSportsLoading ? (
            <span className="text-xs text-muted-foreground self-center">Loading sports...</span>
          ) : (
            sports.map((sport) => (
              <Button
                key={sport.id}
                size="sm"
                variant={selectedSportId === sport.id ? 'default' : 'outline'}
                onClick={() => setSelectedSportId(sport.id)}
              >
                {sport.name}
              </Button>
            ))
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="px-4 md:px-6 py-6">
        {/* League selection (when a specific sport is selected) */}
        {selectedSportId !== 'all' && (
          <div className="mb-6">
            <p className="text-sm font-medium text-muted-foreground mb-3">Leagues</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedLeagueId === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedLeagueId('all')}
              >
                All leagues
              </Button>
              {isLeaguesLoading ? (
                <span className="text-xs text-muted-foreground self-center">Loading leagues...</span>
              ) : (
                leagues.map((league) => (
                  <Button
                    key={league.id}
                    size="sm"
                    variant={selectedLeagueId === league.id ? 'default' : 'outline'}
                    onClick={() => setSelectedLeagueId(league.id)}
                  >
                    {league.name}
                  </Button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Trending Markets List as main content */}
      {isTrendingLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Loading trending markets...</p>
        </div>
      ) : trendingBets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {sportFilter || leagueFilter
            ? 'No match events occurring now for this selection. Try another sport or league.'
            : 'No trending markets available at the moment. Check back soon!'}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {trendingBets.map(renderTrendingCard)}
        </div>
      )}
      </div>
    </div>
  )
}