'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/store'
import { cryptoService, WithdrawalRequest, WithdrawalEstimate } from '@/lib/crypto-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  ArrowUpRight, 
  AlertCircle,
  Info,
  DollarSign,
  Clock,
  CheckCircle,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

interface CryptoWithdrawalModalProps {
  isOpen: boolean
  onClose: () => void
  onWithdrawalCreated?: (withdrawalId: string) => void
}

export function CryptoWithdrawalModal({ isOpen, onClose, onWithdrawalCreated }: CryptoWithdrawalModalProps) {
  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [isEstimating, setIsEstimating] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [estimate, setEstimate] = useState<WithdrawalEstimate | null>(null)
  const [withdrawalId, setWithdrawalId] = useState<string | null>(null)
  const { user, wallet } = useAuthStore()

  const handleEstimateFee = async () => {
    if (!toAddress.trim() || !amount.trim()) return

    // Validate inputs
    if (!cryptoService.validateEthereumAddress(toAddress)) {
      toast.error('Please enter a valid Ethereum address')
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (wallet && numAmount > wallet.balance) {
      toast.error('Insufficient balance')
      return
    }

    try {
      setIsEstimating(true)
      const feeEstimate = await cryptoService.estimateWithdrawalFee(toAddress, numAmount)
      setEstimate(feeEstimate)
    } catch (error) {
      console.error('Error estimating fee:', error)
      toast.error('Failed to estimate withdrawal fee')
    } finally {
      setIsEstimating(false)
    }
  }

  const handleWithdrawal = async () => {
    if (!user?.id || !toAddress.trim() || !amount.trim() || !estimate) return

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (wallet && numAmount > wallet.balance) {
      toast.error('Insufficient balance')
      return
    }

    try {
      setIsWithdrawing(true)
      const withdrawalRequest: WithdrawalRequest = {
        user_id: user.id,
        amount: numAmount,
        to_address: toAddress.toLowerCase(),
        idempotency_key: cryptoService.generateIdempotencyKey()
      }

      const result = await cryptoService.createWithdrawal(withdrawalRequest)
      setWithdrawalId(result.id)
      onWithdrawalCreated?.(result.id)
      toast.success('Withdrawal submitted successfully!')
    } catch (error) {
      console.error('Error creating withdrawal:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create withdrawal'
      toast.error(errorMessage)
    } finally {
      setIsWithdrawing(false)
    }
  }

  const resetForm = () => {
    setToAddress('')
    setAmount('')
    setEstimate(null)
    setWithdrawalId(null)
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetForm()
      onClose()
    }
  }

  const formatUSDC = (amount: number) => {
    return amount.toFixed(6)
  }

  const formatETH = (amount: number) => {
    return amount.toFixed(6)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ArrowUpRight className="h-5 w-5" />
            <span>Withdraw USDC</span>
          </DialogTitle>
          <DialogDescription>
            Withdraw USDC to an external Ethereum address
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!withdrawalId ? (
            <>
              {/* Withdrawal Form */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="toAddress">Recipient Address</Label>
                  <Input
                    id="toAddress"
                    placeholder="0x..."
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (USDC)</Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      step="0.000001"
                      placeholder="0.000000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pr-12 text-sm"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                      USDC
                    </div>
                  </div>
                  {wallet && (
                    <p className="text-xs text-gray-500">
                      Available: {formatUSDC(wallet.balance)} USDC
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="h-3 w-3 text-yellow-600 flex-shrink-0" />
                  <p className="text-xs text-yellow-800">
                    Verify address - withdrawals cannot be reversed
                  </p>
                </div>

                <Button 
                  onClick={handleEstimateFee}
                  disabled={isEstimating || !toAddress.trim() || !amount.trim()}
                  className="w-full"
                >
                  {isEstimating ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Estimating...
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Estimate Fee
                    </>
                  )}
                </Button>
              </div>

              {/* Fee Estimate */}
              {estimate && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Network:</span>
                      <Badge variant="outline" className="text-xs">
                        {estimate.network}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Gas Cost:</span>
                      <span className="font-mono text-xs">
                        {formatETH(estimate.total_cost_eth)} ETH
                      </span>
                    </div>
                    <div className="pt-2 border-t border-blue-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Withdrawing:</span>
                        <span className="font-mono font-semibold">
                          {formatUSDC(parseFloat(amount))} USDC
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Withdrawal Button */}
              {estimate && (
                <Button 
                  onClick={handleWithdrawal}
                  disabled={isWithdrawing}
                  className="w-full"
                >
                  {isWithdrawing ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      Confirm Withdrawal
                    </>
                  )}
                </Button>
              )}
            </>
          ) : (
            /* Withdrawal Success */
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center space-x-2 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium text-sm">Withdrawal Submitted</span>
                </div>
                <div className="text-xs text-green-700">
                  Processing on blockchain. Track status in transaction history.
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Amount:</span>
                    <span className="font-mono">
                      {formatUSDC(parseFloat(amount))} USDC
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">To:</span>
                    <div className="flex items-center space-x-1">
                      <span className="font-mono">
                        {toAddress.slice(0, 8)}...{toAddress.slice(-6)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => window.open(`https://polygonscan.com/address/${toAddress}`, '_blank')}
                      >
                        <ExternalLink className="h-2 w-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help Information - Compact */}
          <div className="text-xs text-gray-500 space-y-1">
            <div>• Withdrawals take 5-15 minutes on blockchain</div>
            <div>• Network fees deducted from balance</div>
            <div>• Track status in transaction history</div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => handleDialogClose(false)}>
              {withdrawalId ? 'Close' : 'Cancel'}
            </Button>
            {withdrawalId && (
              <Button size="sm" onClick={resetForm}>
                New Withdrawal
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
