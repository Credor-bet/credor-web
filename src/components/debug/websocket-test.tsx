'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getWebSocketService } from '@/lib/websocket-service'
import { useMatchStore } from '@/lib/store'
import { fetchUpcomingMatches, fetchLiveAndSoonMatches, UpcomingMatch } from '@/lib/match-utils'
import { ConnectionTest } from './connection-test'

/**
 * Debug component to test WebSocket connection directly
 * Add this to your challenges page temporarily to debug the connection
 */
export function WebSocketTest() {
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const [messages, setMessages] = useState<string[]>([])
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([])
  const [selectedMatch, setSelectedMatch] = useState<UpcomingMatch | null>(null)
  const [isLoadingMatches, setIsLoadingMatches] = useState(false)

  const wsService = getWebSocketService()
  const { getLiveMatch } = useMatchStore()
  
  // Get live match data for the selected fixture
  const liveMatch = selectedMatch ? getLiveMatch(selectedMatch.fixture_id) : null

  useEffect(() => {
    // Set up WebSocket callbacks for debugging
    wsService.setCallbacks({
      onConnect: () => {
        console.log('DEBUG: WebSocket connected')
        setConnectionState('connected')
        addMessage('✅ Connected to WebSocket server')
      },
      onDisconnect: () => {
        console.log('DEBUG: WebSocket disconnected')
        setConnectionState('disconnected')
        addMessage('❌ Disconnected from WebSocket server')
      },
      onError: (error) => {
        console.log('DEBUG: WebSocket error:', error)
        setConnectionState('error')
        addMessage(`❌ Error: ${error}`)
      },
      onMessage: (message) => {
        console.log('DEBUG: WebSocket message received:', message)
        addMessage(`📨 Received: ${JSON.stringify(message)}`)
      }
    })
  }, [])

  const addMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setMessages(prev => [...prev, `[${timestamp}] ${message}`])
  }

  // Load upcoming matches from database
  const loadUpcomingMatches = async () => {
    setIsLoadingMatches(true)
    addMessage('🔍 Loading upcoming matches from database...')
    
    try {
      const matches = await fetchLiveAndSoonMatches()
      setUpcomingMatches(matches)
      
      if (matches.length > 0) {
        setSelectedMatch(matches[0]) // Auto-select first match
        addMessage(`✅ Loaded ${matches.length} upcoming matches`)
        addMessage(`🎯 Auto-selected: ${matches[0].home_team?.name} vs ${matches[0].away_team?.name}`)
      } else {
        addMessage('⚠️ No upcoming matches found')
        // Fallback to any scheduled matches
        const allUpcoming = await fetchUpcomingMatches(5)
        setUpcomingMatches(allUpcoming)
        if (allUpcoming.length > 0) {
          setSelectedMatch(allUpcoming[0])
          addMessage(`📅 Fallback: Found ${allUpcoming.length} scheduled matches`)
        }
      }
    } catch (error) {
      addMessage(`❌ Error loading matches: ${error}`)
    } finally {
      setIsLoadingMatches(false)
    }
  }

  // Test the callback chain
  const testCallbackChain = () => {
    console.log('🔬 Testing callback chain...')
    
    // Get the service and check if callbacks are set
    const service = getWebSocketService()
    console.log('🔧 Service instance:', service)
    console.log('🔗 Service connected:', service.isConnected)
    console.log('📊 Current subscriptions:', Array.from(service.currentSubscriptions))
    
    // Add test message to log
    addMessage('🧪 Manual callback chain test initiated')
  }

  // Load matches on component mount
  useEffect(() => {
    loadUpcomingMatches()
  }, [])

  const handleConnect = async () => {
    setConnectionState('connecting')
    addMessage('🔄 Attempting to connect...')
    
    try {
      const success = await wsService.connect()
      if (success) {
        addMessage('✅ Connection successful')
        
        // Test subscription after a short delay
        setTimeout(async () => {
          if (selectedMatch) {
            addMessage(`🔄 Testing subscription to: ${selectedMatch.home_team?.name} vs ${selectedMatch.away_team?.name}`)
            addMessage(`📍 Fixture ID: ${selectedMatch.fixture_id}`)
            const subSuccess = await wsService.subscribeToMatch(selectedMatch.fixture_id)
            if (subSuccess) {
              addMessage(`✅ Subscription successful`)
            } else {
              addMessage(`❌ Subscription failed`)
            }
          } else {
            addMessage('⚠️ No match selected for subscription')
          }
        }, 1000)
      } else {
        addMessage('❌ Connection failed')
        setConnectionState('error')
      }
    } catch (error) {
      addMessage(`❌ Connection error: ${error}`)
      setConnectionState('error')
    }
  }

  const handleDisconnect = () => {
    wsService.disconnect()
    addMessage('🔄 Manual disconnect')
  }

  const clearMessages = () => {
    setMessages([])
  }

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected': return 'bg-green-100 text-green-800'
      case 'connecting': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected': return 'Connected'
      case 'connecting': return 'Connecting...'
      case 'error': return 'Error'
      default: return 'Disconnected'
    }
  }

  return (
    <div className="space-y-4">
      <ConnectionTest />
      
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>WebSocket Connection Test</CardTitle>
            <Badge className={getStatusColor()}>
              {getStatusText()}
            </Badge>
          </div>
        </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Controls */}
        <div className="flex gap-2">
          <Button 
            onClick={handleConnect} 
            disabled={connectionState === 'connecting' || connectionState === 'connected'}
            variant="default"
          >
            Connect
          </Button>
          <Button 
            onClick={handleDisconnect} 
            disabled={connectionState !== 'connected'}
            variant="outline"
          >
            Disconnect
          </Button>
          <Button 
            onClick={testCallbackChain}
            variant="secondary"
            size="sm"
          >
            Test Callbacks
          </Button>
          <Button 
            onClick={clearMessages} 
            variant="outline"
          >
            Clear Log
          </Button>
        </div>

        {/* Match Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Upcoming Matches</h4>
            <Button 
              onClick={loadUpcomingMatches}
              disabled={isLoadingMatches}
              variant="outline"
              size="sm"
            >
              {isLoadingMatches ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
          
          {upcomingMatches.length > 0 ? (
            <div className="space-y-2">
              <select 
                value={selectedMatch?.id || ''}
                onChange={(e) => {
                  const match = upcomingMatches.find(m => m.id === e.target.value)
                  setSelectedMatch(match || null)
                  if (match) {
                    addMessage(`🎯 Selected: ${match.home_team?.name} vs ${match.away_team?.name}`)
                  }
                }}
                className="w-full p-2 border rounded-md text-sm"
              >
                <option value="">Select a match...</option>
                {upcomingMatches.map(match => (
                  <option key={match.id} value={match.id}>
                    {match.home_team?.name} vs {match.away_team?.name} 
                    ({new Date(match.start_time).toLocaleString()}) 
                    [{match.status}]
                  </option>
                ))}
              </select>
              
              {selectedMatch && (
                <div className="p-2 bg-blue-50 rounded text-sm">
                  <p className="font-medium text-blue-900">Selected Match:</p>
                  <p>Teams: {selectedMatch.home_team?.name} vs {selectedMatch.away_team?.name}</p>
                  <p>Start: {new Date(selectedMatch.start_time).toLocaleString()}</p>
                  <p>Status: {selectedMatch.status}</p>
                  <p>Fixture ID: {selectedMatch.fixture_id}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-2 bg-yellow-50 rounded text-sm">
              <p className="text-yellow-800">
                {isLoadingMatches ? 'Loading matches...' : 'No upcoming matches found'}
              </p>
            </div>
          )}
        </div>

        {/* Debug Info */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Target: wss://match.credorr.com/ws/</p>
          <p>Current subscriptions: {wsService.currentSubscriptions.size}</p>
          
          {/* Live Match Data */}
          {liveMatch && (
            <div className="mt-2 p-2 bg-green-50 rounded">
              <p className="font-medium text-green-900">🔴 LIVE DATA RECEIVED:</p>
              <p>Score: {liveMatch.home_score}-{liveMatch.away_score}</p>
              <p>Status: {liveMatch.status}</p>
              <p>Last Updated: {new Date(liveMatch.last_updated).toLocaleTimeString()}</p>
            </div>
          )}
          
          {!liveMatch && selectedMatch && connectionState === 'connected' && (
            <div className="mt-2 p-2 bg-yellow-50 rounded">
              <p className="text-yellow-800">No live match data yet for this fixture</p>
            </div>
          )}
        </div>

        {/* Message Log */}
        <div className="space-y-2">
          <h4 className="font-medium">Connection Log:</h4>
          <div className="bg-gray-50 p-3 rounded-lg max-h-64 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-muted-foreground text-sm">No messages yet...</p>
            ) : (
              <div className="space-y-1">
                {messages.map((message, index) => (
                  <div key={index} className="text-xs font-mono">
                    {message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </CardContent>
      </Card>
    </div>
  )
}
