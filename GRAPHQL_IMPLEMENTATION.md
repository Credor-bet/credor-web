# GraphQL Implementation for Wallet Balance and Active Bet Count

## Overview

This implementation adds GraphQL support to fetch wallet balance and active bet count, with automatic fallback to Supabase if GraphQL fails.

## Files Modified

1. **`src/lib/graphql.ts`** - New GraphQL client and queries
2. **`src/lib/store.ts`** - Updated to use GraphQL with fallback
3. **`src/app/(dashboard)/dashboard/page.tsx`** - Added debug button
4. **`test-graphql.js`** - Test script for GraphQL connectivity

## Setup Instructions

### 1. Install Dependencies

```powershell
cd credor-web
npm install graphql-request graphql graphql-ws
```

### 2. Configure GraphQL Endpoint

Set the environment variable in your `.env.local`:

```env
NEXT_PUBLIC_GRAPHQL_ENDPOINT=http://your-graphql-endpoint/graphql
```

### 3. Test GraphQL Connectivity

```powershell
# Set your test user ID and access token
$env:TEST_USER_ID="your-actual-user-id"
$env:SUPABASE_ACCESS_TOKEN="your-access-token"
$env:GRAPHQL_ENDPOINT="https://apsxilfojvnxmmvxlkea.supabase.co/graphql/v1"

# Run the test script
node test-graphql.js
```

**To get your access token:**
1. Open your app in the browser
2. Open Developer Tools → Application → Local Storage
3. Find the `sb-apsxilfojvnxmmvxlkea-auth-token` key
4. Copy the `access_token` value from the JSON

## How It Works

### Fallback Strategy

1. **Primary**: Attempt GraphQL query
2. **Fallback**: If GraphQL fails, use Supabase
3. **Logging**: Detailed console logs for debugging

### Key Functions

- `refreshWallet()` - Fetches wallet balance via GraphQL → Supabase
- `refreshBets()` - Fetches active bets via GraphQL → Supabase  
- `debugUserData()` - Comprehensive debug query

## Debugging

### 1. Check Browser Console

Look for these log messages:
- "Attempting GraphQL wallet fetch..."
- "GraphQL wallet response: ..."
- "GraphQL bets fetch failed, falling back to Supabase: ..."

### 2. Use Debug Button

Click the "Debug Data" button in the dashboard to run comprehensive diagnostics.

### 3. Test Individual Queries

Use the test script to verify GraphQL connectivity:

```powershell
node test-graphql.js
```

## Expected Behavior

### Success Case
- GraphQL queries succeed
- Wallet balance and bet count display correctly
- Console shows "GraphQL wallet response:" and "GraphQL dashboard response:"

### Fallback Case
- GraphQL fails (network, auth, etc.)
- Supabase queries execute
- Console shows "GraphQL wallet fetch failed, falling back to Supabase"
- Data still displays correctly

### Error Case
- Both GraphQL and Supabase fail
- Console shows detailed error messages
- UI shows loading states or empty data

## Troubleshooting

### Common Issues

1. **GraphQL Endpoint Not Found**
   - Check `NEXT_PUBLIC_GRAPHQL_ENDPOINT` environment variable
   - Verify the endpoint is accessible

2. **Authentication Issues**
   - GraphQL may require auth headers
   - Update `graphqlClient` headers in `graphql.ts`

3. **Schema Mismatch**
   - GraphQL schema may differ from expected
   - Check the actual schema vs. our queries

4. **Data Format Issues**
   - GraphQL returns different data structure
   - Check `extractWalletFromResponse` and `extractBetsFromResponse` functions

### Rollback Instructions

If you need to rollback to Supabase-only:

1. Restore `src/lib/store-backup.ts` to `src/lib/store.ts`
2. Remove `src/lib/graphql.ts`
3. Remove debug button from dashboard
4. Uninstall GraphQL dependencies: `npm uninstall graphql-request graphql graphql-ws`

## GraphQL Queries

### Wallet Query
```graphql
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
```

### Active Bets Query
```graphql
query GetUserActiveBets($userId: UUID!) {
  betsCollection(
    filter: {
      or: [
        { creator_id: { eq: $userId } },
        { opponent_id: { eq: $userId } }
      ],
      status: { in: ["pending", "accepted"] }
    }
    orderBy: [{ created_at: Descending }]
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
```

## Next Steps

1. **Test the implementation** with your GraphQL endpoint
2. **Monitor console logs** for any issues
3. **Verify data accuracy** compared to Supabase
4. **Remove fallback** once GraphQL is stable
5. **Add error boundaries** for better user experience 