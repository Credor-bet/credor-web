'use client'

import { useState, useEffect } from 'react'
import { cryptoService, PendingDeposit } from '@/lib/crypto-service'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PendingDepositsNotificationProps {
  onDepositComplete?: () => void
}

export function PendingDepositsNotification({ onDepositComplete }: PendingDepositsNotificationProps) {
  const [pendingDeposits, setPendingDeposits] = useState<PendingDeposit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchPendingDeposits = async () => {
    try {
      const deposits = await cryptoService.getPendingDeposits()
      setPendingDeposits(deposits)
      setError('')
    } catch (err) {
      setError('Failed to check pending deposits')
      console.error('Error fetching pending deposits:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingDeposits()
    
    // Check for updates every 30 seconds
    const interval = setInterval(fetchPendingDeposits, 30000)
    return () => clearInterval(interval)
  }, [])

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
            Your deposits are being confirmed on the blockchain. This usually takes 1-5 minutes.
          </p>
          
          <div className="space-y-2">
            {pendingDeposits.map((deposit) => (
              <div key={deposit.transaction_id} className="bg-white p-3 rounded border border-blue-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">
                      ${deposit.amount} USDC
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {deposit.message}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      TX: {deposit.tx_hash.substring(0, 8)}...
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {deposit.estimated_completion}
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

