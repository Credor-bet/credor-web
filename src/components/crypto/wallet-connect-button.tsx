'use client'

import { useWeb3Modal } from '@web3modal/wagmi/react'
import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Wallet } from 'lucide-react'
import { truncateAddress } from '@/lib/wagmi-config'

interface WalletConnectButtonProps {
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined
}

export function WalletConnectButton({ className, variant }: WalletConnectButtonProps) {
  const { open } = useWeb3Modal()
  const { address, isConnected } = useAccount()

  return (
    <Button
      onClick={() => open()}
      className={className}
      variant={variant}
    >
      <Wallet className="h-4 w-4 mr-2" />
      {isConnected ? truncateAddress(address!) : 'Connect Wallet'}
    </Button>
  )
}