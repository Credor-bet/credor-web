import { createClient } from 'graphql-ws'
import { GraphQLClient } from 'graphql-request'

// GraphQL endpoint URL (you'll need to replace this with your actual endpoint)
const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'https://apsxilfojvnxmmvxlkea.supabase.co/graphql/v1'

// Create GraphQL client with authentication
export const graphqlClient = new GraphQLClient(GRAPHQL_ENDPOINT, {
  headers: {
    'Content-Type': 'application/json',
    // We'll add auth headers dynamically based on user session
  },
})

// Function to create authenticated GraphQL client
export const createAuthenticatedGraphQLClient = (accessToken?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  if (accessToken) {
    // Try different authentication methods for Supabase GraphQL
    headers['apikey'] = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    headers['Authorization'] = `Bearer ${accessToken}`
    console.log('Setting apikey with anon key, Authorization with access token')
  } else {
    console.log('No access token provided for GraphQL client')
  }
  
  console.log('GraphQL client headers:', headers)
  return new GraphQLClient(GRAPHQL_ENDPOINT, { headers })
}

// GraphQL queries
export const GET_USER_WALLET = `
  query GetUserWallet($userId: UUID!) {
    walletsCollection(
      filter: { user_id: { eq: $userId } }
      first: 1
    ) {
      edges {
        node {
          id
          user_id
          balance
          locked_balance
          currency
          created_at
          updated_at
        }
      }
    }
  }
`

export const GET_USER_ACTIVE_BETS = `
  query GetUserActiveBets($userId: UUID!) {
    betsCollection(
      filter: {
        or: [
          { creator_id: { eq: $userId } },
          { opponent_id: { eq: $userId } }
        ],
        status: { in: ["pending", "accepted"] }
      }
      orderBy: { created_at: "DESC" }
    ) {
      edges {
        node {
          id
          creator_id
          opponent_id
          match_id
          min_opponent_amount
          status
          max_participants
          created_at
          updated_at
          settled_at
        }
      }
    }
  }
`

export const GET_USER_DASHBOARD_DATA = `
  query GetUserDashboardData($userId: UUID!) {
    wallet: walletsCollection(
      filter: { user_id: { eq: $userId } }
      first: 1
    ) {
      edges {
        node {
          id
          balance
          locked_balance
          currency
          updated_at
        }
      }
    }
    
    activeBets: betsCollection(
      filter: {
        or: [
          { creator_id: { eq: $userId } },
          { opponent_id: { eq: $userId } }
        ],
        status: { in: ["pending", "accepted"] }
      }
      orderBy: { created_at: "DESC" }
    ) {
      edges {
        node {
          id
          creator_id
          opponent_id
          match_id
          min_opponent_amount
          status
          max_participants
          created_at
          updated_at
        }
      }
    }
    
    betHistory: betsCollection(
      filter: {
        or: [
          { creator_id: { eq: $userId } },
          { opponent_id: { eq: $userId } }
        ],
        status: { in: ["settled", "cancelled", "rejected"] }
      }
      orderBy: { created_at: "DESC" }
      first: 10
    ) {
      edges {
        node {
          id
          creator_id
          opponent_id
          match_id
          status
          created_at
          settled_at
        }
      }
    }
  }
`

export const DEBUG_USER_DATA = `
  query DebugUserData($userId: UUID!) {
    user: usersCollection(
      filter: { id: { eq: $userId } }
      first: 1
    ) {
      edges {
        node {
          id
          username
          email
        }
      }
    }
    
    wallet: walletsCollection(
      filter: { user_id: { eq: $userId } }
      first: 1
    ) {
      edges {
        node {
          id
          user_id
          balance
          locked_balance
          currency
        }
      }
    }
    
    allBets: betsCollection(
      filter: {
        or: [
          { creator_id: { eq: $userId } },
          { opponent_id: { eq: $userId } }
        ]
      }
      orderBy: { created_at: "DESC" }
    ) {
      edges {
        node {
          id
          creator_id
          opponent_id
          status
          created_at
        }
      }
    }
  }
`

// Helper functions to extract data from GraphQL responses
export const extractWalletFromResponse = (response: any) => {
  const edges = response?.wallet?.edges || []
  return edges.length > 0 ? edges[0].node : null
}

export const extractBetsFromResponse = (response: any, key: string = 'activeBets') => {
  const edges = response?.[key]?.edges || []
  return edges.map((edge: any) => edge.node)
}

export const extractUserFromResponse = (response: any) => {
  const edges = response?.user?.edges || []
  return edges.length > 0 ? edges[0].node : null
} 