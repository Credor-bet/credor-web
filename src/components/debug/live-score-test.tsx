'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useWebSocket } from '@/hooks/use-websocket'
import { useMatchStore } from '@/lib/store'
import { LiveScoreDisplay } from '@/components/matches/match-status-badge'

/**
 * Component to test live score functionality
 */
export function LiveScoreTest() {
  const [testResults, setTestResults] = useState<string[]>([])
  const [selectedMatch, setSelectedMatch] = useState<string>('')
  const [availableMatches, setAvailableMatches] = useState<any[]>([])
  
  const { isConnected, subscribeToMatch, unsubscribeFromMatch, connect, disconnect } = useWebSocket({
    autoConnect: false,
    enableNotifications: true,
    enableErrorToasts: true
  })
  
  const { liveMatches, connectedFixtures, getLiveMatch } = useMatchStore()

  const addResult = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setTestResults(prev => [...prev, `[${timestamp}] ${message}`])
  }

  // Fetch available matches from server
  const fetchMatches = async () => {
    try {
      addResult('🔍 Fetching available matches from server...')
      const response = await fetch('https://match.credorr.com/ws/fixtures')
      
      if (response.ok) {
        const data = await response.json()
        setAvailableMatches(data)
        addResult(`✅ Found ${data.length} available matches`)
        
        if (data.length > 0) {
          setSelectedMatch(data[0].id)
          addResult(`🎯 Auto-selected first match: ${data[0].id}`)
        }
      } else {
        addResult(`❌ Failed to fetch matches: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      addResult(`❌ Error fetching matches: ${error}`)
    }
  }

  // Connect to WebSocket
  const testConnect = async () => {
    addResult('🚀 Attempting to connect to WebSocket...')
    const success = await connect()
    
    if (success) {
      addResult('✅ WebSocket connection successful!')
    } else {
      addResult('❌ WebSocket connection failed!')
    }
  }

  // Subscribe to selected match
  const testSubscribe = async () => {
    if (!selectedMatch) {
      addResult('❌ No match selected')
      return
    }

    addResult(`📡 Subscribing to match: ${selectedMatch}`)
    const success = await subscribeToMatch(selectedMatch)
    
    if (success) {
      addResult(`✅ Successfully subscribed to match: ${selectedMatch}`)
    } else {
      addResult(`❌ Failed to subscribe to match: ${selectedMatch}`)
    }
  }

  // Unsubscribe from selected match
  const testUnsubscribe = () => {
    if (!selectedMatch) {
      addResult('❌ No match selected')
      return
    }

    addResult(`📴 Unsubscribing from match: ${selectedMatch}`)
    unsubscribeFromMatch(selectedMatch)
    addResult(`✅ Unsubscribed from match: ${selectedMatch}`)
  }

  // Disconnect from WebSocket
  const testDisconnect = () => {
    addResult('🔌 Disconnecting from WebSocket...')
    disconnect()
    addResult('✅ Disconnected from WebSocket')
  }

  const clearResults = () => {
    setTestResults([])
  }

  // Auto-fetch matches on component mount
  useEffect(() => {
    fetchMatches()
  }, [])

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Live Score Connection Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="font-medium">
            Connection Status: {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Available Matches */}
        <div className="space-y-2">
          <h4 className="font-medium">Available Matches ({availableMatches.length}):</h4>
          <select 
            value={selectedMatch} 
            onChange={(e) => setSelectedMatch(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Select a match...</option>
            {availableMatches.map((match) => (
              <option key={match.id} value={match.id}>
                {match.team_home?.name || 'Team A'} vs {match.team_away?.name || 'Team B'} 
                ({match.status}) - {match.id}
              </option>
            ))}
          </select>
        </div>

        {/* Connected Fixtures */}
        <div className="space-y-2">
          <h4 className="font-medium">Connected Fixtures ({connectedFixtures.size}):</h4>
          <div className="text-sm text-gray-600">
            {Array.from(connectedFixtures).join(', ') || 'None'}
          </div>
        </div>

        {/* Live Matches Map Info */}
        <div className="space-y-2">
          <h4 className="font-medium">Live Matches in Store ({liveMatches.size}):</h4>
          <div className="text-sm text-gray-600">
            {Array.from(liveMatches.keys()).join(', ') || 'None'}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button onClick={fetchMatches} variant="outline">
            Refresh Matches
          </Button>
          <Button onClick={testConnect} variant="default" disabled={isConnected}>
            Connect WebSocket
          </Button>
          <Button onClick={testSubscribe} variant="default" disabled={!isConnected || !selectedMatch}>
            Subscribe to Match
          </Button>
          <Button onClick={testUnsubscribe} variant="outline" disabled={!selectedMatch}>
            Unsubscribe
          </Button>
          <Button onClick={testDisconnect} variant="outline" disabled={!isConnected}>
            Disconnect
          </Button>
          <Button onClick={clearResults} variant="ghost" size="sm">
            Clear Log
          </Button>
        </div>

        {/* Live Match Data */}
        {selectedMatch && (
          <div className="space-y-2">
            <h4 className="font-medium">Live Match Data:</h4>
            
            {/* Visual Score Display */}
            {(() => {
              const liveMatch = getLiveMatch(selectedMatch)
              const selectedMatchData = availableMatches.find(m => m.id === selectedMatch)
              
              if (liveMatch) {
                // Map live match status to component-expected status
                const displayStatus = liveMatch.status === 'in_progress' ? 'live' : liveMatch.status
                
                return (
                  <div className="bg-white border rounded-lg p-4">
                    <LiveScoreDisplay
                      homeScore={liveMatch.home_score}
                      awayScore={liveMatch.away_score}
                      status={displayStatus as 'scheduled' | 'live' | 'completed' | 'cancelled'}
                      homeTeam={selectedMatchData?.team_home?.name}
                      awayTeam={selectedMatchData?.team_away?.name}
                    />
                  </div>
                )
              }
              
              return (
                <div className="bg-gray-50 border rounded-lg p-4 text-center text-gray-500">
                  No live data yet - subscribe to see updates
                </div>
              )
            })()}
            
            {/* Raw Data (Collapsible) */}
            <details className="bg-green-50 rounded-lg">
              <summary className="p-3 cursor-pointer text-sm font-medium text-green-800">
                Raw Data (Click to expand)
              </summary>
              <div className="px-3 pb-3">
                <pre className="text-xs text-green-700 overflow-x-auto">
                  {JSON.stringify(getLiveMatch(selectedMatch) || 'No live data yet', null, 2)}
                </pre>
              </div>
            </details>
          </div>
        )}

        {/* Test Results Log */}
        <div className="space-y-2">
          <h4 className="font-medium">Connection Log:</h4>
          <div className="bg-gray-50 p-3 rounded-lg max-h-64 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500 text-sm">No events logged yet</p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono">
                  {result}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
