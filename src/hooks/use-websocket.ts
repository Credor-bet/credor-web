'use client'

import { useEffect, useRef, useCallback } from 'react'
import { getWebSocketService, MatchUpdate } from '@/lib/websocket-service'
import { useMatchStore } from '@/lib/store'
import { toast } from 'sonner'

interface UseWebSocketOptions {
  autoConnect?: boolean
  enableNotifications?: boolean
  enableErrorToasts?: boolean
}

interface UseWebSocketReturn {
  isConnected: boolean
  subscribeToMatch: (fixtureId: string) => Promise<boolean>
  unsubscribeFromMatch: (fixtureId: string) => void
  connect: () => Promise<boolean>
  disconnect: () => void
  connectedFixtures: Set<string>
}

/**
 * Custom hook for managing WebSocket connection and match subscriptions
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    autoConnect = true,
    enableNotifications = true,
    enableErrorToasts = true
  } = options

  const wsService = useRef(getWebSocketService())
  const { 
    updateMatch, 
    addConnectedFixture, 
    removeConnectedFixture, 
    setConnectionStatus,
    isConnected,
    connectedFixtures,
    getLiveMatch
  } = useMatchStore()

  // Handle incoming match updates
  const handleMatchUpdate = useCallback((update: MatchUpdate) => {
    console.log('🎣 handleMatchUpdate called with:', update)
    console.log('🔄 About to call updateMatch in store...')
    
    updateMatch(update)
    
    console.log('✅ updateMatch completed for fixture:', update.fixture_id)
    
    if (enableNotifications) {
      console.log('🔔 Processing notifications for update type:', update.type)
      // Show toast notifications for important events
      switch (update.type) {
        case 'match_start':
          toast.info(`⚽ Match started!`, {
            duration: 3000,
          })
          break
        case 'goal':
          if (update.home_score !== undefined && update.away_score !== undefined) {
            const teamName = update.team?.name || 'Team'
            toast.success(`⚽ GOAL! ${teamName} scores! ${update.home_score}-${update.away_score}`, {
              duration: 4000,
            })
          }
          break
        case 'score_update':
          if (update.home_score !== undefined && update.away_score !== undefined) {
            toast.success(`📊 Score update: ${update.home_score}-${update.away_score}`, {
              duration: 2000,
            })
          }
          break
        case 'match_end':
          // Get the current match data to show final score
          const endedMatch = getLiveMatch ? getLiveMatch(update.fixture_id) : null
          const finalScore = endedMatch ? `${endedMatch.home_score}-${endedMatch.away_score}` : ''
          const resultText = update.result 
            ? (update.result === 'home_win' ? 'Home Win' : update.result === 'away_win' ? 'Away Win' : 'Draw')
            : ''
          
          toast.info(`🏁 Match ended! ${finalScore} ${resultText}`.trim(), {
            duration: 6000,
          })
          break
        case 'match_cancelled':
          toast.warning(`❌ Match cancelled`, {
            duration: 4000,
          })
          break
      }
    } else {
      console.log('🔕 Notifications disabled, skipping toast')
    }
  }, [updateMatch, enableNotifications, getLiveMatch])

  // Handle connection events
  const handleConnect = useCallback(() => {
    setConnectionStatus(true)
    if (enableNotifications) {
      toast.success('Connected to live match updates', {
        duration: 2000,
      })
    }
  }, [setConnectionStatus, enableNotifications])

  const handleDisconnect = useCallback(() => {
    setConnectionStatus(false)
    if (enableNotifications) {
      toast.info('Disconnected from live match updates', {
        duration: 2000,
      })
    }
  }, [setConnectionStatus, enableNotifications])

  const handleError = useCallback((error: string) => {
    console.error('WebSocket error:', error)
    if (enableErrorToasts) {
      toast.error(`Connection error: ${error}`, {
        duration: 4000,
      })
    }
  }, [enableErrorToasts])

  // Setup WebSocket callbacks
  useEffect(() => {
    console.log('🔧 Setting up WebSocket callbacks...')
    const service = wsService.current
    
    const callbacks = {
      onMessage: handleMatchUpdate,
      onConnect: handleConnect,
      onDisconnect: handleDisconnect,
      onError: handleError,
    }
    
    console.log('📋 WebSocket callbacks:', {
      onMessage: !!callbacks.onMessage,
      onConnect: !!callbacks.onConnect,
      onDisconnect: !!callbacks.onDisconnect,
      onError: !!callbacks.onError,
    })
    
    service.setCallbacks(callbacks)

    // Auto-connect if enabled
    if (autoConnect) {
      console.log('🚀 Auto-connecting to WebSocket...')
      service.connect().catch((error) => {
        console.error('❌ Failed to auto-connect to WebSocket:', error)
      })
    }

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up WebSocket on unmount...')
      if (autoConnect) {
        service.disconnect()
      }
    }
  }, [autoConnect, handleMatchUpdate, handleConnect, handleDisconnect, handleError])

  // Subscribe to a match
  const subscribeToMatch = useCallback(async (fixtureId: string): Promise<boolean> => {
    console.log(`🚀 Attempting to subscribe to fixture: ${fixtureId}`)
    const service = wsService.current
    console.log(`📡 WebSocket connection status: ${service.isConnected ? 'CONNECTED' : 'DISCONNECTED'}`)
    
    const success = await service.subscribeToMatch(fixtureId)
    
    if (success) {
      addConnectedFixture(fixtureId)
      console.log(`✅ Successfully subscribed to match: ${fixtureId}`)
    } else {
      console.error(`❌ Failed to subscribe to match: ${fixtureId}`)
      if (enableErrorToasts) {
        toast.error(`Failed to subscribe to match updates for ${fixtureId}`)
      }
    }
    
    return success
  }, [addConnectedFixture, enableErrorToasts])

  // Unsubscribe from a match
  const unsubscribeFromMatch = useCallback((fixtureId: string) => {
    const service = wsService.current
    service.unsubscribeFromMatch(fixtureId)
    removeConnectedFixture(fixtureId)
    console.log(`Unsubscribed from match: ${fixtureId}`)
  }, [removeConnectedFixture])

  // Manual connect
  const connect = useCallback(async (): Promise<boolean> => {
    const service = wsService.current
    return await service.connect()
  }, [])

  // Manual disconnect
  const disconnect = useCallback(() => {
    const service = wsService.current
    service.disconnect()
  }, [])

  return {
    isConnected,
    subscribeToMatch,
    unsubscribeFromMatch,
    connect,
    disconnect,
    connectedFixtures,
  }
}

/**
 * Hook specifically for subscribing to a single match
 * Automatically handles subscription lifecycle
 */
export function useMatchSubscription(fixtureId: string | null, options: UseWebSocketOptions = {}) {
  const { subscribeToMatch, unsubscribeFromMatch, isConnected } = useWebSocket(options)
  const { getLiveMatch } = useMatchStore()

  useEffect(() => {
    if (!fixtureId || !isConnected) return

    let subscribed = false

    const subscribe = async () => {
      const success = await subscribeToMatch(fixtureId)
      subscribed = success
    }

    subscribe()

    return () => {
      if (subscribed && fixtureId) {
        unsubscribeFromMatch(fixtureId)
      }
    }
  }, [fixtureId, isConnected, subscribeToMatch, unsubscribeFromMatch])

  // Return the live match data for this fixture
  const liveMatch = fixtureId ? getLiveMatch(fixtureId) : null

  return {
    liveMatch,
    isConnected,
    isSubscribed: fixtureId ? true : false, // Simplified - assumes subscription if we have fixtureId
  }
}
