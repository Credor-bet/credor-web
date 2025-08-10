'use client'

import { Badge } from '@/components/ui/badge'
import { Clock, Play, CheckCircle, XCircle } from 'lucide-react'

interface MatchStatusBadgeProps {
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  result?: 'home_win' | 'away_win' | 'draw' | null
  className?: string
}

/**
 * A status badge that clearly shows the current state of a match
 */
export function MatchStatusBadge({ status, result, className }: MatchStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'scheduled':
        return {
          icon: Clock,
          text: 'Scheduled',
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }
      case 'live':
        return {
          icon: Play,
          text: 'LIVE',
          variant: 'default' as const,
          className: 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
        }
      case 'completed':
        return {
          icon: CheckCircle,
          text: result === 'draw' ? 'Final - Draw' : result === 'home_win' ? 'Final - Home Win' : result === 'away_win' ? 'Final - Away Win' : 'Final',
          variant: 'outline' as const,
          className: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
        }
      case 'cancelled':
        return {
          icon: XCircle,
          text: 'Cancelled',
          variant: 'destructive' as const,
          className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
        }
      default:
        return {
          icon: Clock,
          text: 'Unknown',
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-700'
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${className} flex items-center gap-1 px-2 py-1`}
    >
      <Icon className="w-3 h-3" />
      <span className="text-xs font-medium">{config.text}</span>
    </Badge>
  )
}

interface LiveScoreDisplayProps {
  homeScore: number
  awayScore: number
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  result?: 'home_win' | 'away_win' | 'draw' | null
  homeTeam?: string
  awayTeam?: string
  className?: string
}

/**
 * A complete score display with status for live matches
 */
export function LiveScoreDisplay({ 
  homeScore, 
  awayScore, 
  status, 
  result, 
  homeTeam, 
  awayTeam, 
  className 
}: LiveScoreDisplayProps) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      {/* Teams and Score */}
      <div className="flex-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700 truncate">{homeTeam || 'Home'}</span>
          <span className="font-bold text-lg mx-2">{homeScore}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700 truncate">{awayTeam || 'Away'}</span>
          <span className="font-bold text-lg mx-2">{awayScore}</span>
        </div>
      </div>
      
      {/* Status Badge */}
      <MatchStatusBadge status={status} result={result} />
    </div>
  )
}
