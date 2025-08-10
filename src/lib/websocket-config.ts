/**
 * WebSocket Configuration
 * 
 * This file contains configuration for connecting to the match server
 * in different environments.
 */

export const WEBSOCKET_CONFIG = {
  // Production match server
  PRODUCTION_URL: 'wss://match.credorr.com/ws/',
  PRODUCTION_API: 'https://match.credorr.com',
  
  // Development - also use match.credorr.com
  DEVELOPMENT_URL: 'wss://match.credorr.com/ws/',
  DEVELOPMENT_API: 'https://match.credorr.com',
  
  // Local testing (for mock server)
  LOCAL_URL: 'ws://localhost:8000/ws',
  LOCAL_API: 'http://localhost:8000',
  
  // Auto-retry configuration
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 5000,
  
  // Feature flags
  ENABLE_AUTO_CONNECT_PRODUCTION: true,
  ENABLE_AUTO_CONNECT_DEVELOPMENT: true, // Enable auto-connect in development too
} as const

/**
 * Get the appropriate WebSocket URL for the current environment
 */
export function getWebSocketUrl(): string {
  return process.env.NODE_ENV === 'production' 
    ? WEBSOCKET_CONFIG.PRODUCTION_URL 
    : WEBSOCKET_CONFIG.DEVELOPMENT_URL
}

/**
 * Get the appropriate API URL for the current environment
 */
export function getApiUrl(): string {
  return process.env.NODE_ENV === 'production' 
    ? WEBSOCKET_CONFIG.PRODUCTION_API 
    : WEBSOCKET_CONFIG.DEVELOPMENT_API
}

/**
 * Check if auto-connect should be enabled for the current environment
 */
export function shouldAutoConnect(): boolean {
  return process.env.NODE_ENV === 'production' 
    ? WEBSOCKET_CONFIG.ENABLE_AUTO_CONNECT_PRODUCTION 
    : WEBSOCKET_CONFIG.ENABLE_AUTO_CONNECT_DEVELOPMENT
}

/**
 * Get local testing URLs (for mock server)
 */
export function getLocalWebSocketUrl(): string {
  return WEBSOCKET_CONFIG.LOCAL_URL
}

export function getLocalApiUrl(): string {
  return WEBSOCKET_CONFIG.LOCAL_API
}
