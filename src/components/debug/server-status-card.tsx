'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react'

/**
 * Server status summary card showing the current known issues
 */
export function ServerStatusCard() {
  return (
    <Card className="w-full max-w-4xl border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          Server Status & Known Issues
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm">WebSocket Connection: Working</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm">Match Data Fetching: Working</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm">Live Score Updates: Broken</span>
          </div>
        </div>

        {/* Identified Issues */}
        <div className="space-y-3">
          <h4 className="font-semibold text-orange-800">🔍 Root Cause Analysis:</h4>
          
          <div className="bg-white border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Badge className="bg-red-500 text-white mt-1">Critical</Badge>
              <div>
                <h5 className="font-medium text-red-800">Server-Side JSON Serialization Error</h5>
                <p className="text-sm text-red-700 mt-1">
                  The match server is trying to send datetime objects directly in JSON messages, 
                  which causes a serialization error and disconnects WebSocket clients.
                </p>
                <div className="mt-2 p-2 bg-red-50 rounded text-xs font-mono text-red-800">
                  Error: Object of type datetime is not JSON serializable
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Badge className="bg-orange-500 text-white mt-1">High</Badge>
              <div>
                <h5 className="font-medium text-orange-800">Missing Score Data in Events</h5>
                <p className="text-sm text-orange-700 mt-1">
                  Goal events are sent with `home_score: null` and `away_score: null` instead of 
                  actual score values, preventing score updates from being displayed.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Badge className="bg-yellow-500 text-white mt-1">Medium</Badge>
              <div>
                <h5 className="font-medium text-yellow-800">Automatic Disconnection on Events</h5>
                <p className="text-sm text-yellow-700 mt-1">
                  When matches start and events occur, the server disconnects clients due to the 
                  JSON error, preventing real-time updates from being received.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Workarounds */}
        <div className="space-y-3">
          <h4 className="font-semibold text-orange-800">🔧 Client-Side Workarounds Implemented:</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-800">Auto-Reconnection</span>
              </div>
              <p className="text-sm text-green-700">
                Enhanced reconnection logic with faster retry for server errors (2s vs exponential backoff)
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-800">Fallback URLs</span>
              </div>
              <p className="text-sm text-blue-700">
                Multiple connection URLs tested automatically to find working endpoint
              </p>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-purple-800">Error Recovery</span>
              </div>
              <p className="text-sm text-purple-700">
                Improved error handling for malformed messages and connection failures
              </p>
            </div>
            
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span className="font-medium text-indigo-800">Diagnostics</span>
              </div>
              <p className="text-sm text-indigo-700">
                Comprehensive monitoring tools to track server behavior and connection health
              </p>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">📋 Required Server-Side Fixes:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Fix datetime serialization by converting to ISO strings before JSON encoding</li>
            <li>• Include actual score values in goal and score_update events</li>
            <li>• Add proper error handling to prevent client disconnections</li>
            <li>• Implement message validation to ensure JSON compatibility</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
