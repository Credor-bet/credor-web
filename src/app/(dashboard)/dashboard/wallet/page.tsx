'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Wallet, 
  Plus, 
  Minus, 
  ArrowUpRight, 
  ArrowDownLeft,
  CreditCard,
  Globe,
  Clock,
  DollarSign,
  ChevronRight
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

interface PaymentProcessor {
  id: string
  name: string
  type: 'digital'
  icon: React.ReactNode
  description: string
  regions: string[]
  comingSoon?: boolean
}

const paymentProcessors: PaymentProcessor[] = [
  {
    id: 'paystack',
    name: 'Paystack',
    type: 'digital',
    icon: <CreditCard className="h-6 w-6" />,
    description: 'Modern online and offline payments for Africa',
    regions: ['NG', 'GH', 'ZA', 'KE']
  },
  {
    id: 'flutterwave',
    name: 'Flutterwave',
    type: 'digital',
    icon: <Globe className="h-6 w-6" />,
    description: 'Payment infrastructure for global merchants',
    regions: ['NG', 'GH', 'KE', 'UG', 'ZA', 'RW']
  }
]

export default function WalletPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user, wallet, refreshWallet } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (user?.id) {
      fetchTransactions()
      refreshWallet()
    }
  }, [user?.id, refreshWallet])

  const fetchTransactions = async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

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
      return <ArrowDownLeft className="h-4 w-4 text-green-600" />
    } else if (transaction.type === 'withdrawal' || transaction.type === 'bet_loss') {
      return <ArrowUpRight className="h-4 w-4 text-red-600" />
    }
    return <DollarSign className="h-4 w-4 text-blue-600" />
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

  const availableProcessors = paymentProcessors

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
          <p className="text-gray-600 mt-1">Manage your balance and payment methods</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Minus className="h-4 w-4 mr-2" />
            Withdraw
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Money
          </Button>
        </div>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Wallet className="h-6 w-6" />
              <CardTitle className="text-white">Available Balance</CardTitle>
            </div>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-3xl font-bold">
              {formatCurrency(wallet?.balance || 0, wallet?.currency || 'USD')}
            </div>
            {wallet?.locked_balance && wallet.locked_balance > 0 && (
              <div className="text-blue-100 text-sm">
                {formatCurrency(wallet.locked_balance, wallet.currency || 'USD')} locked in active bets
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>
              Your latest transactions and bet activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions yet</p>
                  <p className="text-sm">Your transaction history will appear here</p>
                </div>
              ) : (
                <>
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center space-x-3">
                        {getTransactionIcon(transaction)}
                        <div>
                          <div className="font-medium capitalize">
                            {transaction.type.replace('_', ' ')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(transaction.created_at)} · {transaction.provider}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className={`font-medium ${getTransactionColor(transaction)}`}>
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
                  ))}
                  {transactions.length >= 5 && (
                    <div className="pt-4">
                      <Button 
                        variant="outline" 
                        className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => router.push('/dashboard/wallet/transactions')}
                      >
                        View all Transactions
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Payment Methods</span>
            </CardTitle>
            <CardDescription>
              African payment solutions for deposits and withdrawals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {availableProcessors.map((processor) => (
                <div 
                  key={processor.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-not-allowed opacity-75"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {processor.icon}
                    </div>
                    <div>
                      <div className="font-medium flex items-center space-x-2">
                        <span>{processor.name}</span>
                        <Badge variant="outline" className="text-xs">
                          Coming Soon
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500">
                        {processor.description}
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-gray-400" />
                </div>
              ))}
            </div>
            
            <Separator className="my-4" />
            
            <div className="text-center py-4">
              <div className="text-sm text-gray-500 mb-2">
                Payment processing integration coming soon
              </div>
              <Badge variant="outline" className="text-xs">
                Beta Version
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}