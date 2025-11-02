'use client'

import { createWeb3Modal } from '@web3modal/wagmi/react'
import { http, createConfig } from 'wagmi'
import { polygon, polygonAmoy } from 'wagmi/chains'
import { walletConnect, injected } from 'wagmi/connectors'
import { QueryClient } from '@tanstack/react-query'

// Get project ID from environment variables
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id'
const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_KEY

// Create wagmi config
export const config = createConfig({
  chains: [polygon, polygonAmoy],
  transports: {
    [polygon.id]: http(
      alchemyKey ? `https://polygon-mainnet.g.alchemy.com/v2/${alchemyKey}` : undefined,
      { batch: true, timeout: 8000 }
    ),
    [polygonAmoy.id]: http(
      alchemyKey ? `https://polygon-amoy.g.alchemy.com/v2/${alchemyKey}` : undefined,
      { batch: true, timeout: 8000 }
    )
  },
  connectors: [
    injected({ shimDisconnect: true }),
    ...(projectId && projectId !== 'demo-project-id' ? [walletConnect({ projectId })] : [])
  ],
  ssr: true
})

// Create Web3Modal instance
export const web3Modal = createWeb3Modal({
  wagmiConfig: config,
  projectId: projectId || 'demo-project-id',
  enableAnalytics: false,
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#3b82f6'
  }
})

// Create query client for React Query with performance optimizations
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: 1,
      staleTime: 30000, // Consider data fresh for 30 seconds
      gcTime: 300000 // Keep unused data in cache for 5 minutes
    }
  }
})

// Utility functions
export function truncateAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}