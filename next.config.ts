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
}

export default nextConfig
