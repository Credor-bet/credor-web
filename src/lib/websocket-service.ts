'use client'

import { getWebSocketUrl } from './websocket-config'

// WebSocket service for real-time match updates
export interface MatchUpdate {
  type: 'score_update' | 'match_start' | 'match_end' | 'match_cancelled' | 'goal'
  fixture_id: string
  home_score?: number
  away_score?: number
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  result?: 'home_win' | 'away_win' | 'draw'
  timestamp: string
  team?: { id: string; name: string } // For goal events
}

export interface WebSocketError {
  error: string
}

export type WebSocketMessage = MatchUpdate | WebSocketError

interface WebSocketCallbacks {
  onMessage?: (message: MatchUpdate) => void
  onError?: (error: string) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

export class WebSocketService {
  private ws: WebSocket | null = null
  private baseUrl: string
  private subscriptions = new Set<string>()
  private callbacks: WebSocketCallbacks = {}
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 5000
  private isConnecting = false
  private shouldReconnect = true

  constructor() {
    this.baseUrl = getWebSocketUrl()
  }

  /**
   * Set event callbacks
   */
  setCallbacks(callbacks: WebSocketCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  /**
   * Connect to WebSocket server with fallback URLs
   */
  async connect(): Promise<boolean> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return true
    }

    this.isConnecting = true

    // Multiple URLs to try
    const fallbackUrls = [
      this.baseUrl,
      this.baseUrl.replace('/ws/', '/ws'),  // Try without trailing slash
      this.baseUrl.replace('wss://', 'ws://'),  // Try non-secure as fallback
    ]

    for (const url of fallbackUrls) {
      console.log(`🔄 Attempting WebSocket connection to: ${url}`)
      
      const success = await this.tryConnect(url)
      if (success) {
        this.isConnecting = false
        return true
      }
      
      // Wait a bit before trying next URL
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    this.isConnecting = false
    console.error('❌ All WebSocket connection attempts failed')
    this.callbacks.onError?.('All connection attempts failed')
    return false
  }

  /**
   * Try connecting to a specific WebSocket URL
   */
  private async tryConnect(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(url)
        let resolved = false

        const timeout = setTimeout(() => {
          if (!resolved) {
            console.log(`⏰ Connection timeout for ${url}`)
            ws.close()
            resolved = true
            resolve(false)
          }
        }, 5000)

        ws.onopen = () => {
          if (!resolved) {
            console.log(`✅ WebSocket connected to: ${url}`)
            clearTimeout(timeout)
            this.ws = ws
            this.baseUrl = url  // Update to successful URL
            this.reconnectAttempts = 0
            
            // Set up message handlers
            this.setupMessageHandlers(ws)
            
            // Add a small delay before calling onConnect to ensure connection is stable
            setTimeout(() => {
              this.callbacks.onConnect?.()
              
              // Re-subscribe to any existing subscriptions
              this.subscriptions.forEach(fixtureId => {
                this.sendSubscription(fixtureId)
              })
            }, 100)
            
            resolved = true
            resolve(true)
          }
        }

        ws.onerror = (error) => {
          if (!resolved) {
            console.log(`❌ WebSocket connection failed for ${url}:`, error)
            clearTimeout(timeout)
            resolved = true
            resolve(false)
          }
        }

        ws.onclose = (event) => {
          if (!resolved) {
            console.log(`🔒 WebSocket connection closed for ${url}:`, {
              code: event.code,
              reason: event.reason,
              wasClean: event.wasClean
            })
            clearTimeout(timeout)
            resolved = true
            resolve(false)
          }
        }

      } catch (error) {
        console.error(`💥 Error creating WebSocket for ${url}:`, error)
        resolve(false)
      }
    })
  }

  /**
   * Setup message handlers for the WebSocket connection
   */
  private setupMessageHandlers(ws: WebSocket) {
    ws.onmessage = (event) => {
      console.log('🔔 RAW WebSocket message received:', event.data)
      
      try {
        const data: WebSocketMessage = JSON.parse(event.data)
        console.log('📩 Parsed WebSocket message:', data)
        
        if ('error' in data) {
          console.error('❌ WebSocket server error:', data.error)
          this.callbacks.onError?.(data.error)
        } else {
          console.log('✅ Processing match update:', data.type, data)
          console.log('🎯 Calling onMessage callback with data:', data)
          this.callbacks.onMessage?.(data)
        }
      } catch (error) {
        console.error('💥 Error parsing WebSocket message:', error, 'Raw data:', event.data)
        
        // Try to handle malformed JSON by extracting what we can
        try {
          const rawString = event.data.toString()
          if (rawString.includes('fixture_id') && rawString.includes('type')) {
            console.log('🔧 Attempting to repair malformed message...')
            // This is a basic attempt - in production you'd want more sophisticated parsing
            this.callbacks.onError?.('Received malformed message from server')
          }
        } catch (repairError) {
          console.error('💀 Complete message parsing failure:', repairError)
        }
        
        this.callbacks.onError?.('Failed to parse message')
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket connection error:', error)
      this.callbacks.onError?.('Connection error')
    }

    ws.onclose = (event) => {
      console.log('WebSocket connection closed:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      })
      this.callbacks.onDisconnect?.()
      
      // Attempt to reconnect if it wasn't a manual close
      // Code 1000 = normal closure, 1001 = going away
      // Also reconnect on 1006 (abnormal closure, often due to server errors)
      if (this.shouldReconnect && ![1000, 1001].includes(event.code)) {
        if (event.code === 1006) {
          console.log('⚠️ Connection closed abnormally (likely server error), attempting quick reconnect...')
          // Faster reconnect for server errors
          setTimeout(() => {
            if (this.shouldReconnect) {
              this.connect()
            }
          }, 2000) // 2 second delay instead of exponential backoff
        } else {
          console.log('Connection closed unexpectedly, attempting to reconnect...')
          this.attemptReconnect()
        }
      }
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    this.shouldReconnect = false
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect')
      this.ws = null
    }
    
    this.subscriptions.clear()
    this.reconnectAttempts = 0
  }

  /**
   * Subscribe to match updates by fixture ID
   */
  async subscribeToMatch(fixtureId: string): Promise<boolean> {
    if (!fixtureId) {
      console.warn('Cannot subscribe: fixtureId is required')
      return false
    }

    // Ensure connection is established
    if (this.ws?.readyState !== WebSocket.OPEN) {
      const connected = await this.connect()
      if (!connected) {
        console.error('Failed to connect before subscribing')
        return false
      }
    }

    this.subscriptions.add(fixtureId)
    return this.sendSubscription(fixtureId)
  }

  /**
   * Unsubscribe from match updates
   */
  unsubscribeFromMatch(fixtureId: string) {
    this.subscriptions.delete(fixtureId)
    // Note: The WebSocket API doesn't support unsubscribe, 
    // so we just remove it from our local tracking
  }

  /**
   * Get connection status
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * Get current subscriptions
   */
  get currentSubscriptions(): Set<string> {
    return new Set(this.subscriptions)
  }

  /**
   * Send subscription message to server
   */
  private sendSubscription(fixtureId: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send subscription for:', fixtureId)
      return false
    }

    try {
      const message = { subscribe: fixtureId }
      const messageStr = JSON.stringify(message)
      console.log('Sending subscription message:', messageStr)
      this.ws.send(messageStr)
      console.log(`Successfully subscribed to fixture: ${fixtureId}`)
      return true
    } catch (error) {
      console.error('Error sending subscription for', fixtureId, ':', error)
      return false
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      this.callbacks.onError?.('Connection lost - max retry attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect()
      }
    }, delay)
  }
}

// Singleton instance
let wsServiceInstance: WebSocketService | null = null

/**
 * Get or create the WebSocket service instance
 */
export function getWebSocketService(): WebSocketService {
  if (!wsServiceInstance) {
    wsServiceInstance = new WebSocketService()
  }
  return wsServiceInstance
}

/**
 * Clean up WebSocket service (useful for testing or manual cleanup)
 */
export function resetWebSocketService() {
  if (wsServiceInstance) {
    wsServiceInstance.disconnect()
    wsServiceInstance = null
  }
}
