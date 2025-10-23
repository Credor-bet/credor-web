'use client'

import { createWeb3Modal } from '@web3modal/wagmi/react'
import { http, createConfig } from 'wagmi'
import { polygon, polygonAmoy } from 'wagmi/chains'
import { walletConnect, injected } from 'wagmi/connectors'
import { QueryClient } from '@tanstack/react-query'

// Get WalletConnect project ID from environment
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id'

// Determine network based on environment
const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET === 'true'
const targetChain = isTestnet ? polygonAmoy : polygon

// Wagmi configuration
export const config = createConfig({
  chains: [polygon, polygonAmoy],
  transports: {
    [polygon.id]: http(),
    [polygonAmoy.id]: http()
  },
  connectors: [
    // Injected wallets (MetaMask, Coinbase, Brave, etc.)
    injected({ shimDisconnect: true }),
    // WalletConnect for mobile and QR code scanning (only if projectId is valid)
    ...(projectId && projectId !== 'demo-project-id' ? [walletConnect({ projectId })] : [])
  ],
  ssr: true
})

// Create Web3Modal instance
export const web3Modal = createWeb3Modal({
  wagmiConfig: config,
  projectId: projectId || 'demo-project-id', // Fallback for development
  enableAnalytics: false,
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#3b82f6'
  }
})

// React Query client for Wagmi
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})

// Helper function to truncate address for display
export function truncateAddress(address: string, startChars = 6, endChars = 4): string {
  if (!address) return ''
  if (address.length <= startChars + endChars) return address
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

// Helper function to validate Ethereum address
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

