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

// Helper function to extract signature from different wallet formats
function extractSignature(signature: unknown): string | null {
  if (!signature) {
    return null
  }

  // If it's already a simple hex string (normal case)
  if (typeof signature === 'string') {
    const trimmed = signature.trim()
    
    // If it's a reasonable length for a signature (130-132 chars with 0x)
    if (trimmed.length >= 128 && trimmed.length <= 134) {
      return trimmed.startsWith('0x') ? trimmed : '0x' + trimmed
    }
    
    // If it's very long, try parsing as JSON (Base Wallet might return JSON)
    if (trimmed.length > 200) {
      try {
        const parsed = JSON.parse(trimmed)
        const extracted = extractSignature(parsed)
        // Only return if extraction was successful
        if (extracted) {
          return extracted
        }
      } catch (parseError) {
        // Not valid JSON, log for debugging
        console.warn('Long string is not valid JSON, first 200 chars:', trimmed.substring(0, 200))
      }
      
      // If JSON parsing failed or extraction failed, don't return the long string
      // Base Wallet might return ABI-encoded data with signature embedded
      // Try to find hex substrings that look like signatures (130 or 132 chars with 0x)
      
      // Method 1: Look for standalone 130-132 char hex patterns
      const standalonePattern = trimmed.match(/\b0x[a-fA-F0-9]{128}([a-fA-F0-9]{2,4})?\b/)
      if (standalonePattern) {
        const matched = standalonePattern[0]
        if (matched.length === 130 || matched.length === 132) {
          console.log('Found standalone hex signature pattern in long string')
          return matched
        }
      }
      
      // Method 2: Search for 130-char hex sequences (without 0x requirement, might be embedded)
      // A signature is 65 bytes = 130 hex chars (r=32 bytes + s=32 bytes + v=1 byte)
      // Look for sequences that look like valid cryptographic signatures
      const hexOnly = trimmed.replace(/0x/g, '').toLowerCase()
      
      // Score function to evaluate if a hex string looks like a signature
      const scoreSignature = (hex: string): number => {
        let score = 0
        // High entropy (many unique chars) is good
        const uniqueChars = new Set(hex).size
        score += Math.min(uniqueChars / 16, 1) * 30 // Max 30 points
        
        // No obvious repeating patterns
        const hasRepeatingPattern = /(.{2,})\1{3,}/.test(hex) // 4+ repeats of 2+ char pattern
        if (!hasRepeatingPattern) score += 20
        
        // Check r and s components are reasonable (not all 0s or fs)
        const r = hex.substring(0, 64)
        const s = hex.substring(64, 128)
        const v = hex.substring(128, 130)
        
        if (r !== '0'.repeat(64) && r !== 'f'.repeat(64)) score += 20
        if (s !== '0'.repeat(64) && s !== 'f'.repeat(64)) score += 20
        
        // V should be reasonable (typically 1b, 1c, 00, 01)
        const validV = ['1b', '1c', '00', '01', '1a', '1d'].includes(v)
        if (validV) score += 10
        
        return score
      }
      
      // Try to find 130-char sequences with good signature scores
      const potentialSigs: Array<{ sig: string; index: number; score: number }> = []
      for (let i = 0; i <= hexOnly.length - 130; i++) {
        const candidate = hexOnly.substring(i, i + 130)
        if (/^[0-9a-f]{130}$/.test(candidate)) {
          const score = scoreSignature(candidate)
          // Only consider if score is reasonably high (signature-like)
          if (score > 40) {
            potentialSigs.push({
              sig: '0x' + candidate,
              index: i,
              score
            })
          }
        }
      }
      
      // Use the highest scoring signature candidate
      if (potentialSigs.length > 0) {
        potentialSigs.sort((a, b) => b.score - a.score)
        const bestMatch = potentialSigs[0]
        console.log(`Found ${potentialSigs.length} potential signature patterns, best score: ${bestMatch.score}, using:`, bestMatch.sig.substring(0, 30) + '...')
        return bestMatch.sig
      }
      
      // Method 3: If it's exactly 3010 chars and starts with 0x, it might be ABI-encoded
      // Try to extract signature from end or from known positions
      // Base Wallet might append signature at the end
      if (trimmed.length >= 130) {
        // Check last 132 chars (might be signature with 0x)
        const last132 = trimmed.slice(-132)
        if (/^0x[0-9a-fA-F]{130}$/.test(last132)) {
          console.log('Found signature at end of long string')
          return last132
        }
        
        // Check last 130 chars (signature without 0x at end)
        const last130hex = trimmed.slice(-130)
        if (/^[0-9a-fA-F]{130}$/.test(last130hex)) {
          console.log('Found hex signature at end (without 0x)')
          return '0x' + last130hex
        }
      }
      
      // Last resort: if it's just a very long hex string, it's probably not a signature
      // Don't return invalid data
      console.warn('Could not extract signature from long hex string')
      return null
    }
    
    // For medium-length strings (between 134 and 200), might be a signature without proper formatting
    // Don't return anything that's not a valid signature length
    return null
  }

  // If it's an object, try to extract signature fields
  if (typeof signature === 'object' && signature !== null) {
    const obj = signature as Record<string, unknown>
    
    // Try common signature field names (case-insensitive search through keys)
    const signatureKeys = [
      'signature', 'rawSignature', 'sig', 'signedMessage', 'signed_message',
      'signatureHash', 'signature_hash', 'result', 'data', 'value',
      'messageHash', 'message_hash', 'hex', 'hash'
    ]
    
    for (const key of signatureKeys) {
      // Check exact match
      if (obj[key] && typeof obj[key] === 'string') {
        const sig = (obj[key] as string).trim()
        // Validate it looks like a signature
        if (sig.length >= 128 && sig.length <= 134) {
          return sig.startsWith('0x') ? sig : '0x' + sig
        }
      }
      
      // Check case-insensitive match
      const lowerKey = key.toLowerCase()
      for (const objKey of Object.keys(obj)) {
        if (objKey.toLowerCase() === lowerKey && typeof obj[objKey] === 'string') {
          const sig = (obj[objKey] as string).trim()
          if (sig.length >= 128 && sig.length <= 134) {
            return sig.startsWith('0x') ? sig : '0x' + sig
          }
        }
      }
    }
    
    // Try extracting from r, s, v format (some wallets return split signatures)
    if (typeof obj.r === 'string' && typeof obj.s === 'string') {
      let r = obj.r.trim()
      let s = obj.s.trim()
      let v = obj.v
      
      // Remove 0x prefixes for concatenation
      r = r.startsWith('0x') ? r.slice(2) : r
      s = s.startsWith('0x') ? s.slice(2) : s
      
      // Get v value (recovery ID)
      let vHex = '1c' // Default recovery ID
      if (typeof v === 'number') {
        vHex = v.toString(16).padStart(2, '0')
      } else if (typeof v === 'string') {
        vHex = v.trim()
        if (vHex.startsWith('0x')) {
          vHex = vHex.slice(2)
        }
        vHex = vHex.padStart(2, '0')
      }
      
      // Reconstruct signature: r + s + v
      const reconstructed = '0x' + r + s + vHex
      if (reconstructed.length >= 130 && reconstructed.length <= 134) {
        return reconstructed
      }
    }
    
    // Try nested signature objects (recursive search)
    for (const value of Object.values(obj)) {
      if (value && typeof value === 'object') {
        const nested = extractSignature(value)
        if (nested) return nested
      }
    }
    
    // If it's an array, try first element
    if (Array.isArray(obj) && obj.length > 0) {
      const first = extractSignature(obj[0])
      if (first) return first
    }
    
    // Log structure for debugging (limit size to avoid huge logs)
    const preview = JSON.stringify(obj).substring(0, 500)
    console.warn('Unknown signature format, structure preview:', preview)
    console.warn('Object keys:', Object.keys(obj))
  }

  return null
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
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [signatureInfo, setSignatureInfo] = useState<{ 
    length?: number; 
    hasPrefix?: boolean;
    rawLength?: number;
    rawType?: string;
  } | null>(null)
  const [rawWalletResponse, setRawWalletResponse] = useState<string | null>(null)
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
      setVerificationError(null)
      setSignatureInfo(null)
      setRawWalletResponse(null)
      
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
        
        // Log raw signature info for debugging
        const rawSigType = typeof signature
        const rawSigLength = typeof signature === 'string' ? signature.length : JSON.stringify(signature).length
        
        console.log('Raw signature received from wallet:', {
          type: rawSigType,
          length: rawSigLength,
          preview: typeof signature === 'string' 
            ? signature.substring(0, 200) + '...' 
            : JSON.stringify(signature).substring(0, 200) + '...',
          isObject: typeof signature === 'object',
          fullStructure: typeof signature === 'object' ? signature : undefined
        })
        
        // If it's a long string, also log if it looks like JSON
        if (typeof signature === 'string' && signature.length > 200) {
          try {
            const parsed = JSON.parse(signature)
            console.log('Long string parsed as JSON:', {
              keys: Object.keys(parsed),
              structure: parsed
            })
          } catch {
            console.log('Long string is not valid JSON')
          }
        }
        
        // Store raw response for debugging (stringify if needed)
        try {
          const rawResponseString = typeof signature === 'string' 
            ? signature 
            : JSON.stringify(signature, null, 2)
          setRawWalletResponse(rawResponseString)
        } catch (stringifyError) {
          setRawWalletResponse(String(signature))
        }
        
        // Extract actual signature from wallet response
        const extractedSignature = extractSignature(signature)
        
        if (!extractedSignature) {
          // Keep raw response visible, but show error
          const errorMsg = 'Base Wallet returned an unexpected format. This may be a wallet compatibility issue. Please try a different wallet (MetaMask, 1inch) or share the raw response for debugging.'
          setVerificationError(errorMsg)
          throw new Error(errorMsg)
        }
        
        // Double-check extracted signature looks valid
        if (extractedSignature.length !== 130 && extractedSignature.length !== 132) {
          console.warn('Extracted signature has unexpected length:', extractedSignature.length)
        }
        
        // Validate extracted signature format
        const sigLength = extractedSignature.length
        const hasPrefix = extractedSignature.startsWith('0x')
        
        // Expected: 130 chars (0x + 128 hex = 65 bytes) or 132 with recovery ID
        if (sigLength < 128 || sigLength > 134) {
          console.error('Invalid signature length after extraction:', {
            extractedLength: sigLength,
            extractedPreview: extractedSignature.substring(0, 50) + '...',
            rawType: rawSigType,
            rawLength: rawSigLength
          })
          throw new Error(`Invalid signature format: expected 130-132 chars, got ${sigLength}. Please try again.`)
        }
        
        console.log('Extracted signature:', {
          length: sigLength,
          startsWith0x: hasPrefix,
          preview: extractedSignature.substring(0, 30) + '...',
          rawLength: rawSigLength
        })
        
        // Store signature info for visible feedback (including raw data for debugging)
        setSignatureInfo({
          length: sigLength,
          hasPrefix: hasPrefix || false,
          rawLength: rawSigLength,
          rawType: rawSigType
        })
        
        // Use extracted and normalized signature
        const normalizedSignature = extractedSignature
        
        // Continue with verification...
        const result = await cryptoService.confirmVerification({
          challenge_id: challenge.challenge_id,
          signed_message: normalizedSignature
        })
        
        if (result.verified) {
          setSources(prev => [...prev, result.deposit_source])
          setNewAddress('')
          setChallengeMessage(null)
          setPendingChallengeId(null)
          setVerificationError(null)
          setSignatureInfo(null)
          setRawWalletResponse(null)
          setIsDialogOpen(false)
          toast.success('Address verified and added successfully!')
          onSourceAdded?.(result.deposit_source)
        } else {
          const errorMsg = 'Address verification failed'
          setVerificationError(errorMsg)
          toast.error(errorMsg)
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
      } else if (lowerErrorMessage.includes('422') || 
                 lowerErrorMessage.includes('unprocessable') ||
                 lowerErrorMessage.includes('validation error')) {
        // Backend validation error - show the actual error message
        console.error('Backend validation error (422):', error)
        console.error('Full error object:', JSON.stringify(error, null, 2))
        
        // Extract the detailed validation message
        let displayMessage = errorMessage
        if (errorMessage.includes('Validation error:') && errorMessage.length < 200) {
          // Show the full validation error if it's reasonable length
          displayMessage = errorMessage
        } else if (errorMessage.includes('422') || errorMessage.includes('HTTP')) {
          displayMessage = 'Validation error: The signature format may not be supported by this wallet. Please try a different wallet or contact support.'
        }
        
        // Store error for visible display
        setVerificationError(displayMessage)
        toast.error(displayMessage, {
          duration: 10000, // Show longer for validation errors
          description: signatureInfo ? `Signature length: ${signatureInfo.length}, Has 0x prefix: ${signatureInfo.hasPrefix}` : undefined
        })
      } else if (lowerErrorMessage.includes('timed out') || 
                 lowerErrorMessage.includes('timeout')) {
        toast.error('Signature request took too long. Please try again.')
      } else {
        // Show a generic error message for unknown errors to avoid showing [object Object]
        console.error('Unknown error in handleAddSource:', error)
        console.error('Error type:', typeof error)
        console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
        
        // Store error for visible display
        setVerificationError(errorMessage || 'Failed to verify address. Please try again.')
        toast.error(errorMessage || 'Failed to verify address. Please try again.', {
          duration: 8000
        })
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
                
                {signatureInfo && !verificationError && (
                  <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm text-blue-800 font-medium">Signature received</p>
                      <p className="text-xs text-blue-600 mt-1">
                        Extracted: {signatureInfo.length} chars, Has 0x prefix: {signatureInfo.hasPrefix ? 'Yes' : 'No'}
                        {signatureInfo.rawLength && signatureInfo.rawLength !== signatureInfo.length && (
                          <span className="ml-2">(Raw: {signatureInfo.rawLength} chars, {signatureInfo.rawType})</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                
                {verificationError && (
                  <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-red-800 font-medium">Verification Failed</p>
                      <p className="text-xs text-red-700 mt-1 break-words">{verificationError}</p>
                      {signatureInfo && (
                        <p className="text-xs text-red-600 mt-2">
                          Extracted signature: {signatureInfo.length} chars, 0x prefix: {signatureInfo.hasPrefix ? 'Yes' : 'No'}
                          {signatureInfo.rawLength && signatureInfo.rawLength !== signatureInfo.length && (
                            <span className="block mt-1">
                              Raw signature: {signatureInfo.rawLength} chars ({signatureInfo.rawType})
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {rawWalletResponse && (
                  <div className="flex flex-col space-y-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-800">Raw Wallet Response (for debugging):</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(rawWalletResponse)
                          toast.success('Raw response copied to clipboard!')
                        }}
                        className="h-7 text-xs"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <textarea
                      readOnly
                      value={rawWalletResponse}
                      className="w-full p-2 text-xs font-mono bg-white border border-gray-300 rounded resize-none"
                      rows={8}
                      onClick={(e) => e.currentTarget.select()}
                      style={{ minHeight: '100px', maxHeight: '300px' }}
                    />
                    <p className="text-xs text-gray-600">
                      Length: {rawWalletResponse.length} characters
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
                      setVerificationError(null)
                      setSignatureInfo(null)
                      setRawWalletResponse(null)
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
