import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client using Next.js auth helpers (cookie-based)
export const supabase = createClientComponentClient()

// Server-side Supabase client
export const createServerSupabaseClient = () => {
  return createClientComponentClient()
}

// Database types based on the schema
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          email: string
          full_name: string | null
          avatar_url: string | null
          phone_number: string | null
          date_of_birth: string | null
          country: string | null
          preferred_currency: string
          total_wagered: number
          total_won: number
          total_lost: number
          total_bets: number
          total_wins: number
          total_losses: number
          win_rate: number
          status: string
          is_email_verified: boolean
          is_phone_verified: boolean
          last_login: string | null
          created_at: string
          updated_at: string
          is_profile_complete: boolean
        }
        Insert: {
          id?: string
          username: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          phone_number?: string | null
          date_of_birth?: string | null
          country?: string | null
          preferred_currency?: string
          total_wagered?: number
          total_won?: number
          total_lost?: number
          total_bets?: number
          total_wins?: number
          total_losses?: number
          win_rate?: number
          status?: string
          is_email_verified?: boolean
          is_phone_verified?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
          is_profile_complete?: boolean
        }
        Update: {
          id?: string
          username?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          phone_number?: string | null
          date_of_birth?: string | null
          country?: string | null
          preferred_currency?: string
          total_wagered?: number
          total_won?: number
          total_lost?: number
          total_bets?: number
          total_wins?: number
          total_losses?: number
          win_rate?: number
          status?: string
          is_email_verified?: boolean
          is_phone_verified?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
          is_profile_complete?: boolean
        }
      }
      wallets: {
        Row: {
          id: string
          user_id: string
          balance: number
          locked_balance: number
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          balance?: number
          locked_balance?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          balance?: number
          locked_balance?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
      }
      bets: {
        Row: {
          id: string
          creator_id: string
          opponent_id: string | null
          match_id: string
          min_opponent_amount: number
          status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'settled'
          max_participants: number
          created_at: string
          updated_at: string
          settled_at: string | null
        }
        Insert: {
          id?: string
          creator_id: string
          opponent_id?: string | null
          match_id: string
          min_opponent_amount?: number
          status?: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'settled'
          max_participants?: number
          created_at?: string
          updated_at?: string
          settled_at?: string | null
        }
        Update: {
          id?: string
          creator_id?: string
          opponent_id?: string | null
          match_id?: string
          min_opponent_amount?: number
          status?: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'settled'
          max_participants?: number
          created_at?: string
          updated_at?: string
          settled_at?: string | null
        }
      }
      matches: {
        Row: {
          id: string
          sport_id: string
          start_time: string
          end_time: string | null
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          created_at: string
          updated_at: string
          home_team_id: string
          away_team_id: string
          fixture_id: string
          match_result: 'home_win' | 'away_win' | 'draw' | null
          home_score: number | null
          away_score: number | null
        }
        Insert: {
          id?: string
          sport_id: string
          start_time: string
          end_time?: string | null
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
          home_team_id: string
          away_team_id: string
          fixture_id: string
          match_result?: 'home_win' | 'away_win' | 'draw' | null
          home_score?: number | null
          away_score?: number | null
        }
        Update: {
          id?: string
          sport_id?: string
          start_time?: string
          end_time?: string | null
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
          home_team_id?: string
          away_team_id?: string
          fixture_id?: string
          match_result?: 'home_win' | 'away_win' | 'draw' | null
          home_score?: number | null
          away_score?: number | null
        }
      }
      friendships: {
        Row: {
          id: string
          user_id: string
          friend_id: string
          status: 'pending' | 'accepted' | 'blocked'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          status?: 'pending' | 'accepted' | 'blocked'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          friend_id?: string
          status?: 'pending' | 'accepted' | 'blocked'
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      view_user_bets: {
        Row: {
          bet_id: string
          creator_id: string
          opponent_id: string | null
          match_id: string
          status: string
          created_at: string
          updated_at: string
          settled_at: string | null
          min_opponent_amount: number
          max_participants: number
          user_id: string
          prediction: 'home_win' | 'away_win' | 'draw'
          user_amount: number
          role: 'creator' | 'opponent' | 'participant'
        }
      }
      view_user_wallets: {
        Row: {
          user_id: string
          balance: number
          locked_balance: number
          currency: string
        }
      }
    }
    Functions: {
      accept_friend_request: {
        Args: {
          incoming_request_id: string
        }
        Returns: void
      }
      get_friend_requests: {
        Args: {
          user_id: string
        }
        Returns: {
          request_id: string
          sender_id: string
          username: string
          avatar_url: string
        }[]
      }
      get_friends_with_stats: {
        Args: {
          uid: string
        }
        Returns: {
          id: string
          username: string
          avatar_url: string
        }[]
      }
      join_bet: {
        Args: {
          p_bet_id: string
          p_user_id: string
          p_amount: number
          p_prediction: 'home_win' | 'away_win' | 'draw'
        }
        Returns: boolean
      }
      leave_bet: {
        Args: {
          p_bet_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      place_bet: {
        Args: {
          p_creator_id: string
          p_opponent_id: string | null
          p_match_id: string
          p_amount: number
          p_min_opponent_amount: number
          p_prediction: 'home_win' | 'away_win' | 'draw'
          p_max_participants?: number
        }
        Returns: string
      }
      reject_bet: {
        Args: {
          p_bet_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      settle_bet: {
        Args: {
          p_bet_id: string
          p_outcome: 'home_win' | 'away_win' | 'draw'
          p_house_fee_percent: number
          p_starter_bonus_percent: number
        }
        Returns: boolean
      }
    }
    Enums: {
      bet_status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'settled'
      match_outcome: 'home_win' | 'away_win' | 'draw'
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T] 