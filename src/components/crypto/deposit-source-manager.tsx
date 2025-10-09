'use client'

import { useState, useEffect } from 'react'
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
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

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
  const { user } = useAuthStore()

  useEffect(() => {
    if (user?.id) {
      fetchDepositSources()
    }
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

  const handleAddSource = async () => {
    if (!user?.id || !newAddress.trim()) return

    // Validate Ethereum address
    if (!cryptoService.validateEthereumAddress(newAddress)) {
      toast.error('Please enter a valid Ethereum address (42 characters starting with 0x)')
      return
    }

    try {
      setIsAdding(true)
      const newSource = await cryptoService.createDepositSource(user.id, newAddress.toLowerCase())
      setSources(prev => [...prev, newSource])
      setNewAddress('')
      setIsDialogOpen(false)
      toast.success('Deposit source added successfully')
      onSourceAdded?.(newSource)
    } catch (error) {
      console.error('Error adding deposit source:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to add deposit source'
      
      if (errorMessage.includes('already mapped')) {
        toast.error('This address is already linked to another account')
      } else if (errorMessage.includes('HTML instead of JSON') || errorMessage.includes('404')) {
        toast.error('Deposit source management is not available yet. Please try again later.')
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveSource = async (sourceId: string) => {
    try {
      await cryptoService.deleteDepositSource(sourceId)
      setSources(prev => prev.filter(source => source.id !== sourceId))
      toast.success('Deposit source removed successfully')
      onSourceRemoved?.(sourceId)
    } catch (error) {
      console.error('Error removing deposit source:', error)
      toast.error('Failed to remove deposit source')
    }
  }

  const copyToClipboard = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      setCopiedAddress(address)
      toast.success('Address copied to clipboard')
      setTimeout(() => setCopiedAddress(null), 2000)
    } catch (error) {
      toast.error('Failed to copy address')
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

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
                <DialogTitle>Add Deposit Source</DialogTitle>
                <DialogDescription>
                  Link your Ethereum address to receive deposits. This address will be used to attribute deposits to your account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Ethereum Address</Label>
                  <Input
                    id="address"
                    placeholder="0x..."
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-sm text-gray-500">
                    Enter the address you'll be sending USDC from
                  </p>
                </div>
                <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    Make sure you control this address. Only send USDC from this address to receive deposits.
                  </p>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isAdding}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddSource}
                    disabled={isAdding || !newAddress.trim()}
                  >
                    {isAdding ? 'Adding...' : 'Add Address'}
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
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Wallet className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-mono text-sm">
                      {formatAddress(source.from_address)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Added {new Date(source.created_at).toLocaleDateString()}
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
