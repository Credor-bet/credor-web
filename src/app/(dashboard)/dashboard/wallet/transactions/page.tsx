'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft,
  ArrowUpRight, 
  ArrowDownLeft,
  DollarSign,
  Filter
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Transaction {
  id: string
  type: string
  amount: number
  status: string
  created_at: string
  provider: string
  currency: string
  balance_after: number | null
  bet_id: string | null
  is_internal: boolean
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (user?.id) {
      fetchAllTransactions()
    }
  }, [user?.id])

  const fetchAllTransactions = async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching transactions:', error)
        return
      }

      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTransactionIcon = (transaction: Transaction) => {
    if (transaction.type === 'deposit' || transaction.type === 'bet_win') {
      return <ArrowDownLeft className="h-5 w-5 text-green-600" />
    } else if (transaction.type === 'withdrawal' || transaction.type === 'bet_loss') {
      return <ArrowUpRight className="h-5 w-5 text-red-600" />
    }
    return <DollarSign className="h-5 w-5 text-blue-600" />
  }

  const getTransactionColor = (transaction: Transaction) => {
    if (transaction.type === 'deposit' || transaction.type === 'bet_win') {
      return 'text-green-600'
    } else if (transaction.type === 'withdrawal' || transaction.type === 'bet_loss') {
      return 'text-red-600'
    }
    return 'text-blue-600'
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { variant: 'default' as const, color: 'bg-green-100 text-green-800' },
      pending: { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800' },
      failed: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    
    return (
      <Badge className={config.color}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="md:ml-64 p-4 md:p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="md:ml-64 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Transactions</h1>
            <p className="text-gray-600 mt-1">Complete transaction history</p>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No transactions yet</p>
                <p className="text-sm">Your transaction history will appear here</p>
              </div>
            ) : (
              transactions.map((transaction, index) => (
                <div key={transaction.id} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      {getTransactionIcon(transaction)}
                    </div>
                    <div>
                      <div className="font-medium capitalize text-lg">
                        {transaction.type.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(transaction.created_at)} • {transaction.provider}
                        {transaction.is_internal && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Internal
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className={`text-lg font-semibold ${getTransactionColor(transaction)}`}>
                        {transaction.type === 'deposit' || transaction.type === 'bet_win' ? '+' : '-'}
                        {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                      </div>
                      {transaction.balance_after && (
                        <div className="text-sm text-gray-500">
                          Balance: {formatCurrency(transaction.balance_after, transaction.currency)}
                        </div>
                      )}
                    </div>
                    {getStatusBadge(transaction.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}