import type { NextConfig } from "next"
import withPWA from "next-pwa"

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  images: {
    domains: ['apsxilfojvnxmmvxlkea.supabase.co'],
  },
  // Optimize for production
  compress: true,
  poweredByHeader: false,
  reactStrictMode: false, // Disable strict mode to avoid double rendering issues
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds even if type checks fail (e.g. in .next/types)
    ignoreBuildErrors: true,
  },
  // Use standalone output
  output: 'standalone',
  webpack: (config, { isServer }) => {
    // Handle missing dependencies for web3 packages
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    }
    
    // Ignore specific modules that cause warnings
    config.externals = config.externals || []
    if (!isServer) {
      config.externals.push({
        '@react-native-async-storage/async-storage': 'commonjs @react-native-async-storage/async-storage',
        'pino-pretty': 'commonjs pino-pretty',
      })
    }
    
    return config
  },
}

// Wrap with PWA config
const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Disable in dev for faster builds
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/apsxilfojvnxmmvxlkea\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24, // 24 hours
        },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
  ],
})

export default pwaConfig(nextConfig)
