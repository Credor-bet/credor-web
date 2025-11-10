'use client'

import { useState, useEffect } from 'react'
import { cryptoService, CircleWallet } from '@/lib/crypto-service'
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
  Coins,
  Wallet
} from 'lucide-react'
import { toast } from 'sonner'

interface CryptoDepositModalProps {
  isOpen: boolean
  onClose: () => void
  onDepositInitiated?: () => void
}

export function CryptoDepositModal({ isOpen, onClose, onDepositInitiated }: CryptoDepositModalProps) {
  const [wallet, setWallet] = useState<CircleWallet | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchCircleWallet()
    }
  }, [isOpen])

  useEffect(() => {
    if (wallet?.address) {
      generateQRCode(wallet.address)
    }
  }, [wallet?.address])

  const fetchCircleWallet = async () => {
    try {
      setIsLoading(true)
      const walletData = await cryptoService.getOrCreateCircleWallet()
      setWallet(walletData)
      
      if (walletData.is_new) {
        toast.success('Your Circle wallet has been created!')
      }
    } catch (error) {
      console.error('Error fetching Circle wallet:', error)
      toast.error('Failed to load wallet information')
    } finally {
      setIsLoading(false)
    }
  }

  const generateQRCode = async (address: string) => {
    try {
      // Use qrcode package to generate QR code
      const qrcode = await import('qrcode')
      const dataUrl = await qrcode.toDataURL(address, {
        width: 200,
        margin: 2
      })
      setQrCodeUrl(dataUrl)
    } catch (error) {
      console.error('Error generating QR code:', error)
      // If QR code generation fails, we'll just not show it
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedAddress(true)
      setTimeout(() => setCopiedAddress(false), 2000)
      toast.success('Copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const getNetworkName = () => {
    if (!wallet) return 'Unknown'
    // Circle blockchain format: MATIC-AMOY, MATIC, ETH, etc.
    if (wallet.blockchain === 'MATIC-AMOY') return 'Polygon Amoy (Testnet)'
    if (wallet.blockchain === 'MATIC') return 'Polygon Mainnet'
    return wallet.blockchain
  }

  const getNetworkColor = () => {
    if (!wallet) return 'bg-gray-100 text-gray-800'
    if (wallet.blockchain === 'MATIC-AMOY') return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  const getBlockchainExplorerUrl = (address: string) => {
    if (!wallet) return '#'
    if (wallet.blockchain === 'MATIC-AMOY' || wallet.blockchain === 'MATIC') {
      return `https://polygonscan.com/address/${address}`
    }
    // Default to polygonscan for now
    return `https://polygonscan.com/address/${address}`
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

  if (!wallet) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>USDC Deposit Instructions</DialogTitle>
            <DialogDescription>
              Failed to load wallet information
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-gray-600">Unable to load wallet information. Please try again later.</p>
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
            Send USDC to your personal Circle wallet address
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* New Wallet Created Message */}
          {wallet.is_new && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900">New wallet created!</p>
                    <p className="text-sm text-green-700 mt-1">
                      Your personal Circle wallet has been created. Send USDC to the address below.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Wallet Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Wallet className="h-5 w-5" />
                <span>Your Circle Wallet</span>
              </CardTitle>
              <CardDescription>
                Your personal deposit address managed by Circle
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status:</span>
                <Badge className={wallet.state === 'LIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {wallet.state}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Network:</span>
                <Badge className={getNetworkColor()}>
                  {getNetworkName()}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Deposit Address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Deposit Address</CardTitle>
              <CardDescription>
                Send USDC to this address. Deposits are processed automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* QR Code */}
              {qrCodeUrl && (
                <div className="flex justify-center p-4 bg-white border border-gray-200 rounded-lg">
                  <img 
                    src={qrCodeUrl} 
                    alt="Wallet QR Code" 
                    className="w-48 h-48"
                  />
                </div>
              )}
              
              {/* Address */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-sm break-all flex-1 mr-2">
                    {wallet.address}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(wallet.address)}
                  >
                    {copiedAddress ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Explorer Link */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(getBlockchainExplorerUrl(wallet.address), '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Explorer
                </Button>
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
                  <span>Only send <strong>USDC</strong> tokens to this address</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-semibold">2.</span>
                  <span>Make sure you're sending to the <strong>{getNetworkName()}</strong> network</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-semibold">3.</span>
                  <span>Deposits are processed automatically via Circle webhooks</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-semibold">4.</span>
                  <span>Your balance will be credited automatically when the transaction is confirmed</span>
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
                <p>• Circle automatically detects deposits to your wallet address</p>
                <p>• Deposits are credited when Circle reports transaction state as COMPLETE</p>
                <p>• Processing time: Typically 1-5 minutes after blockchain confirmation</p>
                <p>• Your balance updates automatically - no manual verification needed</p>
                <p>• If your deposit isn't processed within 10 minutes, use the manual verification tool as a fallback</p>
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
                <p>• Circle manages your wallet securely - no wallet connection needed</p>
                <p>• If your deposit isn't showing up, use the "Verify Deposit" feature as a fallback</p>
                <p>• Double-check that you're sending USDC on the {getNetworkName()} network</p>
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
