'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChallengeCard } from '@/components/challenges/challenge-card'
import type { Challenge } from '@/lib/challenge-service'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { Users, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { getBetOriginLabel, isPublicEvent, PUBLIC_EVENT_LABEL, getPredictionDisplay, getAmountDisplay } from '@/lib/bet-display'
import { supabase } from '@/lib/supabase'
import type { PredictionType } from '@/types/bets'

interface TrendingBetModalProps {
  bet: Challenge | null
  isOpen: boolean
  onClose: () => void
}

interface ParticipantWithDetails {
  user_id: string
  username: string
  avatar_url: string | null
  prediction: PredictionType | null
  amount: number | null
  isPredictionHidden?: boolean
  isAmountHidden?: boolean
}

export function TrendingBetModal({ bet, isOpen, onClose }: TrendingBetModalProps) {
  const router = useRouter()
  const { user, wallet } = useAuthStore()
  const [localBet, setLocalBet] = useState<Challenge | null>(bet)
  const [showParticipants, setShowParticipants] = useState(false)
  const [predictionFilter, setPredictionFilter] = useState<PredictionType | 'all'>('all')
  const [participantsWithDetails, setParticipantsWithDetails] = useState<ParticipantWithDetails[]>([])
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false)

  useEffect(() => {
    setLocalBet(bet)
    setShowParticipants(false)
    setPredictionFilter('all')
  }, [bet])

  const resolvedBet = localBet || bet
  const participantCount = resolvedBet?.participant_count ?? resolvedBet?.bet_predictions?.length ?? 0
  const isParticipant = !!(resolvedBet && (
    resolvedBet.isParticipant ??
    resolvedBet.bet_predictions?.some(prediction => prediction.user_id === user?.id)
  ))
  const isPublic = resolvedBet ? isPublicEvent(resolvedBet) : false

  // Fetch participant details when participants list is opened
  useEffect(() => {
    const loadParticipantDetails = async () => {
      if (!resolvedBet?.bet_predictions || resolvedBet.bet_predictions.length === 0) {
        setParticipantsWithDetails([])
        return
      }

      setIsLoadingParticipants(true)
      try {
        const userIds = resolvedBet.bet_predictions.map(p => p.user_id)
        
        // Fetch user details for all participants
        const { data: userData, error } = await supabase
          .from('users')
          .select('id, username, avatar_url')
          .in('id', userIds)

        if (error) {
          console.error('Error fetching participant details:', error)
          setParticipantsWithDetails([])
          return
        }

        // Map predictions with user details
        const participants: ParticipantWithDetails[] = resolvedBet.bet_predictions.map(prediction => {
          const userInfo = userData?.find(u => u.id === prediction.user_id)
          return {
            user_id: prediction.user_id,
            username: userInfo?.username || 'Unknown User',
            avatar_url: userInfo?.avatar_url || null,
            prediction: prediction.prediction,
            amount: prediction.amount,
            isPredictionHidden: prediction.isPredictionHidden,
            isAmountHidden: prediction.isAmountHidden,
          }
        })

        setParticipantsWithDetails(participants)
      } catch (error) {
        console.error('Error loading participant details:', error)
        setParticipantsWithDetails([])
      } finally {
        setIsLoadingParticipants(false)
      }
    }

    if (showParticipants && isPublic && resolvedBet?.bet_predictions) {
      loadParticipantDetails()
    }
  }, [showParticipants, isPublic, resolvedBet?.bet_predictions])

  // Filter participants by prediction type
  const filteredParticipants = participantsWithDetails.filter(participant => {
    if (predictionFilter === 'all') return true
    if (participant.isPredictionHidden) return false
    return participant.prediction === predictionFilter
  })

  // Count participants by prediction type
  const getPredictionCount = (predType: PredictionType | 'all'): number => {
    if (predType === 'all') return participantsWithDetails.length
    return participantsWithDetails.filter(p => 
      !p.isPredictionHidden && p.prediction === predType
    ).length
  }

  const handleHistory = () => {
    if (!resolvedBet) return
    router.push(`/challenges/${resolvedBet.id}`)
    onClose()
  }

  const originLabel = resolvedBet ? getBetOriginLabel(resolvedBet, 'Unknown event') : ''
  const currency = wallet?.currency || 'CREDORR'

  return (
    <Dialog open={isOpen && !!resolvedBet} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Trending Bet Details</DialogTitle>
          <DialogDescription>
            {resolvedBet
              ? (isPublic ? PUBLIC_EVENT_LABEL : `Created by ${originLabel}`)
              : 'Select a trending bet to view more details.'}
          </DialogDescription>
        </DialogHeader>

        {!resolvedBet ? (
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
              {resolvedBet.match?.start_time && (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(resolvedBet.match.start_time)}</span>
                </div>
              )}
            </div>

            <ChallengeCard
              challenge={resolvedBet}
              onParticipationChange={(joined) => {
                setLocalBet(prev => prev ? { ...prev, isParticipant: joined } : prev)
              }}
            />

            {/* Participants List - Only for public bets */}
            {isPublic && participantCount > 0 && (
              <div className="border rounded-lg">
                <button
                  onClick={() => setShowParticipants(!showParticipants)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">View Participants</span>
                    <Badge variant="outline">{participantCount}</Badge>
                  </div>
                  {showParticipants ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>

                {showParticipants && (
                  <div className="p-4 border-t space-y-4">
                    {/* Prediction Filter Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={predictionFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPredictionFilter('all')}
                      >
                        All ({getPredictionCount('all')})
                      </Button>
                      <Button
                        variant={predictionFilter === 'home_win' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPredictionFilter('home_win')}
                      >
                        {resolvedBet.match?.home_team?.name || 'Home'} ({getPredictionCount('home_win')})
                      </Button>
                      <Button
                        variant={predictionFilter === 'draw' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPredictionFilter('draw')}
                      >
                        Draw ({getPredictionCount('draw')})
                      </Button>
                      <Button
                        variant={predictionFilter === 'away_win' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPredictionFilter('away_win')}
                      >
                        {resolvedBet.match?.away_team?.name || 'Away'} ({getPredictionCount('away_win')})
                      </Button>
                    </div>

                    {/* Participants List */}
                    {isLoadingParticipants ? (
                      <div className="text-center text-muted-foreground py-4">
                        Loading participants...
                      </div>
                    ) : filteredParticipants.length === 0 ? (
                      <div className="text-center text-muted-foreground py-4">
                        No participants found for this filter.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {filteredParticipants.map((participant) => (
                          <div
                            key={participant.user_id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center space-x-3 flex-1">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={participant.avatar_url || ''} />
                                <AvatarFallback>
                                  {participant.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {participant.username}
                                </p>
                                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                  <span>
                                    Prediction: {getPredictionDisplay(
                                      participant as any,
                                      resolvedBet.match,
                                      'Not set'
                                    )}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    Amount: {getAmountDisplay(
                                      participant as any,
                                      currency,
                                      '—'
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

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

