'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore, useBettingStore } from '@/lib/store'
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
  Share2
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getAmountDisplay, getBetOriginLabel, getPredictionDisplay, isPublicEvent, PUBLIC_EVENT_LABEL } from '@/lib/bet-display'

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

export default function BetDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const betId = params?.betId as string
  
  const [bet, setBet] = useState<BetWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { user, wallet } = useAuthStore()
  const currency = wallet?.currency || 'CREDORR'
  const { betHistory, refreshBets } = useBettingStore()

  useEffect(() => {
    const loadBetDetails = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // First try to find the bet in our cached history
        if (betHistory && betHistory.length > 0) {
          const foundBet = betHistory.find(b => b.id === betId)
          if (foundBet) {
            setBet(foundBet)
            setIsLoading(false)
            return
          }
        }

        // If not found in cache, refresh bets and try again
        await refreshBets()
        
        // Check again after refresh
        if (betHistory) {
          const foundBet = betHistory.find(b => b.id === betId)
          if (foundBet) {
            setBet(foundBet)
          } else {
            setError('Bet not found')
          }
        }
      } catch (err) {
        console.error('Error loading bet details:', err)
        setError('Failed to load bet details')
      } finally {
        setIsLoading(false)
      }
    }

    if (betId && user) {
      loadBetDetails()
    }
  }, [betId, user, betHistory, refreshBets])

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
    if (!bet || bet.status !== 'settled' || !bet.matches?.match_result) {
      return null
    }

    const userPrediction = bet.bet_predictions?.find(p => p.user_id === user?.id)?.prediction
    const opponentPrediction = bet.bet_predictions?.find(pred => pred.user_id !== user?.id)?.prediction
    
    if (!userPrediction) return null

    const userCorrect = userPrediction === bet.matches.match_result
    const opponentCorrect = opponentPrediction === bet.matches.match_result

    if (userCorrect && !opponentCorrect) return 'win'
    if (!userCorrect && opponentCorrect) return 'lose'
    if (!userCorrect && !opponentCorrect) return 'draw'
    return null
  }

  const getBetRole = () => {
    if (!bet || !user) return 'Participant'
    if (bet.creator_id === user.id) return 'Creator'
    if (bet.opponent_id === user.id) return 'Opponent'
    return 'Participant'
  }

  const getTotalStake = () => {
    if (!bet?.bet_predictions || bet.bet_predictions.length === 0) {
      return bet?.min_opponent_amount || 0
    }
    return bet.bet_predictions.reduce((total, prediction) => total + (prediction.amount ?? 0), 0)
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !bet) {
    return (
      <div className="p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to History
          </Button>
          
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {error || 'Bet not found'}
              </h3>
              <p className="text-gray-600 text-center mb-4">
                The bet you're looking for doesn't exist or you don't have access to it.
              </p>
              <Button onClick={() => router.push('/history')}>
                Go to Bet History
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const userPrediction = bet.bet_predictions?.find(p => p.user_id === user?.id)
  const opponentPrediction = bet.bet_predictions?.find(pred => pred.user_id !== user?.id)
  const betResult = getBetResult()
  const originLabel = getBetOriginLabel(bet, PUBLIC_EVENT_LABEL)
  const publicEventBet = isPublicEvent(bet)
  const matchResultPrediction = bet.matches?.match_result
    ? { user_id: 'result', prediction: bet.matches.match_result as BetPredictionWithPrivacy['prediction'], amount: null }
    : undefined
  const matchResultLabel = getPredictionDisplay(matchResultPrediction, bet.matches, 'Unknown result')
  const userPredictionDisplay = getPredictionDisplay(userPrediction, bet.matches, 'No prediction')
  const userAmountDisplay = getAmountDisplay(userPrediction, currency)
  const opponentPredictionDisplay = getPredictionDisplay(opponentPrediction, bet.matches, 'No prediction')
  const opponentAmountDisplay = getAmountDisplay(opponentPrediction, currency)
  const opponentName = bet.creator_id === user?.id
    ? bet.opponent?.username || 'Waiting for opponent'
    : originLabel

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to History
          </Button>
          
          <div className="flex items-center space-x-2">
            <Badge 
              variant="secondary" 
              className={`${getBetStatusColor(bet.status)}`}
            >
              {getBetStatusIcon(bet.status)}
              <span className="ml-1 capitalize">{bet.status}</span>
            </Badge>
            <span className="text-xs text-gray-500 font-mono">
              #{bet.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Bet Summary Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Bet Details</CardTitle>
                <p className="text-blue-100 mt-1">
                  Created on {formatDate(bet.created_at)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {formatCurrency(getTotalStake(), currency)}
                </div>
                <p className="text-blue-100 text-sm">Total Stake</p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* Match Information */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Match Details</h3>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  {bet.matches?.competition || bet.matches?.sport?.name || 'Unknown League'}
                </Badge>
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
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {bet.matches.home_score}
                        </p>
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
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {bet.matches.away_score}
                        </p>
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

            {/* Participants & Predictions */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Participants & Predictions</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Current User */}
                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Avatar className="h-10 w-10 border-2 border-blue-300">
                        <AvatarImage src={user?.avatar_url || ''} />
                        <AvatarFallback className="bg-blue-600 text-white">
                          {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {user?.username} (You)
                        </p>
                        <p className="text-sm text-gray-600">{getBetRole()}</p>
                      </div>
                      {betResult === 'win' && (
                        <Trophy className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Prediction:</span>
                        <Badge variant="outline" className="bg-white">
                          {userPredictionDisplay}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Amount:</span>
                        <span className="font-semibold">
                          {userAmountDisplay}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Opponent */}
                <Card className={`border-2 ${
                  betResult === 'lose' ? 'border-green-200 bg-green-50' : 'border-gray-200'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      {publicEventBet && bet.creator_id !== user?.id ? (
                        <div className="h-10 w-10 border-2 border-gray-300 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-semibold flex items-center justify-center">
                          {PUBLIC_EVENT_LABEL.slice(0, 1)}
                        </div>
                      ) : (
                        <Avatar className="h-10 w-10 border-2 border-gray-300">
                          <AvatarImage src={
                            (bet.creator_id === user?.id ? bet.opponent?.avatar_url : bet.creator?.avatar_url) || ''
                          } />
                          <AvatarFallback className="bg-gray-600 text-white">
                            {opponentName?.charAt(0).toUpperCase() || 'O'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {opponentName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {bet.creator_id === user?.id ? 'Opponent' : (publicEventBet ? PUBLIC_EVENT_LABEL : 'Creator')}
                        </p>
                      </div>
                      {betResult === 'lose' && (
                        <Trophy className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Prediction:</span>
                        <Badge variant="outline" className="bg-white">
                          {opponentPredictionDisplay}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Amount:</span>
                        <span className="font-semibold">
                          {opponentAmountDisplay}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Bet Result */}
            {bet.status === 'settled' && betResult && (
              <div className="mb-6">
                <div className={`rounded-lg p-6 text-center ${
                  betResult === 'win' 
                    ? 'bg-green-50 border border-green-200'
                    : betResult === 'lose'
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <div className="flex items-center justify-center mb-3">
                    {betResult === 'win' ? (
                      <Trophy className="h-8 w-8 text-green-600" />
                    ) : betResult === 'lose' ? (
                      <XCircle className="h-8 w-8 text-red-600" />
                    ) : (
                      <Target className="h-8 w-8 text-yellow-600" />
                    )}
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${
                    betResult === 'win' ? 'text-green-800' :
                    betResult === 'lose' ? 'text-red-800' : 'text-yellow-800'
                  }`}>
                    {betResult === 'win' ? 'You Won!' :
                     betResult === 'lose' ? 'You Lost' : 'Draw'}
                  </h3>
                  <p className={`${
                    betResult === 'win' ? 'text-green-700' :
                    betResult === 'lose' ? 'text-red-700' : 'text-yellow-700'
                  }`}>
                    {betResult === 'win' 
                      ? 'Congratulations! Your prediction was correct.'
                      : betResult === 'lose'
                      ? 'Better luck next time!'
                      : 'Both predictions were incorrect.'
                    }
                  </p>
                  {bet.settled_at && (
                    <p className="text-sm text-gray-600 mt-2">
                      Settled on {formatDate(bet.settled_at)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => router.push('/dashboard/wallet')}
              >
                <Wallet className="h-4 w-4 mr-2" />
                View Wallet
              </Button>
              
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => navigator.share ? navigator.share({
                  title: 'Check out my bet!',
                  text: `I ${betResult === 'win' ? 'won' : betResult === 'lose' ? 'lost' : 'drew'} a bet on ${bet.matches?.home_team?.name} vs ${bet.matches?.away_team?.name}`,
                  url: window.location.href
                }) : navigator.clipboard.writeText(window.location.href)}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              
              {bet.status === 'pending' && (
                <Button className="flex-1 bg-green-600 hover:bg-green-700">
                  <Target className="h-4 w-4 mr-2" />
                  Challenge Again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}