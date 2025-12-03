'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Home route - redirects to /dashboard
 * 
 * This provides a canonical `/home` route that maps to the dashboard.
 * All redirects for unauthorized access should use `/home` instead of `/dashboard`.
 */
export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard')
  }, [router])

  // Show loading state during redirect
  return (
    <div className="p-4 md:p-6 flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
}

