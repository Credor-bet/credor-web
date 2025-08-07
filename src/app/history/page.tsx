'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, useBettingStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Calendar,
  Wallet,
  Trophy,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Ban
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

type FilterType = 'all' | 'upcoming' | 'win' | 'lose' | 'draw'

interface BetWithDetails {
  id: string
  creator_id: string
  opponent_id: string | null
  match_id: string
  min_opponent_amount: number
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'settled'
  max_participants: number
  created_at: string
  updated_at: string
  settled_at: string | null
  // Additional fields we'll fetch
  matches?: {
    home_team_id: string
    away_team_id: string
    start_time: string
    status: string
    match_result: string | null
    home_score: number | null
    away_score: number | null
    home_team?: {
      name: string
      logo_url: string | null
    }
    away_team?: {
      name: string
      logo_url: string | null
    }
  }
  home_team?: {
    name: string
    logo_url: string | null
  }
  away_team?: {
    name: string
    logo_url: string | null
  }
  creator?: {
    username: string
    avatar_url: string | null
  }
  opponent?: {
    username: string
    avatar_url: string | null
  }
  bet_predictions?: Array<{
    user_id: string
    prediction: string
    amount: number
  }>
}

export default function HistoryPage() {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [filteredBets, setFilteredBets] = useState<BetWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user, wallet, refreshWallet } = useAuthStore()
  const { betHistory, activeBets, refreshBets } = useBettingStore()

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // Wait for user to be loaded first
        let attempts = 0
        const maxAttempts = 20 // 10 seconds total
        
        while (attempts < maxAttempts && !user) {
          await new Promise(resolve => setTimeout(resolve, 500))
          attempts++
        }
        
                 if (!user) {
           setIsLoading(false)
           return
         }
        
        
        await Promise.all([
          refreshWallet(),
          refreshBets()
        ])
      } catch (error) {
        console.error('Error loading history data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [refreshWallet, refreshBets, user])

  // Filter bets (robust logic)
  useEffect(() => {
    if (!user) return

    // Combine activeBets and betHistory for a complete view
    const allBets = [...(activeBets || []), ...(betHistory || [])]
    if (allBets.length === 0) return

    let filtered = [...allBets];

    switch (activeFilter) {
      case 'upcoming':
        filtered = filtered.filter(bet => {
          return bet.status === 'pending' || bet.status === 'accepted'
        })
        break
             case 'win':
         filtered = filtered.filter(bet => {
           const userPrediction = bet.bet_predictions?.find(p => p.user_id === user.id)?.prediction
           const userCorrect = userPrediction === bet.matches?.match_result
           
           return bet.status === 'settled' &&
             bet.matches?.match_result &&
             userPrediction &&
             userCorrect
         })
         break
             case 'lose':
         filtered = filtered.filter(bet => {
           const userPrediction = bet.bet_predictions?.find(p => p.user_id === user.id)?.prediction
           const opponentPrediction = bet.bet_predictions?.find(pred => pred.user_id !== user.id)?.prediction
           
           if (bet.status !== 'settled' || !bet.matches?.match_result || !userPrediction) {
             return false
           }
           
           const userCorrect = userPrediction === bet.matches.match_result
           const opponentCorrect = opponentPrediction === bet.matches.match_result
           const isLose = !userCorrect && opponentCorrect
           
           return isLose
         })
         break
       case 'draw':
         filtered = filtered.filter(bet => {
           const userPrediction = bet.bet_predictions?.find(p => p.user_id === user.id)?.prediction
           const opponentPrediction = bet.bet_predictions?.find(pred => pred.user_id !== user.id)?.prediction
           
           if (bet.status !== 'settled' || !bet.matches?.match_result || !userPrediction) {
             return false
           }

           const userCorrect = userPrediction === bet.matches.match_result
           const opponentCorrect = opponentPrediction === bet.matches.match_result
           const isDraw = !userCorrect && !opponentCorrect
           
           return isDraw
         })
         break
      default: break
    }


    
    setFilteredBets(filtered)
  }, [betHistory, activeBets, activeFilter, user])

  const getBetStatusIcon = (status: string, matchResult?: string) => {
    switch (status) {
      case 'settled':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'cancelled':
      case 'rejected':
        return <Ban className="h-4 w-4 text-red-500" />
      case 'pending':
      case 'accepted':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getBetStatusColor = (status: string, matchResult?: string) => {
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

  const getBetRole = (bet: BetWithDetails) => {
    if (bet.creator_id === user?.id) return 'Creator'
    if (bet.opponent_id === user?.id) return 'Opponent'
    return 'Participant'
  }

  const getPredictionText = (prediction: string) => {
    switch (prediction) {
      case 'home_win':
        return 'Home Win'
      case 'away_win':
        return 'Away Win'
      case 'draw':
        return 'Draw'
      default:
        return prediction
    }
  }



  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'win', label: 'Win' },
    { key: 'lose', label: 'Lose' },
    { key: 'draw', label: 'Draw' }
  ]

  // Use actual user statistics from database instead of calculating from filtered bets
  const totalBets = user?.total_bets || 0
  const wins = user?.total_wins || 0
  const losses = user?.total_losses || 0
  const winRate = user?.win_rate || 0

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bets</h1>
          <p className="text-gray-600">Track your betting history and performance</p>
        </div>
        
        {/* Wallet Balance */}
        <div className="flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-lg">
          <Wallet className="h-5 w-5 text-green-600" />
          <span className="font-semibold text-green-700">
            {formatCurrency(wallet?.balance || 0, wallet?.currency || 'USD')}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {filters.map((filter) => (
          <Button
            key={filter.key}
            variant={activeFilter === filter.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter(filter.key)}
            className={`whitespace-nowrap ${
              activeFilter === filter.key 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Statistics Summary */}
      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Bets</p>
                  <p className="text-2xl font-bold text-gray-900">{totalBets}</p>
                </div>
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Wins</p>
                  <p className="text-2xl font-bold text-green-600">{wins}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Losses</p>
                  <p className="text-2xl font-bold text-red-600">{losses}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Win Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{winRate}%</p>
                </div>
                <Trophy className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bet History */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading your bet history...</p>
            </CardContent>
          </Card>
        ) : filteredBets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trophy className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bets found</h3>
              <p className="text-gray-600 text-center">
                {activeFilter === 'all' 
                  ? "You haven't placed any bets yet. Start betting to see your history here!"
                  : `No ${activeFilter} bets found. Try changing the filter or place some bets.`
                }
              </p>
              {activeFilter === 'all' && (
                <Button className="mt-4" onClick={() => window.location.href = '/dashboard'}>
                  Create Your First Bet
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredBets.map((bet) => (
            <Card 
              key={bet.id} 
              className="overflow-hidden hover:shadow-lg transition-shadow group"
            >
              <div 
                className="cursor-pointer"
                onClick={(e) => {
                  e.preventDefault()
                  router.push(`/history/${bet.id}`)
                }}
              >
                <CardContent className="p-0">
                {/* Bet Header with Date and Status */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">
                        {formatDate(bet.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs font-medium ${getBetStatusColor(bet.status, bet.matches?.match_result || undefined)}`}
                      >
                        {getBetStatusIcon(bet.status, bet.matches?.match_result || undefined)}
                        <span className="ml-1 capitalize">
                          {bet.status}
                        </span>
                      </Badge>
                      <span className="text-xs text-gray-500 font-mono">
                        #{bet.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bet Content */}
                <div className="p-6">
                  {/* League and Match Info */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-semibold text-gray-800">
                          Premier League
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs font-medium bg-gray-50">
                        {getBetRole(bet)}
                      </Badge>
                    </div>

                    {/* Team Matchup - Enhanced Design */}
                    <div className="bg-white rounded-lg border p-4 mb-4">
                      <div className="flex items-center justify-between">
                                                 {/* Home Team */}
                         <div className="flex items-center space-x-3 flex-1">
                           <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                             <span className="text-white text-sm font-bold">
                               {bet.matches?.home_team?.name?.slice(0, 3).toUpperCase() || 'ARS'}
                             </span>
                           </div>
                           <div className="text-center">
                             <p className="text-sm font-semibold text-gray-800">
                               {bet.matches?.home_team?.name || 'Home Team'}
                             </p>
                             <p className="text-xs text-gray-500">Home</p>
                           </div>
                         </div>

                         {/* VS Separator */}
                         <div className="flex flex-col items-center mx-4">
                           <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center shadow-lg">
                             <span className="text-white text-xs font-bold">VS</span>
                           </div>
                           <span className="text-xs text-gray-500 mt-2 font-medium">
                             {bet.matches?.start_time ? formatDate(bet.matches.start_time) : 'TBD'}
                           </span>
                         </div>

                         {/* Away Team */}
                         <div className="flex items-center space-x-3 flex-1 justify-end">
                           <div className="text-center">
                             <p className="text-sm font-semibold text-gray-800">
                               {bet.matches?.away_team?.name || 'Away Team'}
                             </p>
                             <p className="text-xs text-gray-500">Away</p>
                           </div>
                           <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                             <span className="text-white text-sm font-bold">
                               {bet.matches?.away_team?.name?.slice(0, 3).toUpperCase() || 'CFC'}
                             </span>
                           </div>
                         </div>
                      </div>
                    </div>

                    {/* My Prediction Section */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <Target className="h-4 w-4 text-green-600" />
                          </div>
                          <span className="text-sm font-semibold text-gray-800">My Prediction</span>
                        </div>
                        <Badge variant="outline" className="text-xs font-medium bg-white">
                          {bet.bet_predictions?.find(p => p.user_id === user?.id)?.prediction 
                            ? getPredictionText(bet.bet_predictions.find(p => p.user_id === user?.id)?.prediction || '')
                            : 'Not specified'
                          }
                        </Badge>
                      </div>
                    </div>

                                         {/* Social Challenge */}
                     <div className="flex items-center justify-between">
                       <div className="flex items-center space-x-3">
                         <Avatar className="h-8 w-8 border-2 border-gray-200">
                           <AvatarImage src={user?.avatar_url || ''} />
                           <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                             {user?.username?.charAt(0).toUpperCase() || 'U'}
                           </AvatarFallback>
                         </Avatar>
                         <span className="text-sm text-gray-600 font-medium">vs</span>
                         <span className="text-sm font-semibold text-gray-800">
                           @{bet.creator_id === user?.id 
                             ? bet.opponent?.username 
                             : bet.creator?.username || 'unknown'}
                         </span>
                       </div>
                       

                       
                                               <div className="flex items-center space-x-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            bet.status === 'settled' 
                              ? (() => {
                                  const userPrediction = bet.bet_predictions?.find(p => p.user_id === user?.id)?.prediction
                                  const opponentPrediction = bet.bet_predictions?.find(pred => pred.user_id !== user?.id)?.prediction
                                  const userCorrect = userPrediction === bet.matches?.match_result
                                  const opponentCorrect = opponentPrediction === bet.matches?.match_result
                                  
                                  if (userCorrect) return 'bg-green-100'
                                  if (!userCorrect && !opponentCorrect) return 'bg-yellow-100' // Draw
                                  return 'bg-red-100' // Loss
                                })()
                              : 'bg-gray-100'
                          }`}>
                            {bet.status === 'settled' ? (
                              <Trophy className={`h-3 w-3 ${
                                (() => {
                                  const userPrediction = bet.bet_predictions?.find(p => p.user_id === user?.id)?.prediction
                                  const opponentPrediction = bet.bet_predictions?.find(pred => pred.user_id !== user?.id)?.prediction
                                  const userCorrect = userPrediction === bet.matches?.match_result
                                  const opponentCorrect = opponentPrediction === bet.matches?.match_result
                                  
                                  if (userCorrect) return 'text-green-600'
                                  if (!userCorrect && !opponentCorrect) return 'text-yellow-600' // Draw
                                  return 'text-red-600' // Loss
                                })()
                              }`} />
                            ) : (
                              <Clock className="h-3 w-3 text-gray-600" />
                            )}
                          </div>
                         <span className="text-sm font-semibold text-gray-800">
                           {formatCurrency(bet.min_opponent_amount, wallet?.currency || 'USD')}
                         </span>
                       </div>
                     </div>
                  </div>
                </div>
                </CardContent>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
} 