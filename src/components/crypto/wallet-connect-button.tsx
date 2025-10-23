'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Wallet, LogOut } from 'lucide-react'
import { truncateAddress } from '@/lib/wagmi-config'
import { useWeb3Modal } from '@web3modal/wagmi/react'

interface WalletConnectButtonProps {
  className?: string
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  onConnected?: () => void
}

export function WalletConnectButton({ 
  className, 
  variant = 'default',
  size = 'default',
  onConnected
}: WalletConnectButtonProps) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { open } = useWeb3Modal()

  const handleClick = () => {
    if (isConnected) {
      disconnect()
    } else {
      open()
    }
  }

  // Notify parent when connected
  if (isConnected && onConnected) {
    onConnected()
  }

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      size={size}
      className={className}
    >
      {isConnected ? (
        <>
          <Wallet className="w-4 h-4 mr-2" />
          {truncateAddress(address || '')}
          <LogOut className="w-4 h-4 ml-2" />
        </>
      ) : (
        <>
          <Wallet className="w-4 h-4 mr-2" />
          Connect Wallet
        </>
      )}
    </Button>
  )
}

