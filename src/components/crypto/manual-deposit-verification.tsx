'use client'

import { useState } from 'react'
import { cryptoService } from '@/lib/crypto-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ManualDepositVerificationProps {
  onDepositVerified?: (txHash: string) => void
}

export function ManualDepositVerification({ onDepositVerified }: ManualDepositVerificationProps) {
  const [txHash, setTxHash] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    status: 'success' | 'duplicate' | 'not_found' | 'not_your_wallet' | 'error'
    message?: string
    reason?: string
  } | null>(null)

  const verifyDeposit = async () => {
    if (!txHash.trim()) return

    try {
      setLoading(true)
      setResult(null)
      
      const response = await cryptoService.verifyDeposit({
        tx_hash: txHash.trim()
      })
      
      setResult({
        status: response.status,
        message: response.message,
        reason: response.status !== 'success' ? response.message : undefined
      })
      
      if (response.status === 'success' && onDepositVerified) {
        onDepositVerified(txHash)
      }
    } catch (err) {
      setResult({
        status: 'error',
        reason: err instanceof Error ? err.message : 'Verification failed'
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200'
      case 'duplicate': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'not_found': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'not_your_wallet': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-red-100 text-red-800 border-red-200'
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'success': return '✅ Deposit verified and processed'
      case 'duplicate': return '⚠️ Transaction already recorded'
      case 'not_found': return '⚠️ Transaction not found in Circle for your wallet'
      case 'not_your_wallet': return '⚠️ This transaction does not belong to your wallet'
      default: return '❌ Verification failed'
    }
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Manual Deposit Verification
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Circle automatically processes deposits to your wallet address. Use this tool only if Circle webhooks fail to process your deposit automatically.
          </p>
          <p className="text-sm text-gray-500">
            Enter your transaction hash below to manually verify and process the deposit.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="txHash" className="text-sm font-medium text-gray-700">
            Transaction Hash
          </label>
          <Input
            id="txHash"
            type="text"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="0x..."
            className="font-mono text-sm"
          />
        </div>

        <Button 
          onClick={verifyDeposit} 
          disabled={loading || !txHash.trim()}
          className="w-full"
        >
          {loading ? 'Verifying...' : 'Verify Deposit'}
        </Button>

        {result && (
          <Card className={`p-3 border ${getStatusColor(result.status)}`}>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">
                {getStatusMessage(result.status)}
              </span>
              <Badge variant="outline" className={getStatusColor(result.status)}>
                {result.status}
              </Badge>
            </div>
            {result.message && (
              <p className="text-sm mt-1 text-gray-600">
                {result.message}
              </p>
            )}
            {result.reason && result.status !== 'success' && (
              <p className="text-sm mt-1 text-gray-600">
                {result.reason}
              </p>
            )}
          </Card>
        )}
      </div>
    </Card>
  )
}

