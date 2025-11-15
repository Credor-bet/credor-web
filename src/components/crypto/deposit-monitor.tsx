'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/lib/store'
import { cryptoService, CircleDeposit } from '@/lib/crypto-service'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface DepositMonitorProps {
  onDepositComplete?: (deposit: CircleDeposit) => void
}

// Circle deposit states that are considered pending
const PENDING_STATES: CircleDeposit['state'][] = ['INITIATED', 'QUEUED', 'CLEARED', 'SENT', 'CONFIRMED']

export function DepositMonitor({ onDepositComplete }: DepositMonitorProps) {
  const [deposits, setDeposits] = useState<CircleDeposit[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()

  const fetchDeposits = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      // Fetch Circle deposits and filter for pending states
      const allDeposits = await cryptoService.getCircleDeposits(user.id, 50, 0)
      const pending = allDeposits.filter(deposit => 
        deposit.circle_tx_type === 'INBOUND' && 
        PENDING_STATES.includes(deposit.state) &&
        deposit.transactions?.status !== 'completed'
      )
      setDeposits(pending)
      
      // Check if any deposits were completed
      const completed = allDeposits.filter(deposit => 
        deposit.state === 'COMPLETE' && 
        deposit.transactions?.status === 'completed'
      )
      if (completed.length > 0 && onDepositComplete) {
        onDepositComplete(completed[0])
      }
    } catch (err) {
      // Silently fail - deposits are processed automatically via webhooks
      console.log('Deposit monitoring not available:', err)
      setDeposits([])
    } finally {
      setLoading(false)
    }
  }, [user?.id, onDepositComplete])

  useEffect(() => {
    if (user?.id) {
      fetchDeposits()
      
      // Poll every 10 seconds for new deposits (as per guide)
      const interval = setInterval(fetchDeposits, 10000)
      return () => clearInterval(interval)
    }
  }, [user?.id, fetchDeposits])

  if (loading) {
    return (
      <Card className="p-4 bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Checking deposits...</span>
        </div>
      </Card>
    )
  }

  if (deposits.length === 0) {
    return null
  }

  const getStateDisplay = (state: string) => {
    switch (state) {
      case 'INITIATED': return '🔄 Initiated'
      case 'QUEUED': return '⏳ Queued'
      case 'CLEARED': return '✅ Cleared'
      case 'SENT': return '📤 Sent'
      case 'CONFIRMED': return '✔️ Confirming'
      case 'COMPLETE': return '✅ Complete'
      default: return state
    }
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case 'COMPLETE': return 'bg-green-100 text-green-800'
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800'
      case 'CLEARED': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card className="p-4 bg-blue-50 border-blue-200">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm text-blue-900">Processing Deposits</h4>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {deposits.length}
          </Badge>
        </div>
        <p className="text-xs text-blue-700">
          Your deposits are being processed by Circle. This usually takes 1-5 minutes after blockchain confirmation.
        </p>
        
        <div className="space-y-2">
          {deposits.map((deposit) => (
            <div key={deposit.id} className="bg-white p-3 rounded border border-blue-200">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">
                    ${deposit.amount_usd.toFixed(2)} USDC
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge className={getStateColor(deposit.state)} variant="secondary">
                      {getStateDisplay(deposit.state)}
                    </Badge>
                  </div>
                  {deposit.tx_hash && (
                    <p className="text-xs text-gray-500 mt-1 font-mono">
                      TX: {deposit.tx_hash.substring(0, 10)}...
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {new Date(deposit.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

