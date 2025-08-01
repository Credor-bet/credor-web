import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@supabase/supabase-js'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  images: {
    domains: ['apsxilfojvnxmmvxlkea.supabase.co'],
  },
  // Optimize for production
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
}

export default nextConfig
