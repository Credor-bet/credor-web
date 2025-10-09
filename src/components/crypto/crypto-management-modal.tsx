'use client'

import { useState } from 'react'
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
  ArrowDownLeft
} from 'lucide-react'
import { CryptoDepositModal } from './crypto-deposit-modal'
import { CryptoWithdrawalModal } from './crypto-withdrawal-modal'
import { DepositVerification } from './deposit-verification'
import { DepositSourceManager } from './deposit-source-manager'

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
            <Tabs defaultValue="sources" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="sources">Deposit Sources</TabsTrigger>
                <TabsTrigger value="verify">Verify Deposit</TabsTrigger>
                <TabsTrigger value="info">Network Info</TabsTrigger>
              </TabsList>
              
              <TabsContent value="sources" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Wallet className="h-5 w-5" />
                      <span>Deposit Sources</span>
                    </CardTitle>
                    <CardDescription>
                      Manage your crypto addresses for deposit attribution
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DepositSourceManager 
                      onSourceAdded={() => {
                        // Could refresh data if needed
                      }}
                      onSourceRemoved={() => {
                        // Could refresh data if needed
                      }}
                    />
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
                      Verify a deposit using transaction hash for dispute resolution
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

