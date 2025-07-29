import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getBetStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    case 'accepted':
      return 'bg-blue-100 text-blue-800'
    case 'settled':
      return 'bg-green-100 text-green-800'
    case 'cancelled':
      return 'bg-red-100 text-red-800'
    case 'rejected':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function getMatchOutcomeText(outcome: string): string {
  switch (outcome) {
    case 'home_win':
      return 'Home Win'
    case 'away_win':
      return 'Away Win'
    case 'draw':
      return 'Draw'
    default:
      return 'Unknown'
  }
}

export function getTransactionDisplayInfo(type: string, amount: number, currency: string) {
  switch (type) {
    case 'deposit':
      return {
        title: 'Deposit successful',
        description: `+${formatCurrency(amount, currency)}`,
        bgColor: 'bg-green-50',
        dotColor: 'bg-green-500',
        textColor: 'text-green-700'
      }
    case 'withdrawal':
      return {
        title: 'Withdrawal processed',
        description: `-${formatCurrency(amount, currency)}`,
        bgColor: 'bg-blue-50',
        dotColor: 'bg-blue-500',
        textColor: 'text-blue-700'
      }
    case 'bet_win':
      return {
        title: 'Bet won!',
        description: `+${formatCurrency(amount, currency)}`,
        bgColor: 'bg-green-50',
        dotColor: 'bg-green-500',
        textColor: 'text-green-700'
      }
    case 'bet_loss':
      return {
        title: 'Bet lost',
        description: `-${formatCurrency(amount, currency)}`,
        bgColor: 'bg-red-50',
        dotColor: 'bg-red-500',
        textColor: 'text-red-700'
      }
    case 'bet_cancel':
      return {
        title: 'Bet cancelled',
        description: `Refunded ${formatCurrency(amount, currency)}`,
        bgColor: 'bg-yellow-50',
        dotColor: 'bg-yellow-500',
        textColor: 'text-yellow-700'
      }
    default:
      return {
        title: 'Transaction',
        description: `${formatCurrency(amount, currency)}`,
        bgColor: 'bg-gray-50',
        dotColor: 'bg-gray-500',
        textColor: 'text-gray-700'
      }
  }
}
