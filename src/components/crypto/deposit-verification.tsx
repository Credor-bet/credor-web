'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/store'
import { cryptoService, DepositVerificationResponse } from '@/lib/crypto-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Info,
  ExternalLink,
  Clock,
  DollarSign
} from 'lucide-react'
import { toast } from 'sonner'

interface DepositVerificationProps {
  onDepositVerified?: (result: DepositVerificationResponse) => void
}

export function DepositVerification({ onDepositVerified }: DepositVerificationProps) {
  const [txHash, setTxHash] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<DepositVerificationResponse | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { user } = useAuthStore()

  const handleVerification = async () => {
    if (!txHash.trim()) return

    // Basic transaction hash validation
    if (!txHash.startsWith('0x') || txHash.length !== 66) {
      toast.error('Please enter a valid transaction hash (0x followed by 64 characters)')
      return
    }

    try {
      setIsVerifying(true)
      const result = await cryptoService.verifyDeposit({
        tx_hash: txHash
      })
      
      setVerificationResult(result)
      onDepositVerified?.(result)
      
      // Show appropriate message based on result
      switch (result.status) {
        case 'success':
          toast.success(result.message || 'Deposit verified!')
          break
        case 'duplicate':
          toast.info(result.message || 'This transaction has already been processed.')
          break
        case 'not_found':
          toast.warning(result.message || 'Transaction not found in Circle for your wallet.')
          break
        case 'not_your_wallet':
          toast.warning(result.message || 'This transaction does not belong to your wallet.')
          break
        case 'error':
          toast.error(result.message || 'Failed to process this transaction.')
          break
      }
    } catch (error) {
      console.error('Error verifying deposit:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify deposit'
      toast.error(errorMessage)
    } finally {
      setIsVerifying(false)
    }
  }

  const resetForm = () => {
    setTxHash('')
    setVerificationResult(null)
  }

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      resetForm()
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'duplicate':
        return <Info className="h-5 w-5 text-blue-600" />
      case 'not_found':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case 'not_your_wallet':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800'
      case 'duplicate':
        return 'bg-blue-100 text-blue-800'
      case 'ignored':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'success':
        return 'Deposit successfully processed and credited to your account'
      case 'duplicate':
        return 'This transaction has already been processed'
      case 'not_found':
        return 'Transaction not found in Circle for your wallet'
      case 'not_your_wallet':
        return 'This transaction does not belong to your wallet'
      case 'error':
        return 'Failed to process this transaction'
      default:
        return 'Unknown status'
    }
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Search className="h-4 w-4 mr-2" />
          Verify Deposit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Verify Deposit</span>
          </DialogTitle>
          <DialogDescription>
            Advanced verification for dispute resolution and manual processing when Circle webhooks fail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info Banner */}
          <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900 mb-1">
                Fallback Verification Method
              </p>
              <p className="text-sm text-yellow-800">
                Circle automatically processes deposits via webhooks. Only use this tool if your deposit wasn't automatically credited after 10+ minutes, or for dispute resolution.
              </p>
            </div>
          </div>

          {/* Input Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="txHash">Transaction Hash</Label>
              <Input
                id="txHash"
                placeholder="0x..."
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                className="font-mono"
              />
              <p className="text-sm text-gray-500">
                Enter the transaction hash from your wallet or blockchain explorer
              </p>
            </div>

            <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-blue-800">
                This will manually verify and process the deposit if Circle webhooks failed to process it automatically.
              </p>
            </div>

            <Button 
              onClick={handleVerification}
              disabled={isVerifying || !txHash.trim()}
              className="w-full"
            >
              {isVerifying ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Verify Deposit
                </>
              )}
            </Button>
          </div>

          {/* Verification Result */}
          {verificationResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {getStatusIcon(verificationResult.status)}
                  <span>Verification Result</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge className={getStatusColor(verificationResult.status)}>
                    {verificationResult.status.toUpperCase()}
                  </Badge>
                </div>

                {verificationResult.message && (
                  <div className="text-sm text-gray-600">
                    {verificationResult.message}
                  </div>
                )}

                {verificationResult.transaction_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Transaction ID:</span>
                    <span className="text-sm font-mono">
                      {verificationResult.transaction_id}
                    </span>
                  </div>
                )}

                {verificationResult.circle_tx_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Circle Transaction ID:</span>
                    <span className="text-sm font-mono">
                      {verificationResult.circle_tx_id}
                    </span>
                  </div>
                )}

                {verificationResult.state && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">State:</span>
                    <Badge variant="secondary">
                      {verificationResult.state}
                    </Badge>
                  </div>
                )}

                {verificationResult.credited !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Credited:</span>
                    <Badge variant={verificationResult.credited ? "default" : "secondary"}>
                      {verificationResult.credited ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                )}

                {verificationResult.tx_hash && (
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Transaction Hash:</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-mono">
                          {verificationResult.tx_hash.slice(0, 10)}...{verificationResult.tx_hash.slice(-8)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`https://polygonscan.com/tx/${verificationResult.tx_hash}`, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {verificationResult.status === 'success' && (
                  <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <p className="text-sm text-green-800">
                      Your deposit has been successfully credited to your account!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Help Information */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg">When to Use This</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <span className="font-semibold">•</span>
                  <span>Your deposit hasn't appeared in your wallet after 10 minutes</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-semibold">•</span>
                  <span>You sent USDC from an address that's not linked to your account</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-semibold">•</span>
                  <span>You want to verify that a specific transaction was processed</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-semibold">•</span>
                  <span>You're experiencing issues with automatic deposit processing</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={() => handleDialogClose(false)}>
              Close
            </Button>
            {verificationResult && (
              <Button onClick={resetForm}>
                Verify Another Deposit
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
