'use client'

import { useRouter } from 'next/navigation'
import { useBettingStore, useAuthStore } from '@/lib/store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, Eye } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface PendingBetsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PendingBetsModal({ isOpen, onClose }: PendingBetsModalProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const bettingStore = useBettingStore()
  const allActiveBets = Array.isArray(bettingStore?.activeBets) ? bettingStore.activeBets : []
  // Filter for pending bets only
  const pendingBets = allActiveBets.filter(bet => bet.status === 'pending')

  // Helper function to get bet indicator
  const getBetIndicator = (bet: { creator_id: string; opponent_id: string | null; status: string }) => {
    const isCreator = bet.creator_id === user?.id
    const isOpponent = bet.opponent_id === user?.id
    
    if (bet.status === 'pending') {
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

  // Helper to get match teams info
  const getMatchInfo = (bet: any) => {
    if (bet.matches?.home_team && bet.matches?.away_team) {
      return {
        homeTeam: bet.matches.home_team.name || 'Home Team',
        awayTeam: bet.matches.away_team.name || 'Away Team',
        homeLogo: bet.matches.home_team.cloudinary_logo_url || bet.matches.home_team.logo_url,
        awayLogo: bet.matches.away_team.cloudinary_logo_url || bet.matches.away_team.logo_url,
      }
    }
    return null
  }

  const handleBetClick = (betId: string) => {
    router.push(`/challenges/${betId}`)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Pending Bets</span>
          </DialogTitle>
          <DialogDescription>
            Bets awaiting response ({pendingBets.length} {pendingBets.length === 1 ? 'bet' : 'bets'})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {pendingBets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium mb-2">No pending bets</p>
              <p className="text-sm">All caught up! No bets waiting for response.</p>
            </div>
          ) : (
            pendingBets.map((bet: any) => {
              const indicator = getBetIndicator(bet)
              const role = getBetRole(bet)
              const matchInfo = getMatchInfo(bet)
              
              return (
                <div
                  key={bet.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border border-transparent hover:border-gray-300"
                  onClick={() => handleBetClick(bet.id)}
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className={`w-3 h-3 ${indicator.color} rounded-full flex-shrink-0`}></div>
                    <div className="flex-1 min-w-0">
                      {matchInfo ? (
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium truncate">{matchInfo.homeTeam}</span>
                            <span className="text-xs text-muted-foreground">vs</span>
                            <span className="text-sm font-medium truncate">{matchInfo.awayTeam}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {role} • {formatDate(bet.created_at)}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-medium">Bet #{typeof bet.id === "string" ? bet.id.slice(0, 8) : ''}</p>
                          <p className="text-xs text-muted-foreground">
                            {role} • {formatDate(bet.created_at)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {indicator.text}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleBetClick(bet.id)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

