import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Transaction {
  id: string
  wallet_id: string
  bet_id: string | null
  type: string
  amount: number
  status: 'pending' | 'completed' | 'failed'
  currency: string
  created_at: string
}

async function fetchTransactions(): Promise<Transaction[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) return []

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error fetching transactions:', error)
    return []
  }

  return (data ?? []) as Transaction[]
}

export function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
  })
}


