'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Home,
  History,
  Wallet,
  Users,
  LogOut,
  Menu,
  X,
  Trophy,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = { name: string; href: string; icon: LucideIcon }

const publicNavigation: NavItem[] = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Challenges', href: '/dashboard/challenges', icon: Trophy },
]

const accountNavigation: NavItem[] = [
  { name: 'History', href: '/history', icon: History },
  { name: 'Wallet', href: '/dashboard/wallet', icon: Wallet },
  { name: 'Friends', href: '/dashboard/friends', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function DashboardNav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuthStore()

  const navigation = useMemo(
    () => (hasSession ? [...publicNavigation, ...accountNavigation] : publicNavigation),
    [hasSession],
  )

  useEffect(() => {
    setMounted(true)

    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setHasSession(!!session)
      setSessionChecked(true)
    }

    syncSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  const handleSignOut = async () => {
    if (isSigningOut) return

    try {
      setIsSigningOut(true)
      await signOut()
      setHasSession(false)
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
      setIsSigningOut(false)
    }
  }

  if (!mounted || !sessionChecked) {
    return (
      <div className="hidden md:block md:w-64 md:fixed md:inset-y-0 md:border-r md:border-gray-200 md:bg-white" />
    )
  }

  const renderNavLinks = (linkClassName: string, iconClassName: string) =>
    navigation.map((item) => {
      const isActive = pathname === item.href
      return (
        <Link
          key={item.name}
          href={item.href}
          className={cn(linkClassName, isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900')}
        >
          <item.icon className={iconClassName} />
          {item.name}
        </Link>
      )
    })

  return (
    <>
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex items-center flex-shrink-0 px-6 py-4">
            <Link href="/dashboard" className="flex items-center">
              <Trophy className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Credor</span>
            </Link>
          </div>

          <div className="flex-grow flex flex-col">
            <nav className="flex-1 px-2 py-4 space-y-1">
              {renderNavLinks(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                'mr-3 h-5 w-5',
              )}
            </nav>
          </div>

          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            {hasSession ? (
              <>
                <div className="flex items-center">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar_url || ''} />
                    <AvatarFallback>
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-3 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{user?.username || 'Account'}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="w-full mt-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                >
                  {isSigningOut ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                  ) : (
                    <LogOut className="mr-2 h-4 w-4" />
                  )}
                  {isSigningOut ? 'Signing out...' : 'Sign out'}
                </Button>
              </>
            ) : (
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/signin">Sign in</Link>
                </Button>
                <Button size="sm" className="w-full bg-[#1A7431] hover:bg-[#156B2A]" asChild>
                  <Link href="/signup">Get started</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center">
            <Trophy className="h-6 w-6 text-blue-600" />
            <span className="ml-2 text-lg font-bold text-gray-900">Credor</span>
          </Link>

          <div className="flex items-center space-x-2">
            {hasSession ? (
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar_url || ''} />
                <AvatarFallback>
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link href="/signin">Sign in</Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="bg-white border-t border-gray-200">
            <nav className="px-2 py-2 space-y-1">
              {renderNavLinks(
                'group flex items-center px-3 py-2 text-base font-medium rounded-md transition-colors',
                'mr-3 h-5 w-5',
              )}
              {hasSession ? (
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="w-full justify-start text-gray-600 hover:text-gray-900 disabled:opacity-50"
                >
                  {isSigningOut ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-3" />
                  ) : (
                    <LogOut className="mr-3 h-5 w-5" />
                  )}
                  {isSigningOut ? 'Signing out...' : 'Sign out'}
                </Button>
              ) : (
                <Button className="w-full bg-[#1A7431] hover:bg-[#156B2A]" asChild>
                  <Link href="/signup">Get started</Link>
                </Button>
              )}
            </nav>
          </div>
        )}
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200">
        <nav className="flex justify-around py-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center py-2 px-3 text-xs font-medium transition-colors',
                  isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700',
                )}
              >
                <item.icon className="h-5 w-5 mb-1" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}
