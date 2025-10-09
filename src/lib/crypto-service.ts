import { supabase } from './supabase'

// Types based on the API documentation
export interface PublicPoolInfo {
  address: string
  network: string
  network_id: number
  usdc_contract: string
  is_testnet: boolean
}

export interface DepositSource {
  id: string
  user_id: string
  from_address: string
  created_at: string
}

export interface WithdrawalRequest {
  user_id: string
  amount: number
  to_address: string
  idempotency_key: string
}

export interface WithdrawalResponse {
  id: string
  user_id: string
  amount: number
  to_address: string
  transaction_hash?: string
  status: 'pending' | 'completed' | 'failed'
  created_at: string
  updated_at?: string
}

export interface WithdrawalEstimate {
  gas_estimate: number
  gas_price_gwei: number
  total_cost_eth: number
  network: string
}

export interface DepositVerificationRequest {
  tx_hash: string
  user_id: string
}

export interface DepositVerificationResponse {
  status: 'success' | 'duplicate' | 'ignored' | 'error'
  user_id: string
  amount?: number
  new_balance?: number
  transaction_id?: string
  tx_hash: string
}

export interface UserBalance {
  id: string
  user_id: string
  balance: number
  created_at: string
  updated_at: string
}

export interface DepositHistory {
  id: string
  user_id: string
  tx_hash: string
  amount: number
  confirmed: boolean
  created_at: string
}

export interface WithdrawalHistory {
  id: string
  user_id: string
  amount: number
  to_address: string
  transaction_hash?: string
  status: 'pending' | 'completed' | 'failed'
  created_at: string
}

export interface ApiError {
  error: string
  detail?: string
}

class CryptoService {
  private baseUrl: string
  private authToken: string | null = null

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_CRYPTO_API_URL || 'https://7b7e1b4b6a42.ngrok-free.app'
  }

  private async getAuthToken(): Promise<string> {
    if (this.authToken) {
      return this.authToken
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No authentication token available')
    }

    this.authToken = session.access_token
    return this.authToken
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true', // Bypass ngrok warning page
    }

    // Add auth token for protected endpoints
    if (!endpoint.includes('/pool-info') && !endpoint.includes('/estimate-fee') && !endpoint.includes('/withdrawals/') && !endpoint.includes('/health')) {
      try {
        const token = await this.getAuthToken()
        defaultHeaders['Authorization'] = `Bearer ${token}`
      } catch (error) {
        // Some endpoints don't require auth, continue without token
      }
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    })

    // Check if response is HTML (error page) instead of JSON
    const contentType = response.headers.get('content-type')
    if (contentType && !contentType.includes('application/json')) {
      const text = await response.text()
      console.error('Non-JSON response received:', {
        url,
        status: response.status,
        contentType,
        body: text.substring(0, 200) + (text.length > 200 ? '...' : '')
      })
      throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`)
    }

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'Unknown error',
        detail: `HTTP ${response.status}`
      }))
      throw new Error(errorData.detail || errorData.error)
    }

    return response.json()
  }

  // Public endpoints (no auth required)
  async getPublicPoolInfo(): Promise<PublicPoolInfo> {
    return this.makeRequest<PublicPoolInfo>('/api/v1/pool-info')
  }

  async estimateWithdrawalFee(toAddress: string, amount: number): Promise<WithdrawalEstimate> {
    const params = new URLSearchParams({
      to_address: toAddress,
      amount: amount.toString()
    })
    return this.makeRequest<WithdrawalEstimate>(`/api/v1/withdrawals/estimate-fee?${params}`)
  }

  async getWithdrawalStatus(transactionId: string): Promise<WithdrawalResponse> {
    return this.makeRequest<WithdrawalResponse>(`/api/v1/withdrawals/${transactionId}`)
  }

  async getHealthStatus(): Promise<any> {
    return this.makeRequest('/api/v1/health')
  }

  // Protected endpoints (require auth)
  async createDepositSource(userId: string, fromAddress: string): Promise<DepositSource> {
    return this.makeRequest<DepositSource>('/api/v1/deposit-sources', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        from_address: fromAddress
      })
    })
  }

  async getDepositSources(userId: string): Promise<DepositSource[]> {
    return this.makeRequest<DepositSource[]>(`/api/v1/deposit-sources/${userId}`)
  }

  async deleteDepositSource(sourceId: string): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(`/api/v1/deposit-sources/${sourceId}`, {
      method: 'DELETE'
    })
  }

  async createWithdrawal(request: WithdrawalRequest): Promise<WithdrawalResponse> {
    return this.makeRequest<WithdrawalResponse>('/api/v1/withdraw', {
      method: 'POST',
      body: JSON.stringify(request)
    })
  }

  async getUserWithdrawalHistory(
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<WithdrawalHistory[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    })
    return this.makeRequest<WithdrawalHistory[]>(`/api/v1/withdrawals/user/${userId}?${params}`)
  }

  async verifyDeposit(request: DepositVerificationRequest): Promise<DepositVerificationResponse> {
    return this.makeRequest<DepositVerificationResponse>('/api/v1/deposit/verify', {
      method: 'POST',
      body: JSON.stringify(request)
    })
  }

  async getUserBalance(userId: string): Promise<UserBalance> {
    return this.makeRequest<UserBalance>(`/api/v1/balance/${userId}`)
  }

  async getUserDepositHistory(userId: string): Promise<DepositHistory[]> {
    return this.makeRequest<DepositHistory[]>(`/api/v1/deposits/${userId}`)
  }

  // Utility methods
  validateEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  generateIdempotencyKey(): string {
    return `withdrawal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  formatUSDC(amount: number): string {
    return amount.toFixed(6)
  }

  parseUSDC(amount: string): number {
    return parseFloat(amount)
  }
}

export const cryptoService = new CryptoService()
