'use client'

import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/hooks/queries/use-current-user'
import { useWallet } from '@/hooks/queries/use-wallet'

interface AuthStoreLike {
  user: ReturnType<typeof useCurrentUser>['data']
  wallet: ReturnType<typeof useWallet>['data']
  isLoading: boolean
  isAuthenticated: boolean
  refreshUser: () => Promise<void>
  refreshWallet: () => Promise<void>
  signOut: () => Promise<void>
}

export function useAuthStore(): AuthStoreLike {
  const {
    data: user,
    isLoading: isUserLoading,
  } = useCurrentUser()
  const {
    data: wallet,
    isLoading: isWalletLoading,
  } = useWallet()
  const queryClient = useQueryClient()

  const isLoading = isUserLoading || isWalletLoading
  const isAuthenticated = !!user

  const refreshUser = async () => {
    await queryClient.invalidateQueries({ queryKey: ['currentUser'] })
  }

  const refreshWallet = async () => {
    await queryClient.invalidateQueries({ queryKey: ['wallet'] })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    await queryClient.clear()
  }

  return {
    user,
    wallet,
    isLoading,
    isAuthenticated,
    refreshUser,
    refreshWallet,
    signOut,
  }
}


