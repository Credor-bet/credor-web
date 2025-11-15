'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/lib/store'
import { cryptoService, CircleDeposit } from '@/lib/crypto-service'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PendingDepositsNotificationProps {
  onDepositComplete?: () => void
}

// Circle deposit states that are considered pending
const PENDING_STATES: CircleDeposit['state'][] = ['INITIATED', 'QUEUED', 'CLEARED', 'SENT', 'CONFIRMED']

export function PendingDepositsNotification({ onDepositComplete }: PendingDepositsNotificationProps) {
  const [pendingDeposits, setPendingDeposits] = useState<CircleDeposit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user } = useAuthStore()

  const fetchPendingDeposits = useCallback(async () => {
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
      setPendingDeposits(pending)
      setError('')
      
      // Check if any deposits were completed
      const completed = allDeposits.filter(deposit => 
        deposit.state === 'COMPLETE' && 
        deposit.transactions?.status === 'completed'
      )
      if (completed.length > 0 && onDepositComplete) {
        onDepositComplete()
      }
    } catch (err) {
      // Don't show error for 500/404 responses - just silently fail
      if (err instanceof Error && (
        err.message.includes('500') || 
        err.message.includes('404') ||
        err.message.includes('Server returned HTML') ||
        err.message.includes('No authentication token')
      )) {
        console.log('Pending deposits endpoint not available:', err.message)
        setPendingDeposits([])
      } else {
        setError('Failed to check pending deposits')
        console.error('Error fetching pending deposits:', err)
      }
    } finally {
      setLoading(false)
    }
  }, [user?.id, onDepositComplete])

  useEffect(() => {
    if (user?.id) {
      fetchPendingDeposits()
      
      // Check for updates every 30 seconds
      const interval = setInterval(fetchPendingDeposits, 30000)
      return () => clearInterval(interval)
    }
  }, [user?.id, fetchPendingDeposits])

  if (loading) return null
  if (error) return null
  if (pendingDeposits.length === 0) return null

  return (
    <Card className="p-4 bg-blue-50 border-blue-200">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 text-sm">⏳</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-sm font-medium text-blue-900">
              Processing Deposits
            </h3>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {pendingDeposits.length}
            </Badge>
          </div>
          <p className="text-sm text-blue-700 mb-3">
            Your deposits are being processed by Circle. This usually takes 1-5 minutes after blockchain confirmation.
          </p>
          
          <div className="space-y-2">
            {pendingDeposits.map((deposit) => (
              <div key={deposit.id} className="bg-white p-3 rounded border border-blue-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">
                      ${deposit.amount_usd} USDC
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Status: {deposit.state}
                    </p>
                    {deposit.tx_hash && (
                      <p className="text-xs text-gray-500 mt-1">
                        TX: {deposit.tx_hash.substring(0, 10)}...
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                      {deposit.state}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(deposit.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}


