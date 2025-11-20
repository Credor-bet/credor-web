'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

interface SlideData {
  id: number
  backgroundImage: string
  headline: string
  bodyText: string
  progressStep: number
}

const slides: SlideData[] = [
  {
    id: 1,
    backgroundImage: '/slide1-background.png',
    headline: "Bet Against Real People - No House Edge",
    bodyText: "Challenge real players, not a bookmaker. Higher odds, better wins!",
    progressStep: 1
  },
  {
    id: 2,
    backgroundImage: '/slide2-background.png',
    headline: "Win on Matches & Challenges.",
    bodyText: "Bet on your favorite teams or play in-house games to win real money.",
    progressStep: 2
  }
]

export default function HomePage() {
  const router = useRouter()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // Check authentication and redirect if signed in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          // User is authenticated, redirect to dashboard
          router.push('/dashboard')
          return
        }
      } catch (error) {
        console.error('Error checking auth:', error)
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [router])

  // Auto-advance slides every 4 seconds
  useEffect(() => {
    if (isCheckingAuth) return // Don't start slideshow until auth check is done
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [isCheckingAuth])

  const handleLogin = () => {
    router.push('/signin')
  }

  const handleRegister = () => {
    router.push('/signup')
  }

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out"
        style={{
          backgroundImage: `url(${slides[currentSlide].backgroundImage})`
        }}
      >
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/60"></div>
      </div>
      
      {/* Main content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="flex justify-between items-center p-6">
          <div className="text-white text-2xl font-bold font-dm-sans text-shadow-sm">Credor</div>
          <div className="flex gap-4">
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/10 border border-white/20 font-dm-sans backdrop-blur-custom"
              onClick={handleLogin}
            >
              Sign In
            </Button>
            <Button 
              className="bg-[#1A7431] hover:bg-[#156B2A] text-white font-dm-sans text-shadow-sm"
              onClick={handleRegister}
            >
              Get Started
            </Button>
          </div>
        </header>

        {/* Hero section with automatic carousel */}
        <main className="flex-1 flex items-center justify-center px-6">
          {/* Slide content */}
          <div className="max-w-4xl mx-auto text-center">
            <div className="transition-all duration-1000 ease-in-out">
              {/* Main heading */}
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight font-dm-sans tracking-[-0.312px] text-shadow-lg">
                {slides[currentSlide].headline}
              </h1>
              
              {/* Subheading */}
              <p className="text-xl md:text-2xl text-[rgba(255,255,255,0.7)] mb-12 max-w-3xl mx-auto leading-relaxed font-dm-sans tracking-[-0.312px] text-shadow-sm">
                {slides[currentSlide].bodyText}
              </p>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <Button 
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto px-12 py-6 text-lg font-semibold bg-black/20 border-2 border-white/60 text-white hover:bg-black/40 hover:border-white/80 font-dm-sans backdrop-blur-custom transition-all duration-300"
                  onClick={handleLogin}
                >
                  Login
                </Button>
                <Button 
                  size="lg"
                  className="w-full sm:w-auto px-12 py-6 text-lg font-semibold bg-[#1A7431] hover:bg-[#156B2A] text-white font-dm-sans text-shadow-sm transition-all duration-300"
                  onClick={handleRegister}
                >
                  Register
                </Button>
              </div>
            </div>

            {/* Progress indicator (read-only) */}
            <div className="flex justify-center items-center gap-2 mt-16">
              {slides.map((_, index) => (
                <div
                  key={index}
                  className={`w-20 h-1 rounded-full transition-all duration-500 ${
                    index === currentSlide ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 text-center">
          <p className="text-gray-500 text-sm font-dm-sans">
            © 2024 Credor. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  )
}
