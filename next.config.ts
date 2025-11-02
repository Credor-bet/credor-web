import type { NextConfig } from "next"

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
    // Allow production builds with type errors
    ignoreBuildErrors: false,
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

export default nextConfig
