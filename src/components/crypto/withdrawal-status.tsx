'use client'

import { useState, useEffect } from 'react'
import { cryptoService, WithdrawalResponse } from '@/lib/crypto-service'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface WithdrawalStatusProps {
  transactionId: string
  onComplete?: (status: WithdrawalResponse) => void
}

export function WithdrawalStatus({ transactionId, onComplete }: WithdrawalStatusProps) {
  const [status, setStatus] = useState<WithdrawalResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStatus = async () => {
    try {
      const data = await cryptoService.getWithdrawalStatus(transactionId)
      setStatus(data)
      setError('')
      
      // Check if withdrawal is complete or failed
      if (data.status === 'completed' || data.status === 'failed') {
        if (onComplete) {
          onComplete(data)
        }
        return true // Signal to stop polling
      }
      return false
    } catch (err) {
      console.error('Failed to fetch withdrawal status:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch status')
      return false
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!transactionId) return

    fetchStatus()
    
    // Poll every 10 seconds until completed/failed
    const interval = setInterval(async () => {
      const shouldStop = await fetchStatus()
      if (shouldStop) {
        clearInterval(interval)
      }
    }, 10000)
    
    return () => clearInterval(interval)
  }, [transactionId])

  if (loading && !status) {
    return (
      <Card className="p-4 bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Checking withdrawal status...</span>
        </div>
      </Card>
    )
  }

  if (error && !status) {
    return (
      <Card className="p-4 bg-red-50 border-red-200">
        <p className="text-sm text-red-800">Error: {error}</p>
      </Card>
    )
  }

  if (!status) return null

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅'
      case 'failed': return '❌'
      case 'pending': return '⏳'
      default: return 'ℹ️'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card className={`p-4 border ${getStatusColor(status.status)}`}>
      <div className="flex items-start space-x-3">
        <span className="text-2xl">{getStatusIcon(status.status)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-sm">Status: {status.status}</p>
            <Badge className={getStatusColor(status.status)}>
              {status.status.toUpperCase()}
            </Badge>
          </div>
          
          {status.transaction_hash && (
            <p className="text-xs text-gray-600 mt-1 break-all">
              TX Hash: {status.transaction_hash}
            </p>
          )}
          
          {status.metadata?.circle_state && (
            <p className="text-xs text-gray-600 mt-1">
              Circle State: {status.metadata.circle_state}
            </p>
          )}
          
          {status.metadata?.withdrawal_stage && (
            <p className="text-xs text-gray-600 mt-1">
              Stage: {status.metadata.withdrawal_stage}
            </p>
          )}
          
          {status.status === 'pending' && (
            <p className="text-xs text-gray-500 mt-2">
              Processing on blockchain. This usually takes 5-15 minutes.
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}

