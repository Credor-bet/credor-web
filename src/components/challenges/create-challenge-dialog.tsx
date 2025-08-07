'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore, useFriendsStore } from '@/lib/store'
import { ChallengeService, type Sport, type Team, type Match, type PredictionType, type ChallengeType } from '@/lib/challenge-service'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Search,
  Trophy,
  Users,
  Clock,
  Target,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  Plus,
  Loader2,
  Calendar,
  MapPin
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'

interface CreateChallengeDialogProps {
  children: React.ReactNode
  defaultOpponentId?: string
}

type Step = 'opponent' | 'sport' | 'fixture' | 'prediction' | 'stake' | 'confirm'

export function CreateChallengeDialog({ children, defaultOpponentId }: CreateChallengeDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<Step>('opponent')
  const [isLoading, setIsLoading] = useState(false)
  
  // Form data
  const [challengeType, setChallengeType] = useState<ChallengeType>('friend')
  const [selectedOpponentId, setSelectedOpponentId] = useState(defaultOpponentId || '')
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null)
  const [teamSearchTerm, setTeamSearchTerm] = useState('')
  const [selectedHomeTeam, setSelectedHomeTeam] = useState<Team | null>(null)
  const [selectedAwayTeam, setSelectedAwayTeam] = useState<Team | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [prediction, setPrediction] = useState<PredictionType>('home_win')
  const [amount, setAmount] = useState('')
  const [minOpponentAmount, setMinOpponentAmount] = useState('')
  
  // Data states
  const [sports, setSports] = useState<Sport[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  
  const { user, wallet } = useAuthStore()
  const { friends, refreshFriends } = useFriendsStore()

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      loadSports()
      refreshFriends()
    }
  }, [isOpen, refreshFriends])

  const loadSports = async () => {
    try {
      const sportsData = await ChallengeService.getSports()
      setSports(sportsData)
    } catch (error) {
      console.error('Error loading sports:', error)
      toast.error('Failed to load sports')
    }
  }

  const searchTeams = useCallback(async (searchTerm: string, sportId?: string) => {
    if (!searchTerm.trim()) {
      setTeams([])
      return
    }

    try {
      const teamsData = await ChallengeService.searchTeams(searchTerm, sportId)
      setTeams(teamsData)
    } catch (error) {
      console.error('Error searching teams:', error)
      toast.error('Failed to search teams')
    }
  }, [])

  const loadMatches = async () => {
    try {
      setIsLoading(true)
      const matchesData = await ChallengeService.getUpcomingMatches(
        selectedSport?.id,
        selectedHomeTeam?.id,
        selectedAwayTeam?.id
      )
      setMatches(matchesData)
    } catch (error) {
      console.error('Error loading matches:', error)
      toast.error('Failed to load matches')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (selectedSport || selectedHomeTeam || selectedAwayTeam) {
      loadMatches()
    }
  }, [selectedSport, selectedHomeTeam, selectedAwayTeam])

  const handleCreateChallenge = async () => {
    if (!selectedMatch || !amount || !minOpponentAmount) {
      toast.error('Please fill in all required fields')
      return
    }

    if (parseFloat(amount) > (wallet?.balance || 0)) {
      toast.error('Insufficient balance')
      return
    }

    try {
      setIsLoading(true)
      
      // Show progress toast
      const progressToast = toast.loading('Creating challenge...')
      
      console.log('Creating challenge with params:', {
        opponentId: challengeType === 'friend' ? selectedOpponentId : undefined,
        matchId: selectedMatch.id,
        amount: parseFloat(amount),
        minOpponentAmount: parseFloat(minOpponentAmount),
        prediction,
        type: challengeType
      })
      
      const challengeId = await ChallengeService.createChallenge({
        opponentId: challengeType === 'friend' ? selectedOpponentId : undefined,
        matchId: selectedMatch.id,
        amount: parseFloat(amount),
        minOpponentAmount: parseFloat(minOpponentAmount),
        prediction,
        type: challengeType
      })

      // Dismiss progress toast and show success
      toast.dismiss(progressToast)
      
      const opponentName = challengeType === 'friend' && selectedOpponentId 
        ? friends.find(f => f.id === selectedOpponentId)?.username || 'your friend'
        : 'anyone'
      
      toast.success(`Challenge created successfully! You staked ${formatCurrency(parseFloat(amount), wallet?.currency || 'USD')} on ${
        prediction === 'home_win' ? selectedMatch.home_team.name :
        prediction === 'away_win' ? selectedMatch.away_team.name : 'Draw'
      }. ${challengeType === 'friend' ? `${opponentName} will be notified.` : 'It\'s now available for others to accept.'}`, {
        duration: 6000
      })
      
      setIsOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error creating challenge:', error)
      
      // More detailed error logging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        })
        
        // Check if it's a network error
        if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_CLOSED')) {
          toast.error('Network connection error. Please check your internet connection and try again.', {
            duration: 5000
          })
        } else if (error.message.includes('Insufficient funds') || error.message.includes('insufficient balance')) {
          toast.error(`Insufficient wallet balance. You need ${formatCurrency(parseFloat(amount), wallet?.currency || 'USD')} but only have ${formatCurrency(wallet?.balance || 0, wallet?.currency || 'USD')} available.`)
        } else if (error.message.includes('Match not found')) {
          toast.error('The selected match is no longer available. Please choose a different match.')
        } else if (error.message.includes('User not found')) {
          toast.error('The selected opponent is not available. Please choose a different friend.')
        } else {
          toast.error(`Failed to create challenge: ${error.message}`)
        }
      } else {
        toast.error('Failed to create challenge. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setStep('opponent')
    setChallengeType('friend')
    setSelectedOpponentId(defaultOpponentId || '')
    setSelectedSport(null)
    setTeamSearchTerm('')
    setSelectedHomeTeam(null)
    setSelectedAwayTeam(null)
    setSelectedMatch(null)
    setPrediction('home_win')
    setAmount('')
    setMinOpponentAmount('')
    setTeams([])
    setMatches([])
  }

  const renderOpponentStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <Trophy className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold">Choose Challenge Type</h3>
        <p className="text-sm text-muted-foreground">Who would you like to challenge?</p>
      </div>
      
      <div className="space-y-3">
        <Button
          variant={challengeType === 'friend' ? 'default' : 'outline'}
          className="w-full justify-start h-auto p-4"
          onClick={() => setChallengeType('friend')}
        >
          <Users className="h-5 w-5 mr-3" />
          <div className="text-left">
            <div className="font-medium">Challenge a Friend</div>
            <div className="text-xs text-muted-foreground">Send a direct challenge</div>
          </div>
        </Button>
        
        <Button
          variant={challengeType === 'public' ? 'default' : 'outline'}
          className="w-full justify-start h-auto p-4"
          onClick={() => setChallengeType('public')}
        >
          <Target className="h-5 w-5 mr-3" />
          <div className="text-left">
            <div className="font-medium">Public Challenge</div>
            <div className="text-xs text-muted-foreground">Open to anyone</div>
          </div>
        </Button>
      </div>

      {challengeType === 'friend' && (
        <div className="space-y-3">
          <Label>Select Friend</Label>
          <Select value={selectedOpponentId} onValueChange={setSelectedOpponentId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a friend to challenge" />
            </SelectTrigger>
            <SelectContent>
              {friends.map((friend) => (
                <SelectItem key={friend.id} value={friend.id}>
                  <div className="flex items-center">
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={friend.avatar_url || ''} />
                      <AvatarFallback>{friend.username[0]}</AvatarFallback>
                    </Avatar>
                    {friend.username}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )

  const renderSportStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <Trophy className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold">Select Sport</h3>
        <p className="text-sm text-muted-foreground">Choose the sport for your challenge</p>
      </div>
      
      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {sports.map((sport) => (
          <Button
            key={sport.id}
            variant={selectedSport?.id === sport.id ? 'default' : 'outline'}
            className="h-auto p-4 text-left"
            onClick={() => setSelectedSport(sport)}
          >
            <div>
              <div className="font-medium">{sport.name}</div>
              <div className="text-xs text-muted-foreground">{sport.category || 'Sport'}</div>
            </div>
          </Button>
        ))}
      </div>

      {selectedSport && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg">
          <div className="flex items-center">
            <Trophy className="h-5 w-5 text-green-600 mr-2" />
            <span className="font-medium">{selectedSport.name} selected</span>
          </div>
        </div>
      )}
    </div>
  )

  const renderFixtureStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <Calendar className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold">Choose Fixture</h3>
        <p className="text-sm text-muted-foreground">Select the match for your challenge</p>
      </div>

      {/* Team Search */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for teams..."
            value={teamSearchTerm}
            onChange={(e) => {
              setTeamSearchTerm(e.target.value)
              searchTeams(e.target.value, selectedSport?.id)
            }}
            className="pl-10"
          />
        </div>

        {teams.length > 0 && (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {teams.map((team) => (
              <Button
                key={team.id}
                variant="outline"
                className="w-full justify-start h-auto p-3"
                onClick={() => {
                  if (!selectedHomeTeam) {
                    setSelectedHomeTeam(team)
                  } else if (!selectedAwayTeam && team.id !== selectedHomeTeam.id) {
                    setSelectedAwayTeam(team)
                  }
                  setTeamSearchTerm('')
                  setTeams([])
                }}
              >
                <div className="flex items-center">
                  {team.logo_url && (
                    <img src={team.logo_url} alt="" className="h-6 w-6 mr-2" />
                  )}
                  <div className="text-left">
                    <div className="font-medium">{team.name}</div>
                    {team.country && (
                      <div className="text-xs text-muted-foreground">{team.country}</div>
                    )}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Teams */}
      {(selectedHomeTeam || selectedAwayTeam) && (
        <div className="space-y-2">
          {selectedHomeTeam && (
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
              <div className="flex items-center">
                {selectedHomeTeam.logo_url && (
                  <img src={selectedHomeTeam.logo_url} alt="" className="h-6 w-6 mr-2" />
                )}
                <span className="font-medium">{selectedHomeTeam.name}</span>
                <Badge variant="secondary" className="ml-2">Home</Badge>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedHomeTeam(null)}
              >
                ×
              </Button>
            </div>
          )}
          
          {selectedAwayTeam && (
            <div className="flex items-center justify-between p-2 bg-red-50 rounded">
              <div className="flex items-center">
                {selectedAwayTeam.logo_url && (
                  <img src={selectedAwayTeam.logo_url} alt="" className="h-6 w-6 mr-2" />
                )}
                <span className="font-medium">{selectedAwayTeam.name}</span>
                <Badge variant="secondary" className="ml-2">Away</Badge>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedAwayTeam(null)}
              >
                ×
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Available Matches */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading matches...</span>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {matches.map((match) => (
            <Button
              key={match.id}
              variant={selectedMatch?.id === match.id ? 'default' : 'outline'}
              className="w-full h-auto p-4"
              onClick={() => setSelectedMatch(match)}
            >
              <div className="w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center">
                      {match.home_team.logo_url && (
                        <img src={match.home_team.logo_url} alt="" className="h-6 w-6 mr-2" />
                      )}
                      <span className="font-medium">{match.home_team.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">vs</span>
                    <div className="flex items-center">
                      {match.away_team.logo_url && (
                        <img src={match.away_team.logo_url} alt="" className="h-6 w-6 mr-2" />
                      )}
                      <span className="font-medium">{match.away_team.name}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDate(match.start_time)}
                  </div>
                  <Badge variant="outline">{match.sport.name}</Badge>
                </div>
              </div>
            </Button>
          ))}
        </div>
      )}
    </div>
  )

  const renderPredictionStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <Target className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold">Make Your Prediction</h3>
        <p className="text-sm text-muted-foreground">Who do you think will win?</p>
      </div>

      {selectedMatch && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  {selectedMatch.home_team.logo_url && (
                    <img src={selectedMatch.home_team.logo_url} alt="" className="h-8 w-8 mr-2" />
                  )}
                  <span className="font-medium">{selectedMatch.home_team.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">vs</span>
                <div className="flex items-center">
                  {selectedMatch.away_team.logo_url && (
                    <img src={selectedMatch.away_team.logo_url} alt="" className="h-8 w-8 mr-2" />
                  )}
                  <span className="font-medium">{selectedMatch.away_team.name}</span>
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {formatDate(selectedMatch.start_time)}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <Button
          variant={prediction === 'home_win' ? 'default' : 'outline'}
          className="w-full h-auto p-4"
          onClick={() => setPrediction('home_win')}
        >
          <div className="text-left">
            <div className="font-medium">{selectedMatch?.home_team.name} to Win</div>
            <div className="text-xs text-muted-foreground">Home team victory</div>
          </div>
        </Button>

        <Button
          variant={prediction === 'draw' ? 'default' : 'outline'}
          className="w-full h-auto p-4"
          onClick={() => setPrediction('draw')}
        >
          <div className="text-left">
            <div className="font-medium">Draw</div>
            <div className="text-xs text-muted-foreground">Match ends in a tie</div>
          </div>
        </Button>

        <Button
          variant={prediction === 'away_win' ? 'default' : 'outline'}
          className="w-full h-auto p-4"
          onClick={() => setPrediction('away_win')}
        >
          <div className="text-left">
            <div className="font-medium">{selectedMatch?.away_team.name} to Win</div>
            <div className="text-xs text-muted-foreground">Away team victory</div>
          </div>
        </Button>
      </div>
    </div>
  )

  const renderStakeStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <DollarSign className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold">Set Your Stake</h3>
        <p className="text-sm text-muted-foreground">How much would you like to bet?</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground mb-2">Available Balance</div>
          <div className="text-2xl font-bold">
            {formatCurrency(wallet?.balance || 0, wallet?.currency || 'USD')}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div>
          <Label htmlFor="amount">Your Stake Amount</Label>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              if (!minOpponentAmount) {
                setMinOpponentAmount(e.target.value)
              }
            }}
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <Label htmlFor="minOpponentAmount">Minimum Opponent Stake</Label>
          <Input
            id="minOpponentAmount"
            type="number"
            placeholder="0.00"
            value={minOpponentAmount}
            onChange={(e) => setMinOpponentAmount(e.target.value)}
            min="0"
            step="0.01"
          />
          <p className="text-xs text-muted-foreground mt-1">
            The minimum amount your opponent must stake to accept
          </p>
        </div>
      </div>

      {/* Quick Amount Buttons */}
      <div className="grid grid-cols-4 gap-2">
        {[10, 25, 50, 100].map((quickAmount) => (
          <Button
            key={quickAmount}
            variant="outline"
            size="sm"
            onClick={() => {
              setAmount(quickAmount.toString())
              if (!minOpponentAmount) {
                setMinOpponentAmount(quickAmount.toString())
              }
            }}
            disabled={(wallet?.balance || 0) < quickAmount}
          >
            ${quickAmount}
          </Button>
        ))}
      </div>
    </div>
  )

  const renderConfirmStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <Trophy className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold">Confirm Challenge</h3>
        <p className="text-sm text-muted-foreground">Review your challenge details</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Challenge Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Opponent */}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type:</span>
            <span className="font-medium">
              {challengeType === 'friend' ? 'Friend Challenge' : 'Public Challenge'}
            </span>
          </div>

          {challengeType === 'friend' && selectedOpponentId && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Opponent:</span>
              <div className="flex items-center">
                {(() => {
                  const friend = friends.find(f => f.id === selectedOpponentId)
                  return friend ? (
                    <>
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage src={friend.avatar_url || ''} />
                        <AvatarFallback>{friend.username[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{friend.username}</span>
                    </>
                  ) : null
                })()}
              </div>
            </div>
          )}

          <Separator />

          {/* Match */}
          {selectedMatch && (
            <div>
              <div className="text-muted-foreground mb-2">Match:</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center">
                    {selectedMatch.home_team.logo_url && (
                      <img src={selectedMatch.home_team.logo_url} alt="" className="h-6 w-6 mr-2" />
                    )}
                    <span className="font-medium">{selectedMatch.home_team.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">vs</span>
                  <div className="flex items-center">
                    {selectedMatch.away_team.logo_url && (
                      <img src={selectedMatch.away_team.logo_url} alt="" className="h-6 w-6 mr-2" />
                    )}
                    <span className="font-medium">{selectedMatch.away_team.name}</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatDate(selectedMatch.start_time)}
              </div>
            </div>
          )}

          <Separator />

          {/* Prediction */}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Your Prediction:</span>
            <span className="font-medium">
              {prediction === 'home_win' && selectedMatch?.home_team.name}
              {prediction === 'away_win' && selectedMatch?.away_team.name}
              {prediction === 'draw' && 'Draw'}
            </span>
          </div>

          <Separator />

          {/* Stakes */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Your Stake:</span>
              <span className="font-medium">{formatCurrency(parseFloat(amount) || 0, wallet?.currency || 'USD')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Min. Opponent Stake:</span>
              <span className="font-medium">{formatCurrency(parseFloat(minOpponentAmount) || 0, wallet?.currency || 'USD')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const getStepTitle = () => {
    switch (step) {
      case 'opponent': return 'Challenge Type'
      case 'sport': return 'Select Sport'
      case 'fixture': return 'Choose Fixture'
      case 'prediction': return 'Your Prediction'
      case 'stake': return 'Set Stakes'
      case 'confirm': return 'Confirm'
      default: return 'Create Challenge'
    }
  }

  const canProceed = () => {
    switch (step) {
      case 'opponent':
        return challengeType === 'public' || (challengeType === 'friend' && selectedOpponentId)
      case 'sport':
        return selectedSport !== null
      case 'fixture':
        return selectedMatch !== null
      case 'prediction':
        return prediction !== null
      case 'stake':
        return amount && minOpponentAmount && parseFloat(amount) > 0 && parseFloat(minOpponentAmount) > 0
      case 'confirm':
        return true
      default:
        return false
    }
  }

  const steps: Step[] = ['opponent', 'sport', 'fixture', 'prediction', 'stake', 'confirm']
  const currentStepIndex = steps.indexOf(step)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) resetForm()
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">{getStepTitle()}</DialogTitle>
          <DialogDescription className="text-center">
            Create a new challenge by following these steps
          </DialogDescription>
          <div className="flex items-center justify-center space-x-2 mt-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-8 rounded-full ${
                  index <= currentStepIndex ? 'bg-green-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="py-4">
          {step === 'opponent' && renderOpponentStep()}
          {step === 'sport' && renderSportStep()}
          {step === 'fixture' && renderFixtureStep()}
          {step === 'prediction' && renderPredictionStep()}
          {step === 'stake' && renderStakeStep()}
          {step === 'confirm' && renderConfirmStep()}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              const currentIndex = steps.indexOf(step)
              if (currentIndex > 0) {
                setStep(steps[currentIndex - 1])
              }
            }}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {step === 'confirm' ? (
            <Button onClick={handleCreateChallenge} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Send Challenge'
              )}
            </Button>
          ) : (
            <Button
              onClick={() => {
                const currentIndex = steps.indexOf(step)
                if (currentIndex < steps.length - 1) {
                  setStep(steps[currentIndex + 1])
                }
              }}
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}