'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuthStore } from '@/lib/store'
import { cryptoService, DepositSource } from '@/lib/crypto-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  AlertCircle,
  Wallet,
  ExternalLink,
  Shield,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { useAccount, useSignMessage } from 'wagmi'
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { WalletConnectButton } from './wallet-connect-button'

// Helper function to safely extract error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object') {
    // Try to extract message from common error object structures
    const obj = error as Record<string, unknown>
    if (typeof obj.message === 'string') {
      return obj.message
    }
    if (typeof obj.error === 'string') {
      return obj.error
    }
    if (typeof obj.reason === 'string') {
      return obj.reason
    }
    // Last resort: stringify the object safely
    try {
      return JSON.stringify(obj)
    } catch {
      return 'An unknown error occurred'
    }
  }
  return 'An unknown error occurred'
}

interface DepositSourceManagerProps {
  onSourceAdded?: (source: DepositSource) => void
  onSourceRemoved?: (sourceId: string) => void
}

export function DepositSourceManager({ onSourceAdded, onSourceRemoved }: DepositSourceManagerProps) {
  const [sources, setSources] = useState<DepositSource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newAddress, setNewAddress] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [challengeMessage, setChallengeMessage] = useState<string | null>(null)
  const [pendingChallengeId, setPendingChallengeId] = useState<string | null>(null)
  const { user } = useAuthStore()
  
  // Wagmi hooks for wallet connection and signing
  const { address: connectedAddress, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { open } = useWeb3Modal()

  useEffect(() => {
    if (user?.id) {
      fetchDepositSources()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const fetchDepositSources = async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      const depositSources = await cryptoService.getDepositSources(user.id)
      setSources(depositSources)
    } catch (error) {
      console.error('Error fetching deposit sources:', error)
      
      // Check if it's a 404 or endpoint not found error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (errorMessage.includes('404') || errorMessage.includes('HTML instead of JSON')) {
        // Endpoint not implemented yet, show empty state
        setSources([])
        console.log('Deposit sources endpoint not implemented yet, showing empty state')
      } else {
        toast.error('Failed to load deposit sources')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddSource = useCallback(async () => {
    if (!user?.id || !newAddress.trim()) return

    // Validate Ethereum address
    if (!cryptoService.validateEthereumAddress(newAddress)) {
      toast.error('Please enter a valid Ethereum address (42 characters starting with 0x)')
      return
    }

    // Check if wallet is connected
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      open()
      return
    }

    // Verify that the connected wallet matches the address to verify
    const normalizedInput = newAddress.toLowerCase()
    const normalizedConnected = connectedAddress?.toLowerCase()
    
    if (normalizedInput !== normalizedConnected) {
      toast.error(`Please connect the wallet ${newAddress.slice(0, 6)}...${newAddress.slice(-4)} to verify ownership`)
      return
    }

    try {
      setIsAdding(true)
      
      // Step 1: Request verification challenge
      const challenge = await cryptoService.requestVerificationChallenge({
        user_id: user.id,
        address: normalizedInput
      })
      
      setChallengeMessage(challenge.challenge_message)
      setPendingChallengeId(challenge.challenge_id)
      
      // Step 2: Request signature from connected wallet
      setIsVerifying(true)
      toast.info('Please sign the message in your wallet to verify ownership')
      
      // Use a timeout to prevent hanging on slow wallets
      let timeoutId: NodeJS.Timeout | null = null
      const signaturePromise = signMessageAsync({
        message: challenge.challenge_message
      })
      
      const timeoutPromise = new Promise<string>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Signature request timed out. Please try again.')), 60000)
      })
      
      try {
        const signature = await Promise.race([signaturePromise, timeoutPromise])
        
        // Clean up timeout if signature succeeds
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        
        // Continue with verification...
        const result = await cryptoService.confirmVerification({
          challenge_id: challenge.challenge_id,
          signed_message: signature
        })
        
        if (result.verified) {
          setSources(prev => [...prev, result.deposit_source])
          setNewAddress('')
          setChallengeMessage(null)
          setPendingChallengeId(null)
          setIsDialogOpen(false)
          toast.success('Address verified and added successfully!')
          onSourceAdded?.(result.deposit_source)
        } else {
          toast.error('Address verification failed')
        }
      } catch (signError) {
        // Clean up timeout on error
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        throw signError
      }
    } catch (error) {
      console.error('Error adding deposit source:', error)
      const errorMessage = getErrorMessage(error)
      const lowerErrorMessage = errorMessage.toLowerCase()
      
      if (lowerErrorMessage.includes('user rejected') || 
          lowerErrorMessage.includes('user denied') || 
          lowerErrorMessage.includes('user cancelled') ||
          lowerErrorMessage.includes('rejected')) {
        toast.error('Signature request was cancelled')
      } else if (lowerErrorMessage.includes('already mapped')) {
        toast.error('This address is already linked to another account')
      } else if (lowerErrorMessage.includes('maximum of 3 verified addresses') || 
                 lowerErrorMessage.includes('max 3')) {
        toast.error('You can only verify up to 3 addresses. Remove an existing address to add a new one.')
      } else if (lowerErrorMessage.includes('system wallet')) {
        toast.error('This address cannot be used (system wallet)')
      } else if (lowerErrorMessage.includes('address was just verified by another user') ||
                 lowerErrorMessage.includes('recently verified')) {
        toast.error('This address was just verified by someone else. You can only verify addresses you own.')
      } else if (lowerErrorMessage.includes('already verified by another user')) {
        toast.error('This address is already verified by another user')
      } else if (lowerErrorMessage.includes('html instead of json') || 
                 lowerErrorMessage.includes('404') ||
                 lowerErrorMessage.includes('not found')) {
        toast.error('Deposit source management is not available yet. Please try again later.')
      } else if (lowerErrorMessage.includes('timed out') || 
                 lowerErrorMessage.includes('timeout')) {
        toast.error('Signature request took too long. Please try again.')
      } else {
        // Show a generic error message for unknown errors to avoid showing [object Object]
        toast.error('Failed to verify address. Please try again.')
        console.error('Unknown error in handleAddSource:', error)
      }
    } finally {
      setIsAdding(false)
      setIsVerifying(false)
    }
  }, [user?.id, newAddress, isConnected, connectedAddress, signMessageAsync, open, onSourceAdded])


  const copyToClipboard = useCallback(async (address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      setCopiedAddress(address)
      toast.success('Address copied to clipboard')
      setTimeout(() => setCopiedAddress(null), 2000)
    } catch (error) {
      toast.error('Failed to copy address')
    }
  }, [])

  const formatAddress = useCallback((address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }, [])
  
  const handleRemoveSource = useCallback(async (sourceId: string) => {
    try {
      await cryptoService.deleteDepositSource(sourceId)
      setSources(prev => prev.filter(source => source.id !== sourceId))
      toast.success('Deposit source removed successfully')
      onSourceRemoved?.(sourceId)
    } catch (error) {
      console.error('Error removing deposit source:', error)
      const errorMessage = getErrorMessage(error)
      toast.error(errorMessage || 'Failed to remove deposit source')
    }
  }, [onSourceRemoved])

  // Memoize the connected address display to prevent unnecessary re-renders
  const displayAddress = useMemo(() => {
    return connectedAddress ? formatAddress(connectedAddress) : ''
  }, [connectedAddress, formatAddress])

  if (isLoading) {
    return (
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
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Wallet className="h-5 w-5" />
              <span>Deposit Sources</span>
            </CardTitle>
            <CardDescription>
              Manage your crypto addresses for deposit attribution
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Address
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Add & Verify Deposit Source</span>
                </DialogTitle>
                <DialogDescription>
                  Link your Ethereum address and verify ownership to receive deposits.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Wallet Connection Section */}
                <div className="space-y-2">
                  <Label>Connect Wallet</Label>
                  <WalletConnectButton 
                    variant={isConnected ? "outline" : "default"}
                    className="w-full"
                  />
                  {isConnected && connectedAddress && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <Check className="h-4 w-4" />
                      Wallet connected
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    Connect the wallet you want to verify
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Ethereum Address</Label>
                  <div className="flex gap-2">
                    <Input
                      id="address"
                      placeholder="0x..."
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      className="font-mono flex-1"
                    />
                    {isConnected && connectedAddress && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setNewAddress(connectedAddress)}
                        disabled={newAddress === connectedAddress}
                      >
                        Use Connected
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    Enter the address you'll be sending USDC from (must match connected wallet)
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <p className="text-sm text-blue-800">
                    You'll be asked to sign a message with your wallet to prove ownership (no gas fees).
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    Maximum 3 verified addresses per account. Only verified addresses can receive deposits.
                  </p>
                </div>
                
                {isVerifying && challengeMessage && (
                  <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Clock className="h-4 w-4 text-green-600 animate-pulse" />
                    <p className="text-sm text-green-800">
                      Waiting for wallet signature...
                    </p>
                  </div>
                )}
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsDialogOpen(false)
                      setNewAddress('')
                      setChallengeMessage(null)
                      setPendingChallengeId(null)
                    }}
                    disabled={isAdding || isVerifying}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddSource}
                    disabled={isAdding || isVerifying || !newAddress.trim()}
                  >
                    {isAdding ? (
                      isVerifying ? 'Verifying...' : 'Adding...'
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Add & Verify
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {sources.length === 0 ? (
          <div className="text-center py-8">
            <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-2">No deposit sources added</p>
            <p className="text-sm text-gray-400 mb-4">
              Add your Ethereum address to start receiving crypto deposits
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Address
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map((source) => (
              <div 
                key={source.id}
                className={`flex items-center justify-between p-4 border rounded-lg hover:border-gray-300 transition-colors ${
                  source.verified ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    source.verified ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    {source.verified ? (
                      <Shield className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm">
                        {formatAddress(source.from_address)}
                      </span>
                      {source.verified ? (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          Verified
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                          Unverified
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      Added {new Date(source.created_at).toLocaleDateString()}
                      {source.verified_at && ` • Verified ${new Date(source.verified_at).toLocaleDateString()}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(source.from_address)}
                  >
                    {copiedAddress === source.from_address ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`https://polygonscan.com/address/${source.from_address}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSource(source.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
