import { supabase } from './supabase'

// Types based on the API documentation
export interface PublicPoolInfo {
  address: string
  network: string
  network_id?: number
  usdc_contract: string
  is_testnet: boolean
}

export interface DepositSource {
  id: string
  user_id: string
  from_address: string
  created_at: string
  verified?: boolean
  verification_method?: string | null
  verified_at?: string | null
  verification_challenge?: string | null
  challenge_expires_at?: string | null
}

export interface VerificationChallengeRequest {
  user_id: string
  address: string
}

export interface VerificationChallengeResponse {
  challenge_id: string
  challenge_message: string
  expires_at: string
}

export interface VerificationConfirmRequest {
  challenge_id: string
  signed_message: string
}

export interface PendingChallenge {
  id: string
  user_id: string
  address: string
  challenge_message: string
  expires_at: string
  created_at: string
}

export interface PendingDeposit {
  transaction_id: string
  tx_hash: string
  amount: number
  status: 'processing'
  message: string
  estimated_completion: string
  created_at: string
}

export interface DepositStatus {
  status: 'processing' | 'completed' | 'failed'
  message: string
  data?: {
    amount: number
    tx_hash: string
    from_address: string
    to_address: string
    created_at: string
    confirmations: number
    required_confirmations: number
    progress_percent: number
    estimated_completion: string
    last_checked_at: string
    final_balance?: number
  }
}

export interface VerificationConfirmResponse {
  verified: boolean
  message: string
  deposit_source: DepositSource
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

// Circle wallet interfaces
export interface CircleWallet {
  wallet_id: string
  address: string
  blockchain: string
  state: string
  is_new: boolean
  qr_code_data?: string
}

export interface CircleBalance {
  user_id: string
  circle_wallet_id: string
  address: string
  balances: Array<{
    token_id: string
    token_address: string
    amount: string
    currency: string
  }>
}

export interface CircleDeposit {
  id: string
  circle_tx_id: string
  circle_tx_type: 'INBOUND' | 'OUTBOUND'
  state: 'INITIATED' | 'QUEUED' | 'CLEARED' | 'SENT' | 'STUCK' | 'CONFIRMED' | 'COMPLETE' | 'CANCELLED' | 'FAILED' | 'DENIED'
  tx_hash?: string
  amount_usd: number
  created_at: string
  transactions?: {
    id: string
    status: string
    amount: string
  }
}

class CryptoService {
  private baseUrl: string
  private authToken: string | null = null

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_CRYPTO_API_URL || 'https://0bc5724857cc.ngrok-free.app'
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
    // Exclude public endpoints that don't require authentication
    const publicEndpoints = [
      '/pool-info',
      '/pool-wallet/info',
      '/estimate-fee',
      '/health'
    ]
    
    // Check if endpoint matches public endpoints pattern
    const isPublicEndpoint = publicEndpoints.some(publicPath => endpoint.includes(publicPath)) ||
      // Allow GET /withdrawals/{transaction_id} without auth (public status check)
      endpoint.match(/^\/api\/v1\/withdrawals\/[a-f0-9-]+$/)
    
    if (!isPublicEndpoint) {
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
      let errorData: ApiError
      try {
        errorData = await response.json()
      } catch {
        errorData = {
          error: 'Unknown error',
          detail: `HTTP ${response.status}`
        }
      }
      
      // FastAPI validation errors (422) often have detailed field-level errors
      if (response.status === 422 && Array.isArray(errorData.detail)) {
        // Format FastAPI validation errors into a readable message
        const validationErrors = errorData.detail.map((err: any) => {
          const field = err.loc?.join('.') || 'field'
          const message = err.msg || 'Invalid value'
          return `${field}: ${message}`
        }).join(', ')
        throw new Error(`Validation error: ${validationErrors}`)
      }
      
      // For other errors, use detail or error field
      const errorMessage = errorData.detail || errorData.error || `HTTP ${response.status}`
      throw new Error(errorMessage)
    }

    return response.json()
  }

  // Public endpoints (no auth required)
  /**
   * @deprecated Use getOrCreateCircleWallet() instead. Pooled wallet is deprecated in favor of Circle wallets.
   */
  async getPublicPoolInfo(): Promise<PublicPoolInfo> {
    return this.makeRequest<PublicPoolInfo>('/api/v1/pool-wallet/info')
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

  // Circle wallet endpoints (require auth)
  async getOrCreateCircleWallet(): Promise<CircleWallet> {
    return this.makeRequest<CircleWallet>('/api/v1/circle/wallet', {
      method: 'POST'
    })
  }

  async getCircleWallet(userId: string): Promise<CircleWallet> {
    return this.makeRequest<CircleWallet>(`/api/v1/circle/wallet/${userId}`)
  }

  async getCircleWalletBalance(userId: string): Promise<CircleBalance> {
    return this.makeRequest<CircleBalance>(`/api/v1/circle/balance/${userId}`)
  }

  async getCircleDeposits(userId: string, limit: number = 50, offset: number = 0): Promise<CircleDeposit[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    })
    return this.makeRequest<CircleDeposit[]>(`/api/v1/circle/deposits/${userId}?${params}`)
  }

  // Protected endpoints (require auth)
  /**
   * @deprecated Deposit sources are deprecated in favor of Circle wallets. Use getOrCreateCircleWallet() instead.
   */
  async createDepositSource(userId: string, fromAddress: string): Promise<DepositSource> {
    return this.makeRequest<DepositSource>('/api/v1/deposit-sources', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        from_address: fromAddress
      })
    })
  }

  /**
   * @deprecated Deposit sources are deprecated in favor of Circle wallets.
   */
  async getDepositSources(userId: string): Promise<DepositSource[]> {
    return this.makeRequest<DepositSource[]>(`/api/v1/deposit-sources/${userId}`)
  }

  /**
   * @deprecated Deposit sources are deprecated in favor of Circle wallets.
   */
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

  // Address verification endpoints (deprecated)
  /**
   * @deprecated Address verification is deprecated in favor of Circle wallets. Circle handles wallet management automatically.
   */
  async requestVerificationChallenge(request: VerificationChallengeRequest): Promise<VerificationChallengeResponse> {
    return this.makeRequest<VerificationChallengeResponse>('/api/v1/deposit-sources/request-verification', {
      method: 'POST',
      body: JSON.stringify(request)
    })
  }

  /**
   * @deprecated Address verification is deprecated in favor of Circle wallets.
   */
  async confirmVerification(request: VerificationConfirmRequest): Promise<VerificationConfirmResponse> {
    return this.makeRequest<VerificationConfirmResponse>('/api/v1/deposit-sources/confirm-verification', {
      method: 'POST',
      body: JSON.stringify(request)
    })
  }

  /**
   * @deprecated Address verification is deprecated in favor of Circle wallets.
   */
  async getPendingChallenges(userId: string): Promise<PendingChallenge[]> {
    return this.makeRequest<PendingChallenge[]>(`/api/v1/deposit-sources/challenges/${userId}`)
  }

  // New endpoints for block confirmation system
  async getPendingDeposits(): Promise<PendingDeposit[]> {
    return this.makeRequest<PendingDeposit[]>('/api/v1/deposits/pending')
  }

  async getDepositStatus(txHash: string): Promise<DepositStatus> {
    return this.makeRequest<DepositStatus>(`/api/v1/deposits/${txHash}/status`)
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
