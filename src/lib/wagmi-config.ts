'use client'

import { createWeb3Modal } from '@web3modal/wagmi/react'
import { http, createConfig } from 'wagmi'
import { polygon, polygonAmoy } from 'wagmi/chains'
import { walletConnect, injected } from 'wagmi/connectors'
import { QueryClient } from '@tanstack/react-query'

// Get project ID from environment variables
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id'

// Create wagmi config
export const config = createConfig({
  chains: [polygon, polygonAmoy],
  transports: {
    [polygon.id]: http(),
    [polygonAmoy.id]: http()
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
  },
  // Mobile-specific configurations
  enableNetworkView: true,
  enableAccountView: true,
  enableExplorer: true,
  // Better mobile deep linking
  mobileWallets: [
    {
      id: 'metamask',
      name: 'MetaMask',
      links: {
        native: 'metamask://',
        universal: 'https://metamask.app.link'
      }
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      links: {
        native: 'coinbasewallet://',
        universal: 'https://go.cb-w.com'
      }
    },
    {
      id: 'trust',
      name: 'Trust Wallet',
      links: {
        native: 'trust://',
        universal: 'https://link.trustwallet.com'
      }
    }
  ]
})

// Create query client for React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
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