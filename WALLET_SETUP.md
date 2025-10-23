# Universal Wallet Integration Setup

## 🔑 Required Environment Variables

Create a `.env.local` file in the `credor-web` directory with the following variables:

```env
# Crypto API Configuration
NEXT_PUBLIC_CRYPTO_API_URL=http://localhost:8000
NEXT_PUBLIC_NETWORK=polygon
NEXT_PUBLIC_IS_TESTNET=true

# WalletConnect Configuration
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

## 📱 Get Your WalletConnect Project ID

WalletConnect is **FREE** and required for mobile wallet support.

### Steps:

1. Go to https://cloud.walletconnect.com
2. Sign up/Sign in (free account)
3. Create a new project
4. Copy your **Project ID**
5. Paste it in `.env.local` as `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

## 🎯 What This Enables

With the Project ID configured, your users can:

- **Desktop**: Use MetaMask, Coinbase Wallet, or any browser extension
- **Mobile Web**: Tap to open their wallet app (MetaMask Mobile, Trust Wallet, Coinbase Wallet, etc.)
- **Cross-Device**: Scan QR code from desktop with phone wallet
- **300+ Wallets**: Automatic support for all major wallets

## 🧪 Testing

### Desktop
1. Install MetaMask or Coinbase Wallet extension
2. Click "Connect Wallet" in the app
3. Select your wallet
4. Approve connection

### Mobile
1. Open the app in mobile browser (Safari/Chrome)
2. Click "Connect Wallet"
3. Select your wallet (e.g., MetaMask Mobile)
4. App will deep link to your wallet app
5. Approve connection in wallet
6. Return to browser

### Cross-Device
1. Open app on desktop
2. Click "Connect Wallet" → "WalletConnect"
3. Scan QR code with phone wallet app
4. Approve connection on phone

## 🚨 Important Notes

- **No WalletConnect account?** The app will still work with browser extensions (desktop only)
- **Project ID is public** - It's safe to commit to Git (it's a client-side identifier)
- **Free tier limits** - WalletConnect free tier: unlimited connections
- **Network configuration** - Make sure testnet/mainnet matches your backend


