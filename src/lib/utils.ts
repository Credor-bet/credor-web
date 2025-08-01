import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate age from birth date
 * @param birthDate - Date of birth in string format (YYYY-MM-DD)
 * @returns Age in years
 */
export function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  return age
}

/**
 * Validate if user meets minimum age requirement
 * @param birthDate - Date of birth in string format (YYYY-MM-DD)
 * @param minimumAge - Minimum age required (default: 18)
 * @returns Object with isValid boolean and age number
 */
export function validateMinimumAge(birthDate: string, minimumAge: number = 18): { isValid: boolean; age: number } {
  const age = calculateAge(birthDate)
  return {
    isValid: age >= minimumAge,
    age
  }
}

/**
 * Format date for display
 * @param date - Date string or Date object
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
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

// Development configuration
const isDevelopment = process.env.NODE_ENV === 'development'

// Optimized logging function
export function devLog(message: string, ...args: any[]) {
  if (isDevelopment) {
    console.log(message, ...args)
  }
}

// Optimized error logging function
export function devError(message: string, ...args: any[]) {
  if (isDevelopment) {
    console.error(message, ...args)
  }
}

// Check if we should enable verbose logging
export function shouldLogVerbose(): boolean {
  return isDevelopment && process.env.NEXT_PUBLIC_VERBOSE_LOGGING === 'true'
}

// Debug utility for user profile issues
export async function debugUserProfile(email: string) {
  if (!isDevelopment) return
  
  try {
    const { supabase } = await import('./supabase')
    
    // Check if user exists by email
    const { data: userByEmail, error: emailError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle()
    
    console.log('=== USER PROFILE DEBUG ===')
    console.log('Email:', email)
    console.log('User by email:', userByEmail)
    console.log('Email error:', emailError)
    
    // Check auth user
    const { data: { user: authUser } } = await supabase.auth.getUser()
    console.log('Auth user:', authUser)
    
    if (authUser) {
      // Check if user exists by auth ID
      const { data: userById, error: idError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()
      
      console.log('User by ID:', userById)
      console.log('ID error:', idError)
    }
    
    console.log('=== END DEBUG ===')
  } catch (error) {
    console.error('Debug error:', error)
  }
}
