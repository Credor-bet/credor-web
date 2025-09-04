'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useMatchSubscription } from '@/hooks/use-websocket'
import { Match } from '@/lib/challenge-service'
import { cn } from '@/lib/utils'
import { 
  Wifi, 
  WifiOff, 
  Circle, 
  Pause, 
  Play,
  Trophy,
  Ban
} from 'lucide-react'

interface LiveMatchScoreProps {
  match: Match
  className?: string
  variant?: 'default' | 'compact' | 'minimal'
  showConnectionStatus?: boolean
}

/**
 * Component that displays live match scores with real-time updates
 */
export function LiveMatchScore({ 
  match, 
  className, 
  variant = 'default',
  showConnectionStatus = false 
}: LiveMatchScoreProps) {
  const [pulseScore, setPulseScore] = useState(false)
  const [lastScoreUpdate, setLastScoreUpdate] = useState<string | null>(null)
  
  // Subscribe to live updates for this match using the fixture_id
  const { liveMatch, isConnected } = useMatchSubscription(match.fixture_id)
  
  // Debug logging to see if we're getting live updates
  useEffect(() => {
    if (liveMatch) {
      console.log(`📊 Live match data for ${match.fixture_id}:`, {
        scores: `${liveMatch.home_score}-${liveMatch.away_score}`,
        status: liveMatch.status,
        lastUpdated: liveMatch.last_updated
      })
    }
  }, [liveMatch, match.fixture_id])

  // Determine current scores - prefer live data over static data
  const currentHomeScore = liveMatch?.home_score ?? match.home_score ?? 0
  const currentAwayScore = liveMatch?.away_score ?? match.away_score ?? 0
  const currentStatus = liveMatch?.status ?? match.status

  // Handle score update animations
  useEffect(() => {
    if (liveMatch?.last_updated && liveMatch.last_updated !== lastScoreUpdate) {
      setPulseScore(true)
      setLastScoreUpdate(liveMatch.last_updated)
      
      // Remove pulse animation after 2 seconds
      const timer = setTimeout(() => {
        setPulseScore(false)
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [liveMatch?.last_updated, lastScoreUpdate])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-gray-100 text-gray-700'
      case 'live': 
      case 'in_progress': return 'bg-green-100 text-green-700'
      case 'completed': return 'bg-blue-100 text-blue-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Circle className="h-3 w-3" />
      case 'live':
      case 'in_progress': return <Play className="h-3 w-3" />
      case 'completed': return <Trophy className="h-3 w-3" />
      case 'cancelled': return <Ban className="h-3 w-3" />
      default: return <Pause className="h-3 w-3" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Scheduled'
      case 'live':
      case 'in_progress': return 'Live'
      case 'completed': return 'Final'
      case 'cancelled': return 'Cancelled'
      default: return status
    }
  }

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <div className={cn(
          'flex items-center space-x-1 px-2 py-1 rounded text-sm font-medium transition-all duration-300',
          pulseScore && 'animate-pulse bg-yellow-100',
          !pulseScore && (currentStatus === 'live' || currentStatus === 'in_progress') && 'bg-green-50',
          currentStatus === 'completed' && 'bg-blue-50',
          currentStatus === 'scheduled' && 'bg-gray-50'
        )}>
          <span>{currentHomeScore}</span>
          <span className="text-muted-foreground">-</span>
          <span>{currentAwayScore}</span>
        </div>
        
        <Badge variant="outline" className={cn('text-xs', getStatusColor(currentStatus))}>
          {getStatusIcon(currentStatus)}
          <span className="ml-1">{getStatusText(currentStatus)}</span>
        </Badge>

        {showConnectionStatus && (
          <div className="flex items-center">
            {isConnected ? (
              <div title="Connected to live updates">
                <Wifi className="h-3 w-3 text-green-500" />
              </div>
            ) : (
              <div title="Not connected to live updates">
                <WifiOff className="h-3 w-3 text-gray-400" />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <Card className={cn('bg-gray-50', className)}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center">
                {match.home_team.cloudinary_logo_url || match.home_team.logo_url ? (
                  <img 
                    src={match.home_team.cloudinary_logo_url || match.home_team.logo_url} 
                    alt="" 
                    className="h-5 w-5 mr-1 rounded-full object-cover" 
                  />
                ) : (
                  <div className="h-5 w-5 mr-1 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {match.home_team.name?.slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-sm font-medium">{match.home_team.name}</span>
              </div>
              
              <div className={cn(
                'flex items-center space-x-2 px-2 py-1 rounded-lg font-bold transition-all duration-300',
                pulseScore && 'animate-pulse bg-yellow-200',
                !pulseScore && (currentStatus === 'live' || currentStatus === 'in_progress') && 'bg-green-100',
                currentStatus === 'completed' && 'bg-blue-100',
                currentStatus === 'scheduled' && 'bg-gray-100'
              )}>
                <span className="text-lg">{currentHomeScore}</span>
                <span className="text-muted-foreground">-</span>
                <span className="text-lg">{currentAwayScore}</span>
              </div>
              
              <div className="flex items-center">
                {match.away_team.cloudinary_logo_url || match.away_team.logo_url ? (
                  <img 
                    src={match.away_team.cloudinary_logo_url || match.away_team.logo_url} 
                    alt="" 
                    className="h-5 w-5 mr-1 rounded-full object-cover" 
                  />
                ) : (
                  <div className="h-5 w-5 mr-1 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {match.away_team.name?.slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-sm font-medium">{match.away_team.name}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge className={cn('text-xs', getStatusColor(currentStatus))}>
                {getStatusIcon(currentStatus)}
                <span className="ml-1">{getStatusText(currentStatus)}</span>
              </Badge>
              
              {showConnectionStatus && (
                <div className="flex items-center">
                  {isConnected ? (
                    <div title="Live updates active">
                      <Wifi className="h-4 w-4 text-green-500" />
                    </div>
                  ) : (
                    <div title="Live updates inactive">
                      <WifiOff className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default variant
  return (
    <Card className={cn('bg-gray-50', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              {match.home_team.cloudinary_logo_url || match.home_team.logo_url ? (
                <img 
                  src={match.home_team.cloudinary_logo_url || match.home_team.logo_url} 
                  alt="" 
                  className="h-8 w-8 mr-2 rounded-full object-cover" 
                />
              ) : (
                <div className="h-8 w-8 mr-2 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {match.home_team.name?.slice(0, 1).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <div className="font-medium">{match.home_team.name}</div>
                <div className="text-xs text-muted-foreground">Home</div>
              </div>
            </div>
            
            <div className="text-center">
              <div className={cn(
                'flex items-center space-x-3 px-4 py-2 rounded-lg font-bold text-xl transition-all duration-300',
                pulseScore && 'animate-pulse bg-yellow-200',
                !pulseScore && (currentStatus === 'live' || currentStatus === 'in_progress') && 'bg-green-100',
                currentStatus === 'completed' && 'bg-blue-100',
                currentStatus === 'scheduled' && 'bg-gray-100'
              )}>
                <span>{currentHomeScore}</span>
                <span className="text-muted-foreground text-lg">-</span>
                <span>{currentAwayScore}</span>
              </div>
              
              <Badge variant="outline" className={cn('text-xs mt-2', getStatusColor(currentStatus))}>
                {getStatusIcon(currentStatus)}
                <span className="ml-1">{getStatusText(currentStatus)}</span>
              </Badge>
            </div>
            
            <div className="flex items-center">
              {match.away_team.cloudinary_logo_url || match.away_team.logo_url ? (
                <img 
                  src={match.away_team.cloudinary_logo_url || match.away_team.logo_url} 
                  alt="" 
                  className="h-8 w-8 mr-2 rounded-full object-cover" 
                />
              ) : (
                <div className="h-8 w-8 mr-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {match.away_team.name?.slice(0, 1).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <div className="font-medium">{match.away_team.name}</div>
                <div className="text-xs text-muted-foreground">Away</div>
              </div>
            </div>
          </div>
          
          {showConnectionStatus && (
            <div className="flex items-center space-x-2">
              <div className="text-xs text-muted-foreground">
                {isConnected ? 'Live' : 'Static'}
              </div>
              {isConnected ? (
                <div title="Live updates active">
                  <Wifi className="h-4 w-4 text-green-500" />
                </div>
              ) : (
                <div title="Live updates inactive">
                  <WifiOff className="h-4 w-4 text-gray-400" />
                </div>
              )}
            </div>
          )}
        </div>
        
        {liveMatch?.last_updated && (
          <div className="text-xs text-muted-foreground mt-2 text-center">
            Last updated: {new Date(liveMatch.last_updated).toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
