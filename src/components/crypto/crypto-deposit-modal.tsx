'use client'

import { useState, useEffect } from 'react'
import { cryptoService, PublicPoolInfo } from '@/lib/crypto-service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Copy, 
  Check, 
  ExternalLink,
  AlertCircle,
  Info,
  Clock,
  Shield,
  Coins
} from 'lucide-react'
import { toast } from 'sonner'

interface CryptoDepositModalProps {
  isOpen: boolean
  onClose: () => void
  onDepositInitiated?: () => void
}

export function CryptoDepositModal({ isOpen, onClose, onDepositInitiated }: CryptoDepositModalProps) {
  const [poolInfo, setPoolInfo] = useState<PublicPoolInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [copiedContract, setCopiedContract] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchPoolInfo()
    }
  }, [isOpen])

  const fetchPoolInfo = async () => {
    try {
      setIsLoading(true)
      const info = await cryptoService.getPublicPoolInfo()
      setPoolInfo(info)
    } catch (error) {
      console.error('Error fetching pool info:', error)
      toast.error('Failed to load deposit information')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string, type: 'address' | 'contract') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'address') {
        setCopiedAddress(true)
        setTimeout(() => setCopiedAddress(false), 2000)
      } else {
        setCopiedContract(true)
        setTimeout(() => setCopiedContract(false), 2000)
      }
      toast.success('Copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const getNetworkName = () => {
    if (!poolInfo) return 'Unknown'
    return poolInfo.is_testnet ? 'Polygon Amoy (Testnet)' : 'Polygon Mainnet'
  }

  const getNetworkColor = () => {
    if (!poolInfo) return 'bg-gray-100 text-gray-800'
    return poolInfo.is_testnet ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
  }

  const handleDepositInitiated = () => {
    onDepositInitiated?.()
    onClose()
  }

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>USDC Deposit Instructions</DialogTitle>
            <DialogDescription>
              Loading deposit information...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!poolInfo) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>USDC Deposit Instructions</DialogTitle>
            <DialogDescription>
              Failed to load deposit information
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-gray-600">Unable to load deposit information. Please try again later.</p>
            <Button onClick={onClose} className="mt-4">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Coins className="h-5 w-5" />
            <span>USDC Deposit Instructions</span>
          </DialogTitle>
          <DialogDescription>
            Follow these steps to deposit USDC to your wallet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Network Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Network Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Network:</span>
                <Badge className={getNetworkColor()}>
                  {getNetworkName()}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Network ID:</span>
                <span className="text-sm font-mono">{poolInfo.network_id}</span>
              </div>
            </CardContent>
          </Card>

          {/* Deposit Address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Deposit Address</CardTitle>
              <CardDescription>
                Send USDC to this address. Make sure you're on the correct network.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-sm break-all">
                    {poolInfo.address}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(poolInfo.address, 'address')}
                  >
                    {copiedAddress ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://polygonscan.com/address/${poolInfo.address}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Polygonscan
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* USDC Contract */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">USDC Contract Address</CardTitle>
              <CardDescription>
                This is the USDC token contract address on {getNetworkName()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-sm break-all">
                    {poolInfo.usdc_contract}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(poolInfo.usdc_contract, 'contract')}
                  >
                    {copiedContract ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Important Instructions */}
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2 text-yellow-800">
                <AlertCircle className="h-5 w-5" />
                <span>Important Instructions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm text-yellow-800">
                <div className="flex items-start space-x-2">
                  <span className="font-semibold">1.</span>
                  <span>Make sure you're connected to the <strong>{getNetworkName()}</strong> network in your wallet</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-semibold">2.</span>
                  <span>Only send <strong>USDC</strong> tokens to this address</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-semibold">3.</span>
                  <span>Add your sending address as a deposit source in your wallet settings</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-semibold">4.</span>
                  <span>Deposits are processed automatically and may take a few minutes</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-semibold">5.</span>
                  <span>Keep your transaction hash for reference</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Processing Time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Processing Time</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Deposits are processed automatically when detected on the blockchain</p>
                <p>• Processing time: 1-5 minutes after blockchain confirmation</p>
                <p>• You'll receive a notification when your deposit is processed</p>
                <p>• If your deposit isn't processed within 10 minutes, use the deposit verification tool</p>
              </div>
            </CardContent>
          </Card>

          {/* Help */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Info className="h-5 w-5" />
                <span>Need Help?</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• If your deposit isn't showing up, use the "Verify Deposit" feature</p>
                <p>• Make sure you're sending from an address you've added as a deposit source</p>
                <p>• Double-check that you're on the correct network ({getNetworkName()})</p>
                <p>• Contact support if you need assistance</p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handleDepositInitiated}>
              I've Sent My Deposit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
