'use client'

import { useState, useMemo, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { useBetDetailsQuery } from '@/hooks/queries/use-bet-details'
import type { BetPredictionWithPrivacy } from '@/types/bets'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Calendar,
  Wallet,
  Trophy,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Ban,
  Users,
  TrendingUp,
  Eye,
  Share2,
  ChevronDown,
  ChevronUp,
  LogOut,
  Loader2,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  getAmountDisplay,
  getBetOriginLabel,
  getPredictionDisplay,
  isPublicEvent,
  PUBLIC_EVENT_LABEL,
} from '@/lib/bet-display'
import { supabase } from '@/lib/supabase'
import type { PredictionType } from '@/types/bets'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useJoinBetMutation, useRejectBetMutation, useCancelBetMutation, useLeaveBetMutation } from '@/hooks/mutations'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

interface BetWithDetails {
  id: string
  creator_id: string
  opponent_id: string | null
  match_id: string
  min_opponent_amount: number
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'settled'
  max_participants: number
  is_system_generated?: boolean
  created_at: string
  updated_at: string
  settled_at: string | null
  matches?: {
    home_team_id: string
    away_team_id: string
    start_time: string
    status: string
    match_result: string | null
    home_score: number | null
    away_score: number | null
    competition: string | null
    home_team?: {
      name: string
      logo_url: string | null
      cloudinary_logo_url?: string | null
    }
    away_team?: {
      name: string
      logo_url: string | null
      cloudinary_logo_url?: string | null
    }
    sport?: {
      id: string
      name: string
    }
  }
  creator?: {
    username: string
    avatar_url: string | null
  }
  opponent?: {
    username: string
    avatar_url: string | null
  }
  bet_predictions?: BetPredictionWithPrivacy[]
}

export default function ChallengeDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const betId = params?.betId as string

  const [showParticipants, setShowParticipants] = useState(false)
  const [predictionFilter, setPredictionFilter] = useState<PredictionType | 'all'>('all')
  const [participantsWithDetails, setParticipantsWithDetails] = useState<
    Array<{
      user_id: string
      username: string
      avatar_url: string | null
      prediction: PredictionType | null
      amount: number | null
      isPredictionHidden?: boolean
      isAmountHidden?: boolean
    }>
  >([])
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false)
  const [participantCount, setParticipantCount] = useState(0)
  const [showAcceptDialog, setShowAcceptDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [stakeAmount, setStakeAmount] = useState('')
  const [prediction, setPrediction] = useState<PredictionType>('home_win')

  const { user, wallet } = useAuthStore()
  const currency = wallet?.currency || 'CREDORR'
  const queryClient = useQueryClient()

  // Mutation hooks
  const joinBetMutation = useJoinBetMutation()
  const rejectBetMutation = useRejectBetMutation()
  const cancelBetMutation = useCancelBetMutation()
  const leaveBetMutation = useLeaveBetMutation()

  // Fetch bet details (RLS will determine access)
  const { data: betData, isLoading, error: queryError } = useBetDetailsQuery(betId)

  const bet: BetWithDetails | null = useMemo(
    () =>
      betData
        ? ({
            ...betData,
            matches: betData.matches,
            creator: betData.creator,
            opponent: betData.opponent,
            bet_predictions: betData.bet_predictions,
          } as BetWithDetails)
        : null,
    [betData],
  )

  const baseError =
    queryError && !bet
      ? 'Failed to load bet details'
      : !isLoading && !bet
      ? 'Bet not found or you do not have access to view this bet.'
      : null

  const isPublic = bet ? isPublicEvent(bet) : false
  // User is a participant only if they have actually placed a prediction
  // For private bets, being opponent_id doesn't make you a participant until you accept
  const isParticipant =
    !!bet &&
    !!user &&
    (bet.creator_id === user.id ||
      !!bet.bet_predictions?.some((p) => p.user_id === user.id))
  
  // Check if user has access to view this bet
  // For private bets: must be creator, opponent, or participant
  // For public bets: anyone can view
  const hasAccess = !!bet && (
    isPublic ||
    bet.creator_id === user?.id ||
    bet.opponent_id === user?.id ||
    isParticipant
  )

  // Whether the viewer can see full, interactive details (participants, predictions, etc.)
  const canSeeFullDetails = !!bet && (isParticipant || isPublic)

  const getBetStatusIcon = (status: string) => {
    switch (status) {
      case 'settled':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'cancelled':
      case 'rejected':
        return <Ban className="h-5 w-5 text-red-500" />
      case 'pending':
      case 'accepted':
        return <Clock className="h-5 w-5 text-yellow-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getBetStatusColor = (status: string) => {
    switch (status) {
      case 'settled':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'accepted':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getBetResult = () => {
    if (!bet || !user || bet.status !== 'settled' || !bet.matches?.match_result) {
      return null
    }

    const userPrediction = bet.bet_predictions?.find((p) => p.user_id === user.id)?.prediction
    const opponentPrediction = bet.bet_predictions?.find((pred) => pred.user_id !== user.id)?.prediction

    if (!userPrediction) return null

    const userCorrect = userPrediction === bet.matches.match_result
    const opponentCorrect = opponentPrediction === bet.matches.match_result

    if (userCorrect && !opponentCorrect) return 'win'
    if (userCorrect && opponentCorrect) return 'both_win'
    if (!userCorrect && opponentCorrect) return 'lose'
    if (!userCorrect && !opponentCorrect) return 'draw'
    return null
  }

  const getBetRole = () => {
    if (!bet || !user) return 'Viewer'
    if (bet.creator_id === user.id) return 'Creator'
    if (bet.opponent_id === user.id) return 'Opponent'
    if (bet.bet_predictions?.some((p) => p.user_id === user.id)) return 'Participant'
    return 'Viewer'
  }

  const getTotalStake = () => {
    if (!bet?.bet_predictions || bet.bet_predictions.length === 0) {
      return bet?.min_opponent_amount || 0
    }
    return bet.bet_predictions.reduce((sum, p) => sum + (p.amount ?? 0), 0)
  }

  // Participant / prediction helpers
  const publicEvent = bet ? isPublic : false
  
  // Determine user's role and available actions
  const isCreator = bet?.creator_id === user?.id
  const isOpponent = bet?.opponent_id === user?.id
  const hasPrediction = bet?.bet_predictions?.some((p) => p.user_id === user?.id) ?? false
  const isOneVsOne = bet ? (bet.max_participants === 2 || bet.opponent_id !== null) : false
  
  // Determine available actions
  // For public bets, users can join if status is pending or accepted (and not at max participants)
  // For private bets, users can accept only if status is pending
  const canAccept = !isParticipant &&
    !isCreator &&
    (publicEvent 
      ? ['pending', 'accepted'].includes(bet?.status ?? '') && 
        (bet?.bet_predictions?.length ?? 0) < (bet?.max_participants ?? 0)
      : bet?.status === 'pending' && 
        (bet.opponent_id === null || bet.opponent_id === user?.id))
  
  const canReject = !publicEvent &&
    !isParticipant &&
    !isCreator &&
    bet?.status === 'pending' &&
    (bet.opponent_id === null || bet.opponent_id === user?.id)
  
  const canCancel = isParticipant && (isOneVsOne
    ? (isCreator ? ['pending', 'accepted'].includes(bet?.status ?? '') : bet?.status === 'accepted')
    : (isCreator && bet?.status === 'pending'))
  
  const canLeave = isParticipant && (
    publicEvent
      ? ['pending', 'accepted'].includes(bet?.status ?? '')
      : (!isOneVsOne && bet?.status === 'accepted')
  )
  
  // Get user and opponent predictions early
  const userPrediction = bet?.bet_predictions?.find((p) => p.user_id === user?.id)
  // For unaccepted bets, show creator's prediction to the opponent
  // For accepted bets, show the other participant's prediction
  const creatorPrediction = bet?.bet_predictions?.find((p) => p.user_id === bet?.creator_id)
  const otherParticipantPrediction = bet?.bet_predictions?.find((pred) => pred.user_id !== user?.id)
  
  // Determine which prediction to show as "opponent"
  // If user is opponent and hasn't accepted: show creator's prediction
  // If user is participant: show the other participant's prediction
  const opponentPrediction = useMemo(() => {
    if (!bet || !user) return null
    
    // If user is the opponent and hasn't accepted, show creator's prediction
    if (bet.opponent_id === user.id && !userPrediction && creatorPrediction) {
      return creatorPrediction
    }
    
    // Otherwise show the other participant's prediction
    return otherParticipantPrediction
  }, [bet, user, userPrediction, creatorPrediction, otherParticipantPrediction])
  
  // For 1v1 bets, ensure opponent's prediction and stake are visible if user is a participant or is the opponent
  const isOneVsOneParticipant = isOneVsOne && isParticipant
  const isOpponentNotAccepted = isOneVsOne && bet?.opponent_id === user?.id && !userPrediction
  const opponentPredictionForDisplay = useMemo(() => {
    if (!bet || !opponentPrediction) return null
    
    // For 1v1 bets where user is a participant or is the opponent (even if not accepted), bypass privacy settings
    if (isOneVsOneParticipant || isOpponentNotAccepted) {
      return {
        ...opponentPrediction,
        isPredictionHidden: false,
        isAmountHidden: false,
      }
    }
    
    return opponentPrediction
  }, [bet, opponentPrediction, isOneVsOneParticipant, isOpponentNotAccepted])
  
  const opponentPredictionDisplay = getPredictionDisplay(opponentPredictionForDisplay, bet?.matches, 'No prediction')
  const opponentAmountDisplay = getAmountDisplay(opponentPredictionForDisplay, currency)
  
  // Get default prediction (opposite of creator's prediction)
  const getDefaultPrediction = (): PredictionType => {
    if (!bet) return 'home_win'
    const creatorPredictionValue = bet.bet_predictions?.find(p => p.user_id === bet.creator_id)?.prediction
    if (creatorPredictionValue === 'home_win') return 'away_win'
    if (creatorPredictionValue === 'away_win') return 'home_win'
    if (creatorPredictionValue === 'draw') return 'home_win'
    return 'home_win'
  }
  
  // Initialize stake amount and prediction when bet loads
  useEffect(() => {
    if (bet && !stakeAmount) {
      setStakeAmount(bet.min_opponent_amount.toString())
      setPrediction(getDefaultPrediction())
    }
  }, [bet, stakeAmount])
  
  // For private bets, if user doesn't have access, redirect them
  useEffect(() => {
    if (!isLoading && bet && !hasAccess) {
      router.replace('/home')
    }
  }, [isLoading, bet, hasAccess, router])
  
  // Load participant details for public bets
  useEffect(() => {
    const loadParticipantDetails = async () => {
      if (!bet?.bet_predictions || bet.bet_predictions.length === 0 || !publicEvent) {
        setParticipantsWithDetails([])
        setParticipantCount(bet?.bet_predictions?.length ?? 0)
        return
      }

      setIsLoadingParticipants(true)
      try {
        const userIds = bet.bet_predictions.map(p => p.user_id)
        
        // Fetch user details for all participants
        const { data: userData, error } = await supabase
          .from('users')
          .select('id, username, avatar_url')
          .in('id', userIds)

        if (error) {
          console.error('Error fetching participant details:', error)
          setParticipantsWithDetails([])
          setParticipantCount(bet?.bet_predictions?.length ?? 0)
          return
        }

        // Map predictions with user details
        const participants = bet.bet_predictions.map(prediction => {
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
        setParticipantCount(participants.length)
      } catch (error) {
        console.error('Error loading participant details:', error)
        setParticipantsWithDetails([])
        setParticipantCount(bet?.bet_predictions?.length ?? 0)
      } finally {
        setIsLoadingParticipants(false)
      }
    }

    if (publicEvent && bet?.bet_predictions) {
      loadParticipantDetails()
    }
  }, [bet, publicEvent])

  const betResult = getBetResult()
  const originLabel = getBetOriginLabel(bet, PUBLIC_EVENT_LABEL)
  const matchResultPrediction =
    bet && bet.matches && bet.matches.match_result
      ? ({
          user_id: 'result',
          prediction: bet.matches.match_result as BetPredictionWithPrivacy['prediction'],
          amount: null,
        } as BetPredictionWithPrivacy)
      : undefined
  const matchResultLabel = getPredictionDisplay(matchResultPrediction, bet?.matches, 'Unknown result')
  const userPredictionDisplay = getPredictionDisplay(userPrediction, bet?.matches, 'No prediction')
  const userAmountDisplay = getAmountDisplay(userPrediction, currency)
  const opponentName =
    bet?.creator_id === user?.id ? bet?.opponent?.username || 'Waiting for opponent' : originLabel
  
  // Handler functions
  const handleAcceptChallenge = async () => {
    if (!bet) return
    
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast.error('Please enter a valid stake amount')
      return
    }

    if (parseFloat(stakeAmount) < bet.min_opponent_amount) {
      toast.error(`Minimum stake is ${formatCurrency(bet.min_opponent_amount, currency)}`)
      return
    }

    if (parseFloat(stakeAmount) > (wallet?.balance || 0)) {
      toast.error(`Insufficient balance. You have ${formatCurrency(wallet?.balance || 0, currency)} available`)
      return
    }

    const creatorPrediction = bet.bet_predictions?.find(p => p.user_id === bet.creator_id)?.prediction
    if (prediction === creatorPrediction) {
      toast.error('You cannot choose the same prediction as the challenge creator')
      return
    }

    const progressToast = toast.loading('Accepting challenge...')
    
    joinBetMutation.mutate(
      {
        betId: bet.id,
        amount: parseFloat(stakeAmount),
        prediction,
      },
      {
        onSuccess: () => {
          toast.dismiss(progressToast)
          toast.success(`Challenge accepted! You staked ${formatCurrency(parseFloat(stakeAmount), currency)}`, {
            duration: 5000
          })
          setShowAcceptDialog(false)
          queryClient.invalidateQueries({ queryKey: ['bet-details', betId] })
        },
        onError: (error) => {
          toast.dismiss(progressToast)
          console.error('Error accepting challenge:', error)
          if (error instanceof Error) {
            toast.error(`Failed to accept challenge: ${error.message}`)
          } else {
            toast.error('Failed to accept challenge. Please try again.')
          }
        },
      }
    )
  }

  const handleRejectChallenge = () => {
    if (!bet) return
    const progressToast = toast.loading('Rejecting challenge...')
    
    rejectBetMutation.mutate(
      { betId: bet.id },
      {
        onSuccess: () => {
          toast.dismiss(progressToast)
          toast.success('Challenge rejected.', { duration: 4000 })
          setShowRejectDialog(false)
          queryClient.invalidateQueries({ queryKey: ['bet-details', betId] })
        },
        onError: (error) => {
          toast.dismiss(progressToast)
          console.error('Error rejecting challenge:', error)
          if (error instanceof Error) {
            toast.error(`Failed to reject challenge: ${error.message}`)
          } else {
            toast.error('Failed to reject challenge. Please try again.')
          }
        },
      }
    )
  }

  const handleCancelChallenge = () => {
    if (!bet) return
    const progressToast = toast.loading('Cancelling challenge...')
    
    const userPrediction = bet.bet_predictions?.find(p => p.user_id === user?.id)
    const refundAmount = userPrediction?.amount || 0
    
    cancelBetMutation.mutate(
      { betId: bet.id },
      {
        onSuccess: () => {
          toast.dismiss(progressToast)
          toast.success(`Challenge cancelled successfully! ${refundAmount > 0 ? `${formatCurrency(refundAmount, currency)} has been refunded to your wallet.` : ''}`, {
            duration: 5000
          })
          setShowCancelDialog(false)
          queryClient.invalidateQueries({ queryKey: ['bet-details', betId] })
        },
        onError: (error) => {
          toast.dismiss(progressToast)
          console.error('Error canceling challenge:', error)
          if (error instanceof Error) {
            toast.error(`Failed to cancel challenge: ${error.message}`)
          } else {
            toast.error('Failed to cancel challenge. Please try again.')
          }
        },
      }
    )
  }

  const handleLeaveChallenge = () => {
    if (!bet) return
    const progressToast = toast.loading('Leaving challenge...')
    
    leaveBetMutation.mutate(
      { betId: bet.id },
      {
        onSuccess: () => {
          toast.dismiss(progressToast)
          toast.success('You have left the challenge.', { duration: 4000 })
          setShowLeaveDialog(false)
          queryClient.invalidateQueries({ queryKey: ['bet-details', betId] })
        },
        onError: (error) => {
          toast.dismiss(progressToast)
          console.error('Error leaving challenge:', error)
          if (error instanceof Error) {
            toast.error(`Failed to leave challenge: ${error.message}`)
          } else {
            toast.error('Failed to leave challenge. Please try again.')
          }
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="p-4 md:pg-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (baseError || !bet) {
    return (
      <div className="p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push('/home')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb1">{baseError ?? 'Bet not found'}</h3>
              <p className="text-gray-600 text-center mb-4">
                The bet you are trying to view either does not exist or you do not have permission to access it.
              </p>
              <Button onClick={() => router.push('/home')}>Go to Home</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  
  // Show loading while checking access
  if (!hasAccess) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
        {/* Left column: match banner, info, details */}
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="flex items-center space-x-2">
              <Badge
                variant="secondary"
                className={getBetStatusColor(bet.status)}
              >
                {getBetStatusIcon(bet.status)}
                <span className="ml-1 capitalize">{bet.status}</span>
              </Badge>
              <span className="text-xs text-gray-500 font-mono">#{bet.id.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>

          {/* Important information banner */}
          <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-900">
            <span className="font-semibold">Important information: </span>
            <span>
              The following event is based on the outcome after 90 minutes plus stoppage time. This does not include extra time or penalties.
            </span>
          </div>

          {/* Bet Summary Card */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Bet Details</CardTitle>
                  <p className="text-blue-100 mt-1">Created on {formatDate(bet.created_at)}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{formatCurrency(getTotalStake(), currency)}</div>
                  <p className="text-blue-100 text-sm">Total Stake</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {/* Match Information */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm font-semibold text-gray-800">
                      {bet.matches?.competition || bet.matches?.sport?.name || 'Match'}
                    </span>
                  </div>
                  {publicEvent && (
                    <Badge variant="outline" className="text-xs">
                      Public Bet
                    </Badge>
                  )}
                </div>

                {/* Team Matchup */}
                <div className="bg-gray-50 rounded-lg p-6 mb-4">
                  <div className="flex items-center justify-between">
                    {/* Home Team */}
                    <div className="flex items-center space-x-4 flex-1">
                      {bet.matches?.home_team?.cloudinary_logo_url || bet.matches?.home_team?.logo_url ? (
                        <img
                          src={bet.matches.home_team.cloudinary_logo_url || bet.matches.home_team.logo_url || ''}
                          alt={`${bet.matches.home_team.name} logo`}
                          className="w-16 h-16 rounded-full object-cover shadow-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-white text-sm font-bold">
                            {bet.matches?.home_team?.name?.slice(0, 3).toUpperCase() || 'HT'}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-lg font-semibold text-gray-900">
                          {bet.matches?.home_team?.name || 'Home Team'}
                        </p>
                        <p className="text-sm text-gray-500">Home</p>
                        {bet.matches?.home_score !== null && bet.matches?.home_score !== undefined && (
                          <p className="text-2xl font-bold text-gray-900 mt-1">{bet.matches.home_score}</p>
                        )}
                      </div>
                    </div>

                    {/* VS Separator */}
                    <div className="flex flex-col items-center mx-6">
                      <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white text-sm font-bold">VS</span>
                      </div>
                      <span className="text-sm text-gray-500 mt-2 text-center">
                        {bet.matches?.start_time ? formatDate(bet.matches.start_time) : 'TBD'}
                      </span>
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center space-x-4 flex-1 justify-end">
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          {bet.matches?.away_team?.name || 'Away Team'}
                        </p>
                        <p className="text-sm text-gray-500">Away</p>
                        {bet.matches?.away_score !== null && bet.matches?.away_score !== undefined && (
                          <p className="text-2xl font-bold text-gray-900 mt-1">{bet.matches.away_score}</p>
                        )}
                      </div>
                      {bet.matches?.away_team?.cloudinary_logo_url || bet.matches?.away_team?.logo_url ? (
                        <img
                          src={bet.matches.away_team.cloudinary_logo_url || bet.matches.away_team.logo_url || ''}
                          alt={`${bet.matches.away_team.name} logo`}
                          className="w-16 h-16 rounded-full object-cover shadow-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-white text-sm font-bold">
                            {bet.matches?.away_team?.name?.slice(0, 3).toUpperCase() || 'AT'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Match Result */}
                {bet.status === 'settled' && bet.matches?.match_result && (
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Trophy className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-gray-900">Match Result</span>
                      </div>
                      <Badge variant="outline" className="bg-white text-blue-700 border-blue-200">
                        {matchResultLabel}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-6" />

              {/* Participants & Predictions - private bets only */}
              {!publicEvent && canSeeFullDetails && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Participants & Predictions</h3>
                  {/* For brevity, reuse the same participant / prediction UI from the history page here. */}
                  {/* ... existing participants UI from history page ... */}
                </div>
              )}

              {/* Outcome Summary (if user is a participant or is the opponent viewing an unaccepted bet) */}
              {(isParticipant || (bet.opponent_id === user?.id && !userPrediction)) && (
                <>
                  <Separator className="my-6" />
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Position</h3>
                    <div className={`grid gap-4 ${publicEvent ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                      <Card className="border border-gray-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center justify-between text-sm font-medium">
                            <span>Your Prediction</span>
                            {betResult && (
                              <Badge
                                variant={betResult === 'win' ? 'default' : betResult === 'lose' ? 'destructive' : 'outline'}
                              >
                                {betResult === 'win' && 'You Won'}
                                {betResult === 'lose' && 'You Lost'}
                                {betResult === 'draw' && 'Draw'}
                                {betResult === 'both_win' && 'All Winners'}
                              </Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <p className="text-sm text-gray-600">
                            Outcome: <span className="font-semibold">{userPredictionDisplay}</span>
                          </p>
                          <p className="text-sm text-gray-600">
                            Stake: <span className="font-semibold">{userAmountDisplay}</span>
                          </p>
                        </CardContent>
                      </Card>

                      {/* Only show Opponent / Market card for private bets */}
                      {!publicEvent && (
                        <Card className="border border-gray-200">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Opponent / Market</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <p className="text-sm text-gray-600">
                              Counterparty:{' '}
                              <span className="font-semibold">
                                {opponentName || 'Unknown'}
                              </span>
                            </p>
                            <p className="text-sm text-gray-600">
                              Their prediction:{' '}
                              <span className="font-semibold">{opponentPredictionDisplay}</span>
                            </p>
                            <p className="text-sm text-gray-600">
                              Their stake: <span className="font-semibold">{opponentAmountDisplay}</span>
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Participant Activity Breakdown (for public bets) */}
              {publicEvent && bet.bet_predictions && bet.bet_predictions.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Participant Activity</h3>
                    {isLoadingParticipants ? (
                      <div className="text-center text-muted-foreground py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-sm">Loading participants...</p>
                      </div>
                    ) : participantsWithDetails.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <p className="text-sm">No participants yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {participantsWithDetails.map((participant) => (
                          <Card key={participant.user_id} className="border border-gray-200">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 flex-1">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={participant.avatar_url || ''} />
                                    <AvatarFallback>
                                      {participant.username.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm">
                                      {participant.username}
                                      {participant.user_id === bet.creator_id && (
                                        <Badge variant="outline" className="ml-2 text-xs">Creator</Badge>
                                      )}
                                    </p>
                                    <div className="flex items-center space-x-3 text-xs text-gray-600 mt-1">
                                      <span>
                                        Prediction: <span className="font-semibold">
                                        {participant.isPredictionHidden 
                                          ? 'Hidden' 
                                          : getPredictionDisplay(participant as any, bet?.matches, 'Not set')}
                                        </span>
                                      </span>
                                      <span>•</span>
                                      <span>
                                        Stake: <span className="font-semibold">
                                          {participant.isAmountHidden 
                                            ? 'Hidden' 
                                            : getAmountDisplay(participant as any, currency, '—')}
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Meta / Sharing */}
              <Separator className="my-6" />
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 text-sm text-gray-500">
                  <Users className="h-4 w-4" />
                  <span>
                    {bet.bet_predictions?.length ?? 0} participant{(bet.bet_predictions?.length ?? 0) === 1 ? '' : 's'}
                  </span>
                  {publicEvent && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center space-x-1">
                        <TrendingUp className="h-4 w-4" />
                        <span>Public challenge</span>
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href).catch(() => {
                        // no-op, best-effort
                      })
                    }}
                  >
                    <Share2 className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: interaction panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trade Panel</CardTitle>
              <p className="text-xs text-gray-500">
                Manage your position in this challenge.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Status</span>
                <Badge className={getBetStatusColor(bet.status)}>
                  <span className="capitalize">{bet.status}</span>
                </Badge>
              </div>

              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Your prediction</span>
                  <span className="font-semibold">{userPredictionDisplay}</span>
                </div>
                <div className="flex justify-between">
                  <span>Your stake</span>
                  <span className="font-semibold">{userAmountDisplay}</span>
                </div>
              </div>

              {bet.status !== 'settled' && bet.status !== 'cancelled' && bet.status !== 'rejected' && (
                <div className="flex flex-col gap-2">
                  {canAccept && (
                    <Button
                      onClick={() => setShowAcceptDialog(true)}
                      className="w-full justify-center"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      {publicEvent ? 'Join Bet' : 'Accept Challenge'}
                    </Button>
                  )}
                  {canReject && (
                    <Button
                      variant="outline"
                      onClick={() => setShowRejectDialog(true)}
                      className="w-full justify-center"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      variant="destructive"
                      onClick={() => setShowCancelDialog(true)}
                      className="w-full justify-center"
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  )}
                  {canLeave && (
                    <Button
                      variant="outline"
                      onClick={() => setShowLeaveDialog(true)}
                      className="w-full justify-center"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Leave
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Accept/Join Challenge Dialog */}
      <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{publicEvent ? 'Join Bet' : 'Accept Challenge'}</DialogTitle>
            <DialogDescription>
              {publicEvent 
                ? 'Enter your stake amount and select your prediction. You must choose a different outcome than the creator.'
                : 'Enter your stake amount and select your prediction. You must choose a different outcome than the creator.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="stake">Stake Amount ({currency})</Label>
              <Input
                id="stake"
                type="number"
                min={bet?.min_opponent_amount}
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder={`Minimum: ${formatCurrency(bet?.min_opponent_amount || 0, currency)}`}
              />
            </div>
            <div>
              <Label htmlFor="prediction">Your Prediction</Label>
              <select
                id="prediction"
                value={prediction}
                onChange={(e) => setPrediction(e.target.value as PredictionType)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option 
                  value="home_win" 
                  disabled={creatorPrediction?.prediction === 'home_win'}
                  style={creatorPrediction?.prediction === 'home_win' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  {bet?.matches?.home_team?.name || 'Home Team'} Win
                  {creatorPrediction?.prediction === 'home_win' && ' (Creator\'s choice)'}
                </option>
                <option 
                  value="away_win" 
                  disabled={creatorPrediction?.prediction === 'away_win'}
                  style={creatorPrediction?.prediction === 'away_win' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  {bet?.matches?.away_team?.name || 'Away Team'} Win
                  {creatorPrediction?.prediction === 'away_win' && ' (Creator\'s choice)'}
                </option>
                <option 
                  value="draw" 
                  disabled={creatorPrediction?.prediction === 'draw'}
                  style={creatorPrediction?.prediction === 'draw' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  Draw
                  {creatorPrediction?.prediction === 'draw' && ' (Creator\'s choice)'}
                </option>
              </select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAcceptDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAcceptChallenge}
                disabled={joinBetMutation.isPending}
              >
                {joinBetMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  publicEvent ? 'Join Bet' : 'Accept Challenge'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Challenge Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Challenge</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this challenge? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectChallenge}
              disabled={rejectBetMutation.isPending}
            >
              {rejectBetMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Challenge Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Challenge</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this challenge? Your stake will be refunded to your wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              No, Keep It
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelChallenge}
              disabled={cancelBetMutation.isPending}
            >
              {cancelBetMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Challenge Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Challenge</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave this challenge? Your stake will be refunded to your wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>
              Stay
            </Button>
            <Button
              variant="destructive"
              onClick={handleLeaveChallenge}
              disabled={leaveBetMutation.isPending}
            >
              {leaveBetMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Leaving...
                </>
              ) : (
                'Leave'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


