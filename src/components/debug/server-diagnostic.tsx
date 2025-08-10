'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ServerEvent {
  timestamp: string
  type: 'connection' | 'message' | 'error' | 'disconnect'
  data: any
  raw?: string
}

/**
 * Advanced server diagnostic component to monitor WebSocket behavior
 */
export function ServerDiagnostic() {
  const [events, setEvents] = useState<ServerEvent[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [connectionStats, setConnectionStats] = useState({
    totalConnections: 0,
    totalDisconnects: 0,
    totalMessages: 0,
    totalErrors: 0,
    avgConnectionDuration: 0
  })
  const wsRef = useRef<WebSocket | null>(null)
  const lastConnectTime = useRef<number>(0)

  const addEvent = (type: ServerEvent['type'], data: any, raw?: string) => {
    const event: ServerEvent = {
      timestamp: new Date().toISOString(),
      type,
      data,
      raw
    }
    
    setEvents(prev => [event, ...prev.slice(0, 49)]) // Keep last 50 events
    
    // Update stats
    setConnectionStats(prev => {
      const newStats = { ...prev }
      
      switch (type) {
        case 'connection':
          newStats.totalConnections++
          lastConnectTime.current = Date.now()
          break
        case 'disconnect':
          newStats.totalDisconnects++
          if (lastConnectTime.current > 0) {
            const duration = Date.now() - lastConnectTime.current
            newStats.avgConnectionDuration = 
              (newStats.avgConnectionDuration * (newStats.totalDisconnects - 1) + duration) / newStats.totalDisconnects
          }
          break
        case 'message':
          newStats.totalMessages++
          break
        case 'error':
          newStats.totalErrors++
          break
      }
      
      return newStats
    })
  }

  const startMonitoring = () => {
    if (isMonitoring) return
    
    setIsMonitoring(true)
    addEvent('connection', { action: 'start_monitoring' })
    
    const connectWebSocket = () => {
      const ws = new WebSocket('wss://match.credorr.com/ws')
      wsRef.current = ws
      
      ws.onopen = () => {
        addEvent('connection', { 
          url: 'wss://match.credorr.com/ws',
          readyState: ws.readyState,
          protocol: ws.protocol
        })
      }
      
      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data)
          addEvent('message', parsed, event.data)
        } catch (error) {
          addEvent('error', { 
            type: 'parse_error', 
            error: error.message,
            rawData: event.data
          }, event.data)
        }
      }
      
      ws.onerror = (error) => {
        addEvent('error', { 
          type: 'websocket_error',
          error: error.toString(),
          readyState: ws.readyState
        })
      }
      
      ws.onclose = (event) => {
        addEvent('disconnect', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        })
        
        // Auto-reconnect if monitoring is still active
        if (isMonitoring && event.code !== 1000) {
          setTimeout(() => {
            if (isMonitoring) {
              connectWebSocket()
            }
          }, 3000)
        }
      }
    }
    
    connectWebSocket()
  }

  const stopMonitoring = () => {
    setIsMonitoring(false)
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual stop')
      wsRef.current = null
    }
    addEvent('disconnect', { action: 'stop_monitoring' })
  }

  const clearEvents = () => {
    setEvents([])
    setConnectionStats({
      totalConnections: 0,
      totalDisconnects: 0,
      totalMessages: 0,
      totalErrors: 0,
      avgConnectionDuration: 0
    })
  }

  const testSubscription = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const testMessage = { subscribe: 'test-fixture-id' }
      wsRef.current.send(JSON.stringify(testMessage))
      addEvent('message', { type: 'sent', data: testMessage })
    } else {
      addEvent('error', { type: 'no_connection', message: 'WebSocket not connected' })
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmount')
      }
    }
  }, [])

  const getEventBadgeColor = (type: ServerEvent['type']) => {
    switch (type) {
      case 'connection': return 'bg-green-500'
      case 'message': return 'bg-blue-500'
      case 'error': return 'bg-red-500'
      case 'disconnect': return 'bg-orange-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Server WebSocket Diagnostic
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-sm text-muted-foreground">
              {isMonitoring ? 'Monitoring' : 'Stopped'}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            variant={isMonitoring ? "outline" : "default"}
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </Button>
          <Button onClick={testSubscription} variant="outline" disabled={!isMonitoring}>
            Test Subscription
          </Button>
          <Button onClick={clearEvents} variant="ghost" size="sm">
            Clear Events
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{connectionStats.totalConnections}</div>
            <div className="text-sm text-muted-foreground">Connections</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{connectionStats.totalDisconnects}</div>
            <div className="text-sm text-muted-foreground">Disconnects</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{connectionStats.totalMessages}</div>
            <div className="text-sm text-muted-foreground">Messages</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{connectionStats.totalErrors}</div>
            <div className="text-sm text-muted-foreground">Errors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {connectionStats.avgConnectionDuration > 0 ? `${Math.round(connectionStats.avgConnectionDuration / 1000)}s` : '-'}
            </div>
            <div className="text-sm text-muted-foreground">Avg Duration</div>
          </div>
        </div>

        {/* Events Log */}
        <div className="space-y-2">
          <h4 className="font-medium">Real-time Events ({events.length}):</h4>
          <div className="bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-gray-500 text-sm p-4">No events recorded yet</p>
            ) : (
              <div className="space-y-2 p-3">
                {events.map((event, index) => (
                  <div key={index} className="border-l-4 border-gray-200 pl-3 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`${getEventBadgeColor(event.type)} text-white text-xs`}>
                        {event.type}
                      </Badge>
                      <span className="text-xs text-gray-500 font-mono">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm">
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                      {event.raw && event.raw !== JSON.stringify(event.data) && (
                        <details className="mt-1">
                          <summary className="text-xs text-gray-600 cursor-pointer">Raw data</summary>
                          <pre className="text-xs bg-red-50 p-2 rounded mt-1 overflow-x-auto">
                            {event.raw}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Server Issues Detection */}
        {connectionStats.totalErrors > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-2">⚠️ Detected Issues:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              {connectionStats.totalErrors > connectionStats.totalMessages / 2 && (
                <li>• High error rate detected - server may have JSON serialization issues</li>
              )}
              {connectionStats.totalDisconnects > connectionStats.totalConnections * 0.8 && (
                <li>• Frequent disconnections - server may be dropping connections due to errors</li>
              )}
              {connectionStats.avgConnectionDuration < 10000 && connectionStats.totalDisconnects > 2 && (
                <li>• Short connection duration - indicates server-side issues</li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
