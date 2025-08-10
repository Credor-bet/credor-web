'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Simple connection test to diagnose WebSocket issues
 */
export function ConnectionTest() {
  const [testResults, setTestResults] = useState<string[]>([])

  const addResult = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setTestResults(prev => [...prev, `[${timestamp}] ${message}`])
  }

  const testBasicConnection = () => {
    addResult('🔍 Testing basic WebSocket connection...')
    
    try {
      const ws = new WebSocket('wss://match.credorr.com/ws/')
      
      const timeout = setTimeout(() => {
        addResult('⏰ Connection timeout after 5 seconds')
        ws.close()
      }, 5000)
      
      ws.onopen = () => {
        clearTimeout(timeout)
        addResult('✅ WebSocket connection opened successfully!')
        
        // Test sending a simple message
        try {
          ws.send(JSON.stringify({ ping: 'test' }))
          addResult('📤 Sent test ping message')
        } catch (error) {
          addResult(`❌ Error sending message: ${error}`)
        }
        
        // Close after a moment
        setTimeout(() => {
          ws.close(1000, 'Test complete')
        }, 1000)
      }
      
      ws.onmessage = (event) => {
        addResult(`📨 Received message: ${event.data}`)
      }
      
      ws.onerror = (error) => {
        clearTimeout(timeout)
        addResult(`❌ WebSocket error: ${error}`)
        console.error('WebSocket error details:', error)
      }
      
      ws.onclose = (event) => {
        clearTimeout(timeout)
        addResult(`🔒 Connection closed: code=${event.code}, reason="${event.reason}", clean=${event.wasClean}`)
      }
      
    } catch (error) {
      addResult(`💥 Failed to create WebSocket: ${error}`)
    }
  }

  const testAlternativeUrls = () => {
    addResult('🔍 Testing alternative WebSocket URLs...')
    
    const urls = [
      'wss://match.credorr.com/ws/',
      'ws://match.credorr.com/ws/',
      'wss://match.credorr.com:443/ws/',
      'wss://match.credorr.com/websocket',
      'wss://match.credorr.com/ws'
    ]
    
    urls.forEach((url, index) => {
      setTimeout(() => {
        addResult(`Testing URL ${index + 1}: ${url}`)
        
        try {
          const ws = new WebSocket(url)
          
          const timeout = setTimeout(() => {
            addResult(`  ⏰ ${url} - timeout`)
            ws.close()
          }, 3000)
          
          ws.onopen = () => {
            clearTimeout(timeout)
            addResult(`  ✅ ${url} - SUCCESS!`)
            ws.close(1000, 'Test')
          }
          
          ws.onerror = () => {
            clearTimeout(timeout)
            addResult(`  ❌ ${url} - failed`)
          }
          
          ws.onclose = (event) => {
            if (event.code !== 1000) {
              addResult(`  🔒 ${url} - closed (${event.code})`)
            }
          }
          
        } catch (error) {
          addResult(`  💥 ${url} - exception: ${error}`)
        }
      }, index * 1000)
    })
  }

  const testHttpEndpoint = async () => {
    addResult('🌐 Testing HTTP endpoint accessibility...')
    
    const endpoints = [
      'https://match.credorr.com/health',
      'https://match.credorr.com/',
      'https://match.credorr.com/ws/fixtures'
    ]
    
    for (const endpoint of endpoints) {
      try {
        addResult(`Testing: ${endpoint}`)
        const response = await fetch(endpoint, {
          method: 'GET',
          mode: 'cors'
        })
        
        if (response.ok) {
          const contentType = response.headers.get('content-type')
          let data = await response.text()
          if (data.length > 100) data = data.substring(0, 100) + '...'
          addResult(`  ✅ ${response.status} - ${contentType} - ${data}`)
        } else {
          addResult(`  ⚠️ ${response.status} ${response.statusText}`)
        }
      } catch (error) {
        addResult(`  ❌ Failed: ${error}`)
      }
    }
  }

  const testWebSocketUpgrade = async () => {
    addResult('🔧 Testing WebSocket upgrade headers...')
    
    try {
      const response = await fetch('https://match.credorr.com/ws/', {
        method: 'GET',
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'upgrade',
          'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
          'Sec-WebSocket-Version': '13'
        }
      })
      
      addResult(`HTTP upgrade attempt: ${response.status} ${response.statusText}`)
      
      const upgradeHeader = response.headers.get('upgrade')
      const connectionHeader = response.headers.get('connection')
      
      if (upgradeHeader) {
        addResult(`  Upgrade header: ${upgradeHeader}`)
      }
      if (connectionHeader) {
        addResult(`  Connection header: ${connectionHeader}`)
      }
      
      if (response.status === 101) {
        addResult('  ✅ Server supports WebSocket upgrade!')
      } else if (response.status === 404) {
        addResult('  ❌ WebSocket endpoint not found')
      } else {
        addResult('  ⚠️ WebSocket upgrade not supported or misconfigured')
      }
      
    } catch (error) {
      addResult(`❌ WebSocket upgrade test failed: ${error}`)
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>WebSocket Connection Diagnostics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={testBasicConnection} variant="default">
            Test Basic Connection
          </Button>
          <Button onClick={testAlternativeUrls} variant="outline">
            Test Alternative URLs
          </Button>
          <Button onClick={testHttpEndpoint} variant="outline">
            Test HTTP Endpoints
          </Button>
          <Button onClick={testWebSocketUpgrade} variant="outline">
            Test WebSocket Upgrade
          </Button>
          <Button onClick={clearResults} variant="ghost" size="sm">
            Clear
          </Button>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Test Results:</h4>
          <div className="bg-gray-50 p-3 rounded-lg max-h-64 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500 text-sm">No tests run yet</p>
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
