#!/usr/bin/env node

console.log('🔗 WalletConnect Project ID Setup')
console.log('================================')
console.log('')
console.log('To fix mobile wallet connections, you need a real WalletConnect Project ID.')
console.log('')
console.log('📋 Steps:')
console.log('1. Go to: https://cloud.walletconnect.com')
console.log('2. Sign up for a FREE account')
console.log('3. Click "Create Project"')
console.log('4. Enter project name: "Credor Web App"')
console.log('5. Copy the Project ID (looks like: 1234567890abcdef...)')
console.log('6. Add to your .env.local file:')
console.log('   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here')
console.log('')
console.log('🚀 After adding the Project ID:')
console.log('- Mobile deep linking will work properly')
console.log('- MetaMask will open automatically')
console.log('- Connection requests will appear in wallet apps')
console.log('')
console.log('💡 Current status: Using demo project ID (limited functionality)')
console.log('')

// Check if .env.local exists and show current status
const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  if (envContent.includes('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID')) {
    console.log('✅ Found .env.local with WalletConnect Project ID')
  } else {
    console.log('⚠️  .env.local exists but missing WalletConnect Project ID')
  }
} else {
  console.log('⚠️  .env.local file not found')
  console.log('   Create it with: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id')
}
