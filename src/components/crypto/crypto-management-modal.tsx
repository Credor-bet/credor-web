'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/store'
import { cryptoService, CircleWallet } from '@/lib/crypto-service'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Zap, 
  Wallet, 
  Plus, 
  Minus, 
  Search,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
  ExternalLink,
  Shield
} from 'lucide-react'
import { toast } from 'sonner'
import { CryptoDepositModal } from './crypto-deposit-modal'
import { CryptoWithdrawalModal } from './crypto-withdrawal-modal'
import { DepositVerification } from './deposit-verification'
import { PendingDepositsNotification } from './pending-deposits-notification'
import { ManualDepositVerification } from './manual-deposit-verification'

interface CryptoManagementModalProps {
  isOpen: boolean
  onClose: () => void
  onDepositInitiated?: () => void
  onWithdrawalCreated?: () => void
}

export function CryptoManagementModal({ 
  isOpen, 
  onClose, 
  onDepositInitiated,
  onWithdrawalCreated 
}: CryptoManagementModalProps) {
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false)
  const [circleWallet, setCircleWallet] = useState<CircleWallet | null>(null)
  const [isLoadingWallet, setIsLoadingWallet] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const { user } = useAuthStore()

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchCircleWallet()
    }
  }, [isOpen, user?.id])

  useEffect(() => {
    if (circleWallet?.address) {
      generateQRCode(circleWallet.address)
    }
  }, [circleWallet?.address])

  const fetchCircleWallet = async () => {
    if (!user?.id) return
    
    try {
      setIsLoadingWallet(true)
      const wallet = await cryptoService.getOrCreateCircleWallet()
      setCircleWallet(wallet)
    } catch (error) {
      console.error('Error fetching Circle wallet:', error)
      toast.error('Failed to load wallet information')
    } finally {
      setIsLoadingWallet(false)
    }
  }

  const generateQRCode = async (address: string) => {
    try {
      const qrcode = await import('qrcode')
      const dataUrl = await qrcode.toDataURL(address, {
        width: 200,
        margin: 2
      })
      setQrCodeUrl(dataUrl)
    } catch (error) {
      console.error('Error generating QR code:', error)
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
    if (!circleWallet) return 'Unknown'
    if (circleWallet.blockchain === 'MATIC-AMOY') return 'Polygon Amoy (Testnet)'
    if (circleWallet.blockchain === 'MATIC') return 'Polygon Mainnet'
    return circleWallet.blockchain
  }

  const getNetworkColor = () => {
    if (!circleWallet) return 'bg-gray-100 text-gray-800'
    if (circleWallet.blockchain === 'MATIC-AMOY') return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  const getBlockchainExplorerUrl = (address: string) => {
    if (!circleWallet) return '#'
    if (circleWallet.blockchain === 'MATIC-AMOY' || circleWallet.blockchain === 'MATIC') {
      return `https://polygonscan.com/address/${address}`
    }
    return `https://polygonscan.com/address/${address}`
  }

  const handleDepositClick = () => {
    setIsDepositModalOpen(true)
  }

  const handleWithdrawalClick = () => {
    setIsWithdrawalModalOpen(true)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl">USDC (Crypto)</DialogTitle>
                  <p className="text-sm text-gray-500">Direct USDC deposits via Polygon network</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Pending Deposits Notification */}
            <PendingDepositsNotification />

            {/* Status Badge */}
            <div className="flex items-center justify-center">
              <Badge className="bg-green-100 text-green-800">
                Available
              </Badge>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={handleDepositClick}
                className="h-12 flex items-center justify-center space-x-2"
              >
                <ArrowDownLeft className="h-4 w-4" />
                <span>Deposit USDC</span>
              </Button>
              <Button 
                variant="outline"
                onClick={handleWithdrawalClick}
                className="h-12 flex items-center justify-center space-x-2"
              >
                <ArrowUpRight className="h-4 w-4" />
                <span>Withdraw USDC</span>
              </Button>
            </div>

            {/* Tabs for different crypto functions */}
            <Tabs defaultValue="wallet" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="wallet">Circle Wallet</TabsTrigger>
                <TabsTrigger value="verify">Verify Deposit</TabsTrigger>
                <TabsTrigger value="info">Network Info</TabsTrigger>
              </TabsList>
              
              <TabsContent value="wallet" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Wallet className="h-5 w-5" />
                      <span>Your Circle Wallet</span>
                    </CardTitle>
                    <CardDescription>
                      Your personal deposit address managed securely by Circle
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoadingWallet ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : circleWallet ? (
                      <>
                        {/* Wallet Status */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <span className="text-sm font-medium text-gray-600">Status</span>
                            <div>
                              <Badge className={circleWallet.state === 'LIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                {circleWallet.state}
                              </Badge>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <span className="text-sm font-medium text-gray-600">Network</span>
                            <div>
                              <Badge className={getNetworkColor()}>
                                {getNetworkName()}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Wallet Address */}
                        <div className="space-y-2">
                          <span className="text-sm font-medium text-gray-600">Deposit Address</span>
                          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="font-mono text-sm break-all flex-1 mr-2">
                                {circleWallet.address}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(circleWallet.address)}
                              >
                                {copiedAddress ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* QR Code */}
                        {qrCodeUrl && (
                          <div className="space-y-2">
                            <span className="text-sm font-medium text-gray-600">QR Code</span>
                            <div className="flex justify-center p-4 bg-white border border-gray-200 rounded-lg">
                              <img 
                                src={qrCodeUrl} 
                                alt="Wallet QR Code" 
                                className="w-48 h-48"
                              />
                            </div>
                          </div>
                        )}

                        {/* Explorer Link */}
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(getBlockchainExplorerUrl(circleWallet.address), '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View on Explorer
                          </Button>
                        </div>

                        <Separator />

                        {/* Circle Wallet Info */}
                        <div className="space-y-2">
                          <div className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-blue-900">Circle-Managed Wallet</p>
                              <p className="text-sm text-blue-700 mt-1">
                                Circle securely manages your wallet private keys. Send USDC to this address and deposits will be processed automatically via Circle webhooks.
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        Failed to load wallet information
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="verify" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Search className="h-5 w-5" />
                      <span>Verify Deposit</span>
                    </CardTitle>
                    <CardDescription>
                      Manual verification fallback if Circle webhooks fail to process your deposit automatically
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ManualDepositVerification />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Search className="h-5 w-5" />
                      <span>Dispute Resolution</span>
                    </CardTitle>
                    <CardDescription>
                      Advanced verification for dispute resolution and manual processing
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DepositVerification />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="info" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Zap className="h-5 w-5" />
                      <span>Network Information</span>
                    </CardTitle>
                    <CardDescription>
                      Details about the Polygon network and USDC
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Network</h4>
                        <p className="text-sm text-gray-600">Polygon (MATIC)</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium">Token</h4>
                        <p className="text-sm text-gray-600">USDC (USD Coin)</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium">Environment</h4>
                        <p className="text-sm text-gray-600">Testnet (Amoy)</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium">Status</h4>
                        <Badge className="bg-green-100 text-green-800">
                          Live
                        </Badge>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="text-center py-4">
                      <div className="text-sm text-gray-500 mb-2">
                        Secure crypto payments powered by Polygon
                      </div>
                      <p className="text-xs text-gray-400">
                        All transactions are processed on the Polygon blockchain for fast and low-cost transfers
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nested Modals */}
      <CryptoDepositModal 
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        onDepositInitiated={() => {
          onDepositInitiated?.()
          setIsDepositModalOpen(false)
        }}
      />
      
      <CryptoWithdrawalModal 
        isOpen={isWithdrawalModalOpen}
        onClose={() => setIsWithdrawalModalOpen(false)}
        onWithdrawalCreated={() => {
          onWithdrawalCreated?.()
          setIsWithdrawalModalOpen(false)
        }}
      />
    </>
  )
}

