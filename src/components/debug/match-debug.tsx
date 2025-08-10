'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMatchStore } from '@/lib/store'
import { useWebSocket } from '@/hooks/use-websocket'

/**
 * Debug component to trace match score issues
 */
export function MatchDebug() {
  const { liveMatches, isConnected } = useMatchStore()
  const [debugLog, setDebugLog] = useState<string[]>([])
  
  // Subscribe to all events for debugging
  useWebSocket({
    enableNotifications: false,
    enableErrorToasts: false
  })

  useEffect(() => {
    const now = new Date().toLocaleTimeString()
    const matches = Array.from(liveMatches.entries())
    
    if (matches.length > 0) {
      const logEntry = `${now}: ${matches.length} live matches tracked`
      setDebugLog(prev => [...prev.slice(-20), logEntry])
      
      matches.forEach(([fixtureId, match]) => {
        const detailEntry = `  ${fixtureId}: ${match.home_score}-${match.away_score} (${match.status})`
        setDebugLog(prev => [...prev.slice(-20), detailEntry])
      })
    }
  }, [liveMatches])

  const clearLog = () => setDebugLog([])

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">🐛 Match Debug Tracker</CardTitle>
        <div className="text-sm text-muted-foreground">
          Connection: {isConnected ? '🟢 Connected' : '🔴 Disconnected'} | 
          Live Matches: {liveMatches.size}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Current Live Matches</h4>
            <button 
              onClick={clearLog}
              className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
            >
              Clear Log
            </button>
          </div>
          
          {liveMatches.size === 0 ? (
            <p className="text-gray-500 text-sm">No live matches currently tracked</p>
          ) : (
            <div className="space-y-2">
              {Array.from(liveMatches.entries()).map(([fixtureId, match]) => (
                <div key={fixtureId} className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm font-mono">
                    <div className="font-bold">Fixture: {fixtureId}</div>
                    <div>Score: {match.home_score}-{match.away_score}</div>
                    <div>Status: {match.status}</div>
                    <div>Last Updated: {match.last_updated}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Raw: {JSON.stringify(match)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <h4 className="font-medium">Debug Log</h4>
            <div className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono max-h-48 overflow-y-auto">
              {debugLog.length === 0 ? (
                <div className="text-gray-500">Waiting for events...</div>
              ) : (
                debugLog.map((entry, i) => (
                  <div key={i}>{entry}</div>
                ))
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
