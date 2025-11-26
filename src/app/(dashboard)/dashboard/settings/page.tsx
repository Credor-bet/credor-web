'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { PrivacySettings } from '@/components/settings/privacy-settings'
import { SportPreferences } from '@/components/settings/sport-preferences'
import { DiscordLink } from '@/components/settings/discord-link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Mail, Calendar, MapPin, Phone } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const { user } = useAuthStore()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push('/signin')
          return
        }

        // Check if profile is complete
        if (!user?.is_profile_complete) {
          router.push('/profile-completion')
          return
        }
      } catch (error) {
        console.error('Error checking auth:', error)
        router.push('/signin')
      }
    }

    checkAuth()
  }, [user, router])

  if (!user) {
    return (
      <div className="md:ml-64 p-4 md:p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="md:ml-64 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account settings and privacy preferences</p>
        </div>

        {/* Profile Information (Read-only) */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Your profile information (contact support to update)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-500">Full Name</div>
                <div className="font-medium">{user.full_name || 'Not set'}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div className="font-medium">{user.email}</div>
              </div>
            </div>

            {user.date_of_birth && (
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Date of Birth</div>
                  <div className="font-medium">
                    {new Date(user.date_of_birth).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}

            {user.country && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Country</div>
                  <div className="font-medium">{user.country}</div>
                </div>
              </div>
            )}

            {user.phone_number && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Phone Number</div>
                  <div className="font-medium">{user.phone_number}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sport Preferences */}
        <SportPreferences />

        {/* Privacy Settings */}
        <PrivacySettings />

        {/* Discord Account Linking */}
        <DiscordLink />
      </div>
    </div>
  )
}

