import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Wallet {
  id: string
  user_id: string
  balance: number
  locked_balance: number
  currency: string
}

async function fetchWallet(): Promise<Wallet | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) return null

  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', session.user.id)
    .single()

  if (error) {
    console.error('Error fetching wallet:', error)
    return null
  }

  return data as Wallet
}

export function useWallet() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: fetchWallet,
  })
}


