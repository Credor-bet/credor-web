'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/store'
import { ChallengeService, type Challenge, type PredictionType } from '@/lib/challenge-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Clock,
  Trophy,
  Coins,
  Users,
  Target,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  LogOut,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'
import { LiveMatchScore } from '@/components/matches/live-match-score'
import { getAmountDisplay, getBetOriginLabel, getPredictionDisplay, isPublicEvent, PUBLIC_EVENT_LABEL } from '@/lib/bet-display'

interface ChallengeCardProps {
  challenge: Challenge
  variant?: 'default' | 'compact'
  showActions?: boolean
  onParticipationChange?: (isParticipant: boolean) => void
}

export function ChallengeCard({ challenge, variant = 'default', showActions = true, onParticipationChange }: ChallengeCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showAcceptDialog, setShowAcceptDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [stakeAmount, setStakeAmount] = useState(challenge.min_opponent_amount.toString())
  
  // Set default prediction to something different from creator's prediction
  const getDefaultPrediction = (): PredictionType => {
    const creatorPrediction = challenge.bet_predictions?.find(p => p.user_id === challenge.creator_id)?.prediction
    if (creatorPrediction === 'home_win') return 'away_win'
    if (creatorPrediction === 'away_win') return 'home_win'
    if (creatorPrediction === 'draw') return 'home_win'
    return 'home_win' // fallback
  }
  
  const [prediction, setPrediction] = useState<PredictionType>(getDefaultPrediction())
  
  const { user, wallet } = useAuthStore()
  const publicEvent = isPublicEvent(challenge)
  const originLabel = getBetOriginLabel(challenge, 'Unknown user')
  const currency = wallet?.currency || 'CREDORR'

  // Determine user's role in the challenge
  const isCreator = challenge.creator_id === user?.id
  const isOpponent = challenge.opponent_id === user?.id
  const hasPrediction = challenge.bet_predictions?.some(prediction => prediction.user_id === user?.id)
  const normalizedParticipant = challenge.isParticipant ?? false
  // Only count opponent as participant if they've accepted (status is not pending)
  const isParticipant = Boolean(
    normalizedParticipant || 
    isCreator || 
    hasPrediction || 
    (isOpponent && challenge.status !== 'pending') // Only count as participant if accepted
  )
  const canAccept = !isParticipant &&
    !isCreator &&
    challenge.status === 'pending' &&
    (publicEvent || challenge.opponent_id === null || challenge.opponent_id === user?.id)
  const canReject = !publicEvent &&
    !isParticipant &&
    !isCreator &&
    challenge.status === 'pending' &&
    (challenge.opponent_id === null || challenge.opponent_id === user?.id)
  // For 1v1 challenges, only show cancel (which works for both pending and accepted)
  // For public challenges, show appropriate action based on role and status
  const isOneVsOne = challenge.max_participants === 2 || challenge.opponent_id !== null
  const canCancel = isParticipant && (isOneVsOne ?
    // For 1v1: creators can cancel pending/accepted, opponents can only cancel accepted (not pending - they should reject instead)
    (isCreator ? ['pending', 'accepted'].includes(challenge.status) : challenge.status === 'accepted')
    : 
    // For public: only creators can cancel pending challenges
    isCreator && challenge.status === 'pending'
  )
  const canLeave = isParticipant && (
    publicEvent
      ? ['pending', 'accepted'].includes(challenge.status)
      : (!isOneVsOne && challenge.status === 'accepted')
  )

  // Get user's prediction and stake
  const userPrediction = challenge.bet_predictions?.find(p => p.user_id === user?.id)
  const creatorPrediction = challenge.bet_predictions?.find(p => p.user_id === challenge.creator_id)

  const getStatusColor = (status: Challenge['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      case 'accepted': return 'text-blue-600 bg-blue-50'
      case 'rejected': return 'text-red-600 bg-red-50'
      case 'cancelled': return 'text-gray-600 bg-gray-50'
      case 'settled': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusText = (status: Challenge['status']) => {
    switch (status) {
      case 'pending': return 'Waiting for opponent'
      case 'accepted': return 'Challenge accepted'
      case 'rejected': return 'Challenge rejected'
      case 'cancelled': return 'Challenge cancelled'
      case 'settled': return 'Challenge settled'
      default: return status
    }
  }

  const handleAcceptChallenge = async () => {
    // Validation checks with detailed error messages
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast.error('Please enter a valid stake amount')
      return
    }

    if (parseFloat(stakeAmount) < challenge.min_opponent_amount) {
      toast.error(`Minimum stake is ${formatCurrency(challenge.min_opponent_amount, currency)}`)
      return
    }

    if (parseFloat(stakeAmount) > (wallet?.balance || 0)) {
      toast.error(`Insufficient balance. You have ${formatCurrency(wallet?.balance || 0, currency)} available`)
      return
    }

    // Check if user selected same prediction as creator
    const creatorPrediction = challenge.bet_predictions?.find(p => p.user_id === challenge.creator_id)?.prediction
    if (prediction === creatorPrediction) {
      toast.error('You cannot choose the same prediction as the challenge creator')
      return
    }

    let progressToast: string | number | undefined
    
    try {
      setIsLoading(true)
      
      // Show progress toast
      progressToast = toast.loading('Accepting challenge...')
      
      await ChallengeService.acceptChallenge(challenge.id, parseFloat(stakeAmount), prediction)
      
      // Dismiss progress toast and show success
      toast.dismiss(progressToast)
      toast.success(`Challenge accepted! You staked ${formatCurrency(parseFloat(stakeAmount), currency)} on ${
        prediction === 'home_win' ? challenge.match?.home_team.name :
        prediction === 'away_win' ? challenge.match?.away_team.name : 'Draw'
      }`, {
        duration: 5000
      })
      
      setShowAcceptDialog(false)
      onParticipationChange?.(true)
    } catch (error) {
      console.error('Error accepting challenge:', error)
      
      // Always dismiss progress toast first if it exists
      if (progressToast) {
        toast.dismiss(progressToast)
      }
      
      if (error instanceof Error) {
        // Network errors
        if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_CLOSED')) {
          toast.error('Network connection error. Please check your internet connection and try again.')
        }
        // Database validation errors - show specific user-friendly messages
        else if (error.message.includes('Cannot join bet after match has started')) {
          toast.error('⏰ This match has already started! You can no longer join this challenge.')
        }
        else if (error.message.includes('Bet not found or not pending')) {
          toast.error('This challenge is no longer available or has already been accepted.')
        }
        else if (error.message.includes('Insufficient available balance')) {
          toast.error('💰 Insufficient wallet balance to accept this challenge.')
        }
        else if (error.message.includes('Cannot join your own bet')) {
          toast.error('You cannot accept your own challenge!')
        }
        else if (error.message.includes('This bet is not assigned to this user')) {
          toast.error('This challenge is private and not assigned to you.')
        }
        else if (error.message.includes('Bet has reached maximum participants')) {
          toast.error('This challenge is full - maximum participants reached.')
        }
        else if (error.message.includes('Bet amount is below the minimum required')) {
          toast.error('Your stake amount is below the minimum required.')
        }
        else if (error.message.includes('Prediction must differ from creator')) {
          toast.error('You must choose a different prediction than the creator.')
        }
        else if (error.message.includes('duplicate key value') || error.message.includes('already joined')) {
          toast.info('You have already joined this bet.')
          onParticipationChange?.(true)
        }
        // Legacy error handling
        else if (error.message.includes('Insufficient funds')) {
          toast.error('💰 Insufficient wallet balance to accept this challenge.')
        }
        else if (error.message.includes('Challenge not found')) {
          toast.error('This challenge is no longer available.')
        }
        else if (error.message.includes('already accepted')) {
          toast.error('This challenge has already been accepted by someone else.')
        }
        else {
          toast.error(`Failed to accept challenge: ${error.message}`)
        }
      } else {
        toast.error('Failed to accept challenge. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRejectChallenge = async () => {
    let progressToast: string | number | undefined
    
    try {
      setIsLoading(true)
      
      // Show progress toast
      progressToast = toast.loading('Rejecting challenge...')
      
      await ChallengeService.rejectChallenge(challenge.id)
      
      // Dismiss progress toast and show success
      toast.dismiss(progressToast)
      const rejectionTarget = publicEvent ? PUBLIC_EVENT_LABEL : originLabel
      toast.success(`Challenge rejected. ${rejectionTarget} has been notified.`, {
        duration: 4000
      })
      
      setShowRejectDialog(false)
    } catch (error) {
      console.error('Error rejecting challenge:', error)
      
      // Always dismiss progress toast first if it exists
      if (progressToast) {
        toast.dismiss(progressToast)
      }
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_CLOSED')) {
          toast.error('Network connection error. Please check your internet connection and try again.')
        } else if (error.message.includes('Challenge not found')) {
          toast.error('This challenge is no longer available')
        } else if (error.message.includes('already rejected')) {
          toast.error('This challenge has already been rejected')
        } else {
          toast.error(`Failed to reject challenge: ${error.message}`)
        }
      } else {
        toast.error('Failed to reject challenge. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelChallenge = async () => {
    let progressToast: string | number | undefined
    
    try {
      setIsLoading(true)
      
      // Show progress toast
      progressToast = toast.loading('Cancelling challenge...')
      
      await ChallengeService.cancelChallenge(challenge.id)
      
      // Dismiss progress toast and show success
      toast.dismiss(progressToast)
      
      const userPrediction = challenge.bet_predictions?.find(p => p.user_id === user?.id)
      const refundAmount = userPrediction?.amount || 0
      
      toast.success(`Challenge cancelled successfully! ${refundAmount > 0 ? `${formatCurrency(refundAmount, currency)} has been refunded to your wallet.` : ''}`, {
        duration: 5000
      })
      
      setShowCancelDialog(false)
      onParticipationChange?.(false)
    } catch (error) {
      console.error('Error canceling challenge:', error)
      
      // Always dismiss progress toast first if it exists
      if (progressToast) {
        toast.dismiss(progressToast)
      }
      
      if (error instanceof Error) {
        // Network errors
        if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_CLOSED')) {
          toast.error('Network connection error. Please check your internet connection and try again.')
        }
        // Database validation errors - show specific user-friendly messages
        else if (error.message.includes('Cannot cancel after match has started')) {
          toast.error('⏰ Cannot cancel challenge - the match has already started!')
        }
        else if (error.message.includes('Bet not found or not pending/accepted')) {
          toast.error('This challenge is no longer available or cannot be cancelled.')
        }
        else if (error.message.includes('Only participants can cancel the bet')) {
          toast.error('🚫 You are not authorized to cancel this challenge.')
        }
        // Legacy error handling
        else if (error.message.includes('Only participants can cancel')) {
          toast.error('🚫 You are not authorized to cancel this challenge.')
        }
        else if (error.message.includes('not found')) {
          toast.error('This challenge no longer exists.')
        }
        else {
          toast.error(`Failed to cancel challenge: ${error.message}`)
        }
      } else {
        toast.error('Failed to cancel challenge. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleLeaveChallenge = async () => {
    let progressToast: string | number | undefined
    
    try {
      setIsLoading(true)
      
      // Show progress toast
      progressToast = toast.loading('Leaving challenge...')
      
      await ChallengeService.leaveChallenge(challenge.id)
      
      // Dismiss progress toast and show success
      toast.dismiss(progressToast)
      
      const userPrediction = challenge.bet_predictions?.find(p => p.user_id === user?.id)
      const refundAmount = userPrediction?.amount || 0
      
      toast.success(`You have left the challenge. ${formatCurrency(refundAmount, currency)} has been refunded to your wallet.`, {
        duration: 5000
      })
      
      setShowLeaveDialog(false)
      onParticipationChange?.(false)
    } catch (error) {
      console.error('Error leaving challenge:', error)
      
      // Always dismiss progress toast first if it exists
      if (progressToast) {
        toast.dismiss(progressToast)
      }
      
      if (error instanceof Error) {
        // Network errors
        if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_CLOSED')) {
          toast.error('Network connection error. Please check your internet connection and try again.')
        }
        // Database validation errors - show specific user-friendly messages
        else if (error.message.includes('Cannot leave bet after match has started')) {
          toast.error('⏰ Cannot leave challenge - the match has already started!')
        }
        else if (error.message.includes('Bet not found')) {
          toast.error('This challenge no longer exists.')
        }
        else if (error.message.includes('This function is for public bets only')) {
          toast.error('Cannot leave this challenge - it\'s a private 1v1 challenge. Use cancel instead.')
        }
        else if (error.message.includes('User is not a participant in this bet')) {
          toast.error('🚫 You are not a participant in this challenge.')
        }
        // Legacy error handling
        else if (error.message.includes('Cannot leave after match has started')) {
          toast.error('⏰ Cannot leave challenge - the match has already started!')
        }
        else if (error.message.includes('not a participant')) {
          toast.error('🚫 You are not a participant in this challenge.')
        }
        else if (error.message.includes('not found')) {
          toast.error('This challenge no longer exists.')
        }
        else {
          toast.error(`Failed to leave challenge: ${error.message}`)
        }
      } else {
        toast.error('Failed to leave challenge. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (variant === 'compact') {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {challenge.match && (
                <LiveMatchScore 
                  match={challenge.match} 
                  variant="minimal" 
                  showConnectionStatus={false}
                />
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(challenge.status)}>
                {getStatusText(challenge.status)}
              </Badge>
              <div className="text-xs text-muted-foreground">
                {getAmountDisplay(creatorPrediction)}
              </div>
            </div>
          </div>

          {showActions && (canAccept || canReject || canCancel || canLeave) && (
            <div className="flex gap-2 mt-3">
              {canAccept && (
                <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="flex-1">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Accept
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Accept Challenge</DialogTitle>
                      <DialogDescription>
                        Set your prediction and stake amount to accept this challenge
                      </DialogDescription>
                    </DialogHeader>
                    <AcceptChallengeForm
                      challenge={challenge}
                      stakeAmount={stakeAmount}
                      setStakeAmount={setStakeAmount}
                      prediction={prediction}
                      setPrediction={setPrediction}
                      onAccept={handleAcceptChallenge}
                      isLoading={isLoading}
                    />
                  </DialogContent>
                </Dialog>
              )}

              {canReject && (
                <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="flex-1">
                      <XCircle className="h-3 w-3 mr-1" />
                      Reject
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reject Challenge</DialogTitle>
                      <DialogDescription>
                        Decline this challenge - this action cannot be undone
                      </DialogDescription>
                    </DialogHeader>
                    <RejectChallengeForm
                      challenge={challenge}
                      onReject={handleRejectChallenge}
                      isLoading={isLoading}
                    />
                  </DialogContent>
                </Dialog>
              )}

              {canCancel && (
                <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="destructive" className="flex-1">
                      <XCircle className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cancel Challenge</DialogTitle>
                      <DialogDescription>
                        Cancel this challenge and refund all stakes
                      </DialogDescription>
                    </DialogHeader>
                    <CancelChallengeForm
                      challenge={challenge}
                      onCancel={handleCancelChallenge}
                      isLoading={isLoading}
                    />
                  </DialogContent>
                </Dialog>
              )}

              {canLeave && (
                <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="destructive">
                      <LogOut className="h-3 w-3 mr-1" />
                      Leave
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Leave Challenge</DialogTitle>
                      <DialogDescription>
                        Leave this challenge and get your stake refunded
                      </DialogDescription>
                    </DialogHeader>
                    <LeaveChallengeForm
                      challenge={challenge}
                      onLeave={handleLeaveChallenge}
                      isLoading={isLoading}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              {!publicEvent && challenge.creator ? (
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src={challenge.creator.avatar_url || ''} />
                  <AvatarFallback>{challenge.creator.username[0]}</AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-8 w-8 mr-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-semibold flex items-center justify-center">
                  {PUBLIC_EVENT_LABEL.slice(0, 1)}
                </div>
              )}
              <div>
                <div className="font-medium">{originLabel}</div>
                <div className="text-xs text-muted-foreground">
                  {publicEvent ? PUBLIC_EVENT_LABEL : isCreator ? 'Your challenge' : 'Challenged you'}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(challenge.status)}>
              {getStatusText(challenge.status)}
            </Badge>
            {isParticipant && (
              <Badge variant="outline" className="text-xs">
                Joined
              </Badge>
            )}
          </div>
        </div>

        {/* Match Information */}
        {challenge.match && (
          <div className="space-y-2">
            <LiveMatchScore 
              match={challenge.match} 
              variant="compact" 
              showConnectionStatus={challenge.match.status === 'live'}
            />
            
            <div className="flex items-center justify-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-1" />
              {formatDate(challenge.match.start_time)}
              {(challenge.match.competition || challenge.match.sport?.name) && (
                <>
                  <span className="mx-2">•</span>
                  <Badge variant="outline" className="text-xs">
                    {challenge.match.competition || challenge.match.sport?.name}
                  </Badge>
                </>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Challenge Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">
              {publicEvent ? `${PUBLIC_EVENT_LABEL} prediction` : "Creator's Prediction"}
            </div>
            <div className="font-medium">
              {getPredictionDisplay(creatorPrediction, challenge.match, 'Unknown')}
            </div>
            <div className="text-sm text-green-600">
              {getAmountDisplay(creatorPrediction, currency)}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-muted-foreground">Min. Opponent Stake</div>
            <div className="font-medium">
              {formatCurrency(challenge.min_opponent_amount, currency)}
            </div>
            {challenge.max_participants > 2 && (
              <div className="text-xs text-muted-foreground">
                Max {challenge.max_participants} participants
              </div>
            )}
          </div>
        </div>

        {/* User's Prediction (if participant) */}
        {userPrediction && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-muted-foreground">Your Prediction</div>
            <div className="font-medium">{getPredictionDisplay(userPrediction, challenge.match, 'Not set')}</div>
            <div className="text-sm text-blue-600">
              {getAmountDisplay(userPrediction, currency)}
            </div>
            {publicEvent && (
              <p className="text-xs text-muted-foreground mt-2">
                To adjust your stake, leave this bet first and join again with a new amount.
              </p>
            )}
          </div>
        )}

        <Separator />

        {/* Action Buttons */}
        {showActions && (
          <div className="flex gap-2">
            {canAccept && (
              <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
                <DialogTrigger asChild>
                  <Button className="flex-1">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept Challenge
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Accept Challenge</DialogTitle>
                    <DialogDescription>
                      Set your prediction and stake amount to accept this challenge
                    </DialogDescription>
                  </DialogHeader>
                  <AcceptChallengeForm
                    challenge={challenge}
                    stakeAmount={stakeAmount}
                    setStakeAmount={setStakeAmount}
                    prediction={prediction}
                    setPrediction={setPrediction}
                    onAccept={handleAcceptChallenge}
                    isLoading={isLoading}
                  />
                </DialogContent>
              </Dialog>
            )}

            {canReject && (
              <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reject Challenge</DialogTitle>
                    <DialogDescription>
                      Decline this challenge - this action cannot be undone
                    </DialogDescription>
                  </DialogHeader>
                  <RejectChallengeForm
                    challenge={challenge}
                    onReject={handleRejectChallenge}
                    isLoading={isLoading}
                  />
                </DialogContent>
              </Dialog>
            )}

            {canCancel && (
              <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <XCircle className="h-4 w-4 mr-2" />
                    {challenge.status === 'pending' ? 'Cancel Challenge' : 'End Challenge'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{challenge.status === 'pending' ? 'Cancel Challenge' : 'End Challenge'}</DialogTitle>
                    <DialogDescription>
                      {challenge.status === 'pending' 
                        ? 'Cancel this challenge before anyone accepts it'
                        : 'End this challenge and refund all stakes to participants'
                      }
                    </DialogDescription>
                  </DialogHeader>
                  <CancelChallengeForm
                    challenge={challenge}
                    onCancel={handleCancelChallenge}
                    isLoading={isLoading}
                  />
                </DialogContent>
              </Dialog>
            )}

            {canLeave && (
              <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Leave Challenge
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Leave Challenge</DialogTitle>
                    <DialogDescription>
                      Leave this challenge and get your stake refunded
                    </DialogDescription>
                  </DialogHeader>
                  <LeaveChallengeForm
                    challenge={challenge}
                    onLeave={handleLeaveChallenge}
                    isLoading={isLoading}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}

        {/* Challenge Info */}
        <div className="text-xs text-muted-foreground">
          Created {formatDate(challenge.created_at)}
          {challenge.updated_at !== challenge.created_at && (
            <> • Updated {formatDate(challenge.updated_at)}</>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Accept Challenge Form Component
interface AcceptChallengeFormProps {
  challenge: Challenge
  stakeAmount: string
  setStakeAmount: (amount: string) => void
  prediction: PredictionType
  setPrediction: (prediction: PredictionType) => void
  onAccept: () => void
  isLoading: boolean
}

function AcceptChallengeForm({
  challenge,
  stakeAmount,
  setStakeAmount,
  prediction,
  setPrediction,
  onAccept,
  isLoading
}: AcceptChallengeFormProps) {
  const { wallet } = useAuthStore()
  const publicEvent = isPublicEvent(challenge)
  const creatorLabel = publicEvent ? `${PUBLIC_EVENT_LABEL} default pick` : 'Creator picked'
  const currency = wallet?.currency || 'CREDORR'
  
  // Get creator's prediction to disable the same option
  const creatorPrediction = challenge.bet_predictions?.find(p => p.user_id === challenge.creator_id)
  const creatorPredictionType = creatorPrediction?.prediction

  return (
    <div className="space-y-3">
      {/* Match Info - Compact */}
      {challenge.match && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                                 {challenge.match.home_team.cloudinary_logo_url || challenge.match.home_team.logo_url ? (
                   <img
                     src={challenge.match.home_team.cloudinary_logo_url || challenge.match.home_team.logo_url || ''}
                     alt=""
                     className="h-5 w-5 mr-1 rounded-full object-cover"
                   />
                 ) : (
                  <div className="h-5 w-5 mr-1 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {challenge.match.home_team.name?.slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-sm font-medium">{challenge.match.home_team.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">vs</span>
              <div className="flex items-center">
                                 {challenge.match.away_team.cloudinary_logo_url || challenge.match.away_team.logo_url ? (
                   <img
                     src={challenge.match.away_team.cloudinary_logo_url || challenge.match.away_team.logo_url || ''}
                     alt=""
                     className="h-5 w-5 mr-1 rounded-full object-cover"
                   />
                 ) : (
                  <div className="h-5 w-5 mr-1 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {challenge.match.away_team.name?.slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-sm font-medium">{challenge.match.away_team.name}</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {formatDate(challenge.match.start_time)}
          </div>
        </div>
      )}

      {/* Available Balance - Compact */}
      <div className="p-3 bg-blue-50 rounded-lg">
        <div className="text-xs text-muted-foreground">Available Balance</div>
        <div className="text-lg font-bold">
          {formatCurrency(wallet?.balance || 0, currency)}
        </div>
      </div>

      {/* Prediction Selection - Compact */}
      <div>
        <Label className="text-sm font-medium">Your Prediction</Label>
        <div className="text-xs text-muted-foreground mb-2">
          {creatorLabel}: {getPredictionDisplay(creatorPrediction, challenge.match, 'Unknown')}
        </div>
        <div className="space-y-1.5 mt-2">
          <Button
            variant={prediction === 'home_win' ? 'default' : 'outline'}
            className={`w-full justify-start h-9 ${creatorPredictionType === 'home_win' ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => creatorPredictionType !== 'home_win' && setPrediction('home_win')}
            disabled={creatorPredictionType === 'home_win'}
          >
            <Target className="h-3 w-3 mr-2" />
            <span className="text-sm">{challenge.match?.home_team.name}</span>
            {creatorPredictionType === 'home_win' && (
              <Badge variant="secondary" className="ml-auto text-xs">Creator</Badge>
            )}
          </Button>
          
          <Button
            variant={prediction === 'draw' ? 'default' : 'outline'}
            className={`w-full justify-start h-9 ${creatorPredictionType === 'draw' ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => creatorPredictionType !== 'draw' && setPrediction('draw')}
            disabled={creatorPredictionType === 'draw'}
          >
            <Target className="h-3 w-3 mr-2" />
            <span className="text-sm">Draw</span>
            {creatorPredictionType === 'draw' && (
              <Badge variant="secondary" className="ml-auto text-xs">Creator</Badge>
            )}
          </Button>
          
          <Button
            variant={prediction === 'away_win' ? 'default' : 'outline'}
            className={`w-full justify-start h-9 ${creatorPredictionType === 'away_win' ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => creatorPredictionType !== 'away_win' && setPrediction('away_win')}
            disabled={creatorPredictionType === 'away_win'}
          >
            <Target className="h-3 w-3 mr-2" />
            <span className="text-sm">{challenge.match?.away_team.name}</span>
            {creatorPredictionType === 'away_win' && (
              <Badge variant="secondary" className="ml-auto text-xs">Creator</Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Stake Amount - Compact */}
      <div>
        <Label htmlFor="stake" className="text-sm">Your Stake Amount</Label>
        <Input
          id="stake"
          type="number"
          placeholder={`Min ${formatCurrency(challenge.min_opponent_amount, currency)}`}
          value={stakeAmount}
          onChange={(e) => setStakeAmount(e.target.value)}
          min={challenge.min_opponent_amount}
          step="0.01"
          className={`h-9 ${stakeAmount && parseFloat(stakeAmount) < challenge.min_opponent_amount ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
        />
        <div className="flex justify-between items-center mt-1">
          <p className="text-xs text-muted-foreground">
            Min: {formatCurrency(challenge.min_opponent_amount, currency)}
          </p>
          {stakeAmount && parseFloat(stakeAmount) < challenge.min_opponent_amount && (
            <p className="text-xs text-red-500 font-medium">
              Amount too low
            </p>
          )}
        </div>
      </div>

      {/* Quick Amount Buttons - Compact */}
      <div className="grid grid-cols-4 gap-1">
        {[10, 25, 50, 100].map((quickAmount) => {
          const isDisabled = (wallet?.balance || 0) < quickAmount || quickAmount < challenge.min_opponent_amount
          const isBelowMinimum = quickAmount < challenge.min_opponent_amount
          
          return (
            <Button
              key={quickAmount}
              variant="outline"
              size="sm"
              className={`h-7 text-xs ${isDisabled ? 'opacity-50' : ''} ${isBelowMinimum ? 'border-red-200 text-red-400' : ''}`}
              onClick={() => setStakeAmount(quickAmount.toString())}
              disabled={isDisabled}
              title={isBelowMinimum ? `Below minimum of ${formatCurrency(challenge.min_opponent_amount, currency)}` : ''}
            >
              {quickAmount} CR
            </Button>
          )
        })}
      </div>

      <div className="space-y-2">
        <Button 
          onClick={onAccept} 
          disabled={isLoading || !stakeAmount || parseFloat(stakeAmount) < challenge.min_opponent_amount}
          className="w-full h-9"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              Accepting...
            </>
          ) : (
            <>
              <CheckCircle className="h-3 w-3 mr-2" />
              Accept Challenge
            </>
          )}
        </Button>
        
        {/* Validation message for disabled button */}
        {!isLoading && (!stakeAmount || parseFloat(stakeAmount) < challenge.min_opponent_amount) && (
          <p className="text-xs text-red-500 text-center">
            {!stakeAmount 
              ? "Please enter a stake amount" 
              : `Minimum stake is ${formatCurrency(challenge.min_opponent_amount, currency)}`
            }
          </p>
        )}
      </div>
    </div>
  )
}

// Reject Challenge Form Component
interface RejectChallengeFormProps {
  challenge: Challenge
  onReject: () => void
  isLoading: boolean
}

function RejectChallengeForm({ challenge, onReject, isLoading }: RejectChallengeFormProps) {
  const isPublicChallenge = isPublicEvent(challenge)
  const originLabel = getBetOriginLabel(challenge, PUBLIC_EVENT_LABEL)

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 p-4 border border-red-200 rounded-lg bg-red-50">
        <AlertTriangle className="h-6 w-6 text-red-600" />
        <div>
          <div className="font-medium text-red-900">Reject Challenge</div>
          <div className="text-sm text-red-700">
            Are you sure you want to reject {isPublicChallenge ? 'this public event?' : `this challenge from ${originLabel}?`}
          </div>
        </div>
      </div>

      {challenge.match && (
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  {challenge.match.home_team.cloudinary_logo_url || challenge.match.home_team.logo_url ? (
                    <img 
                      src={challenge.match.home_team.cloudinary_logo_url || challenge.match.home_team.logo_url || ''} 
                      alt="" 
                      className="h-6 w-6 mr-2 rounded-full object-cover" 
                    />
                  ) : (
                    <div className="h-6 w-6 mr-2 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {challenge.match.home_team.name?.slice(0, 1).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="font-medium">{challenge.match.home_team.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">vs</span>
                <div className="flex items-center">
                  {challenge.match.away_team.cloudinary_logo_url || challenge.match.away_team.logo_url ? (
                    <img 
                      src={challenge.match.away_team.cloudinary_logo_url || challenge.match.away_team.logo_url || ''} 
                      alt="" 
                      className="h-6 w-6 mr-2 rounded-full object-cover" 
                    />
                  ) : (
                    <div className="h-6 w-6 mr-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {challenge.match.away_team.name?.slice(0, 1).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="font-medium">{challenge.match.away_team.name}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => {}}>
          Cancel
        </Button>
        <Button 
          variant="destructive" 
          className="flex-1"
          onClick={onReject}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Rejecting...
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// Cancel Challenge Form Component
interface CancelChallengeFormProps {
  challenge: Challenge
  onCancel: () => void
  isLoading: boolean
}

function CancelChallengeForm({ challenge, onCancel, isLoading }: CancelChallengeFormProps) {
  const { user, wallet } = useAuthStore()
  const userPrediction = challenge.bet_predictions?.find(p => p.user_id === user?.id)
  const currency = wallet?.currency || 'CREDORR'

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 p-4 border border-red-200 rounded-lg bg-red-50">
        <AlertTriangle className="h-6 w-6 text-red-600" />
        <div>
          <div className="font-medium text-red-900">Cancel Challenge</div>
          <div className="text-sm text-red-700">
            Are you sure you want to cancel this challenge? {challenge.status === 'accepted' ? 'All stakes will be refunded to participants.' : 'This action cannot be undone.'}
          </div>
        </div>
      </div>

      {challenge.match && (
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  {challenge.match.home_team.cloudinary_logo_url || challenge.match.home_team.logo_url ? (
                    <img 
                      src={challenge.match.home_team.cloudinary_logo_url || challenge.match.home_team.logo_url || ''} 
                      alt="" 
                      className="h-6 w-6 mr-2 rounded-full object-cover" 
                    />
                  ) : (
                    <div className="h-6 w-6 mr-2 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {challenge.match.home_team.name?.slice(0, 1).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="font-medium">{challenge.match.home_team.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">vs</span>
                <div className="flex items-center">
                  {challenge.match.away_team.cloudinary_logo_url || challenge.match.away_team.logo_url ? (
                    <img 
                      src={challenge.match.away_team.cloudinary_logo_url || challenge.match.away_team.logo_url || ''} 
                      alt="" 
                      className="h-6 w-6 mr-2 rounded-full object-cover" 
                    />
                  ) : (
                    <div className="h-6 w-6 mr-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {challenge.match.away_team.name?.slice(0, 1).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="font-medium">{challenge.match.away_team.name}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {userPrediction && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-muted-foreground">Your Stake</div>
          <div className="font-medium">{getAmountDisplay(userPrediction, currency)}</div>
          <div className="text-xs text-green-600">Will be refunded</div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => {}}>
          Keep Challenge
        </Button>
        <Button 
          variant="destructive" 
          className="flex-1"
          onClick={onCancel}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Cancelling...
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Challenge
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// Leave Challenge Form Component
interface LeaveChallengeFormProps {
  challenge: Challenge
  onLeave: () => void
  isLoading: boolean
}

function LeaveChallengeForm({ challenge, onLeave, isLoading }: LeaveChallengeFormProps) {
  const { user, wallet } = useAuthStore()
  const userPrediction = challenge.bet_predictions?.find(p => p.user_id === user?.id)
  const currency = wallet?.currency || 'CREDORR'

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 p-4 border border-red-200 rounded-lg bg-red-50">
        <AlertTriangle className="h-6 w-6 text-red-600" />
        <div>
          <div className="font-medium text-red-900">Leave Challenge</div>
          <div className="text-sm text-red-700">
            Are you sure you want to leave this challenge? Your stake will be refunded.
          </div>
        </div>
      </div>

      {userPrediction && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-muted-foreground">Your Current Stake</div>
          <div className="font-medium">{getAmountDisplay(userPrediction, currency)}</div>
          <div className="text-xs text-green-600">Will be refunded</div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => {}}>
          Cancel
        </Button>
        <Button 
          variant="destructive" 
          className="flex-1"
          onClick={onLeave}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Leaving...
            </>
          ) : (
            <>
              <LogOut className="h-4 w-4 mr-2" />
              Leave Challenge
            </>
          )}
        </Button>
      </div>
    </div>
  )
}