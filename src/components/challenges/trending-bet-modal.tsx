'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChallengeCard } from '@/components/challenges/challenge-card'
import type { Challenge } from '@/lib/challenge-service'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { Users, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { getBetOriginLabel, isPublicEvent, PUBLIC_EVENT_LABEL } from '@/lib/bet-display'

interface TrendingBetModalProps {
  bet: Challenge | null
  isOpen: boolean
  onClose: () => void
}

export function TrendingBetModal({ bet, isOpen, onClose }: TrendingBetModalProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const participantCount = bet?.participant_count ?? bet?.bet_predictions?.length ?? 0
  const isParticipant = !!bet?.bet_predictions?.some(prediction => prediction.user_id === user?.id)

  const handleHistory = () => {
    if (!bet) return
    router.push(`/history/${bet.id}`)
    onClose()
  }

  const originLabel = bet ? getBetOriginLabel(bet, 'Unknown event') : ''
  const isPublic = bet ? isPublicEvent(bet) : false

  return (
    <Dialog open={isOpen && !!bet} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Trending Bet Details</DialogTitle>
          <DialogDescription>
            {bet
              ? (isPublic ? PUBLIC_EVENT_LABEL : `Created by ${originLabel}`)
              : 'Select a trending bet to view more details.'}
          </DialogDescription>
        </DialogHeader>

        {!bet ? (
          <div className="text-center text-muted-foreground py-6">
            No trending bet selected.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>
                  {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
                </span>
              </div>
              {bet.match?.start_time && (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(bet.match.start_time)}</span>
                </div>
              )}
            </div>

            <ChallengeCard
              challenge={bet}
              showActions={!isParticipant}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {isParticipant && (
                <Button onClick={handleHistory}>
                  View Bet History
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

