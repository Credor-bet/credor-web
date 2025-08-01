'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Calendar, User, MapPin, Phone, AlertTriangle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ProfileFormData {
  full_name: string
  date_of_birth: string
  country: string
  phone_number: string
}

export default function ProfileCompletionPage() {
  const router = useRouter()
  const { user, refreshUser } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [ageError, setAgeError] = useState('')
  
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
    date_of_birth: '',
    country: '',
    phone_number: ''
  })

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push('/signin')
          return
        }

        // Check if user already has a complete profile
        if (user?.is_profile_complete) {
          router.push('/dashboard')
          return
        }

        setIsCheckingAuth(false)
      } catch (error) {
        console.error('Error checking auth:', error)
        router.push('/signin')
      }
    }

    checkAuth()
  }, [user, router])

  const calculateAge = (birthDate: string): number => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  const validateAge = (birthDate: string): boolean => {
    const age = calculateAge(birthDate)
    if (age < 18) {
      setAgeError(`You must be at least 18 years old to use this application. You are currently ${age} years old.`)
      return false
    }
    setAgeError('')
    return true
  }

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear age error when user changes date
    if (field === 'date_of_birth' && ageError) {
      setAgeError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Validate age
    if (!validateAge(formData.date_of_birth)) {
      setIsLoading(false)
      return
    }

    // Validate required fields
    if (!formData.full_name.trim() || !formData.date_of_birth || !formData.country.trim()) {
      toast.error('Please fill in all required fields')
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name.trim(),
          date_of_birth: formData.date_of_birth,
          country: formData.country.trim(),
          phone_number: formData.phone_number.trim() || null,
          is_profile_complete: true
        })
        .eq('id', user?.id)

      if (error) {
        throw error
      }

      // Refresh user data
      await refreshUser()
      
      toast.success('Profile completed successfully!')
      router.push('/dashboard')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to complete profile. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <User className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
          <CardDescription>
            Please provide the following information to complete your profile
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name *
              </Label>
              <Input
                id="full_name"
                type="text"
                placeholder="Enter your full name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                required
              />
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label htmlFor="date_of_birth" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date of Birth *
              </Label>
              <Input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                required
                max={new Date().toISOString().split('T')[0]}
              />
              {ageError && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  {ageError}
                </div>
              )}
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Country *
              </Label>
              <Input
                id="country"
                type="text"
                placeholder="Enter your country"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                required
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone_number" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number (Optional)
              </Label>
              <Input
                id="phone_number"
                type="tel"
                placeholder="Enter your phone number"
                value={formData.phone_number}
                onChange={(e) => handleInputChange('phone_number', e.target.value)}
              />
            </div>

            <Separator />

            {/* Age Verification Notice */}
            <div className="rounded-lg bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Age Verification Required</p>
                  <p className="mt-1">
                    You must be at least 18 years old to use this application. 
                    Your date of birth will be verified.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !!ageError}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Completing Profile...
                </>
              ) : (
                'Complete Profile'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 