'use client'

import { useState, useEffect } from 'react'
import { cryptoService, DepositStatus } from '@/lib/crypto-service'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface DepositStatusCardProps {
  txHash: string
  onComplete?: () => void
}

export function DepositStatusCard({ txHash, onComplete }: DepositStatusCardProps) {
  const [status, setStatus] = useState<DepositStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = async () => {
    try {
      const response = await cryptoService.getDepositStatus(txHash)
      setStatus(response)
      
      // Stop polling if completed or failed
      if (response.status === 'completed' || response.status === 'failed') {
        if (response.status === 'completed' && onComplete) {
          onComplete()
        }
        return true // Signal to stop polling
      }
      return false
    } catch (err) {
      console.error('Failed to fetch deposit status:', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    
    // Poll every 30 seconds until completed/failed
    const interval = setInterval(async () => {
      const shouldStop = await fetchStatus()
      if (shouldStop) {
        clearInterval(interval)
      }
    }, 30000)
    
    return () => clearInterval(interval)
  }, [txHash])

  if (loading) {
    return (
      <Card className="p-4 bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Checking deposit status...</span>
        </div>
      </Card>
    )
  }

  if (!status) return null

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅'
      case 'failed': return '❌'
      case 'processing': return '⏳'
      default: return 'ℹ️'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'failed': return 'bg-red-100 text-red-800 border-red-200'
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Card className={`p-4 border ${getStatusColor(status.status)}`}>
      <div className="flex items-start space-x-3">
        <span className="text-2xl">{getStatusIcon(status.status)}</span>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <p className="font-medium">{status.message}</p>
            <Badge variant="outline" className={getStatusColor(status.status)}>
              {status.status}
            </Badge>
          </div>
          
          {status.data && (
            <div className="text-sm space-y-1">
              <p>Amount: ${status.data.amount} USDC</p>
              <p className="font-mono text-xs text-gray-600">
                TX: {status.data.tx_hash}
              </p>
              
              {status.status === 'completed' && status.data.final_balance && (
                <p className="font-medium text-green-700">
                  New balance: ${status.data.final_balance}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

