# Wallet Setup Guide

## Environment Variables

Add these to your `.env.local` file:

```bash
# WalletConnect Project ID (Required for mobile wallet support)
# Get your free project ID from: https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Crypto API Configuration (if not already set)
NEXT_PUBLIC_CRYPTO_API_URL=https://your-api-domain.com
NEXT_PUBLIC_NETWORK=polygon
NEXT_PUBLIC_IS_TESTNET=true
```

## Getting WalletConnect Project ID

1. Go to https://cloud.walletconnect.com
2. Sign up for a free account
3. Create a new project
4. Copy the Project ID
5. Add it to your `.env.local` file

## Mobile Wallet Support

With this setup, users can now connect with:
- **Desktop**: MetaMask, Coinbase Wallet, Brave Wallet, etc.
- **Mobile**: MetaMask Mobile, Coinbase Wallet, Trust Wallet, Rainbow, etc.
- **QR Codes**: Any WalletConnect-compatible wallet

The app will automatically:
- Detect if user is on mobile and show appropriate wallet options
- Handle deep linking to mobile wallet apps
- Show QR codes for desktop-to-mobile connections
- Support 300+ wallets through WalletConnect