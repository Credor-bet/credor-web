'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Mail, CheckCircle, AlertCircle, RefreshCw, Key } from 'lucide-react'
import { toast } from 'sonner'

export default function ConfirmEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [confirmationCode, setConfirmationCode] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [hasAutoSent, setHasAutoSent] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      try {
        // First, check if email is provided in URL params
        const emailParam = searchParams.get('email')
        console.log('Confirm-email: Email param from URL:', emailParam)
        
        if (emailParam) {
          setEmail(emailParam)
          console.log('Confirm-email: Set email from URL param')
        }

        const { data: { session } } = await supabase.auth.getSession()
        console.log('Confirm-email: Session exists:', !!session, 'Session user:', session?.user?.email)
        
        if (session?.user) {
          // If user is already confirmed, redirect to profile completion or dashboard
          if (session.user.email_confirmed_at) {
            console.log('Confirm-email: User already confirmed, checking profile')
            // Check if profile is complete
            const { data: profile } = await supabase
              .from('users')
              .select('is_profile_complete')
              .eq('id', session.user.id)
              .single()
            
            if (profile?.is_profile_complete) {
              router.push('/dashboard')
            } else {
              router.push('/profile-completion')
            }
            return
          }
          
          // Set email from session (if not already set from URL)
          if (!emailParam) {
            setEmail(session.user.email || '')
            console.log('Confirm-email: Set email from session')
          }
        } else {
          // No session - this can happen during signup process or when redirected from signin
          // Don't redirect immediately, let the user see the confirmation page
          console.log('Confirm-email: No session found')
        }
      } catch (error) {
        console.error('Confirm-email: Error checking session:', error)
        // Don't redirect on error, let user see the page
      } finally {
        setIsCheckingSession(false)
      }
    }

    checkSession()

    // Auto-send confirmation code when page loads (if we have an email)
    const autoSendConfirmation = async () => {
      // Prevent multiple auto-sends
      if (hasAutoSent) {
        console.log('Confirm-email: Auto-send already completed, skipping')
        return
      }

      const emailParam = searchParams.get('email')
      const emailToUse = emailParam || (await supabase.auth.getSession()).data.session?.user?.email
      
      console.log('Confirm-email: Auto-send email to use:', emailToUse)
      
      if (emailToUse && !hasAutoSent) {
        console.log('Auto-sending confirmation code to:', emailToUse)
        setHasAutoSent(true) // Mark as sent immediately to prevent duplicates
        
        try {
          const { error } = await supabase.auth.resend({
            type: 'signup',
            email: emailToUse,
          })
          
          if (error) {
            console.error('Failed to auto-send confirmation code:', error)
            // Reset the flag if there was an error
            setHasAutoSent(false)
          } else {
            console.log('Confirmation code sent automatically')
            // Start cooldown timer for auto-sent code
            setResendCooldown(30) // Match Supabase's 30-second rate limit
          }
        } catch (error) {
          console.error('Error auto-sending confirmation code:', error)
          // Reset the flag if there was an error
          setHasAutoSent(false)
        }
      } else {
        console.log('Confirm-email: No email available for auto-send or already sent')
      }
    }

    // Only auto-send if we have an email and haven't sent yet
    if (email && !hasAutoSent) {
      // Delay auto-send to ensure page is loaded
      const timer = setTimeout(autoSendConfirmation, 1000)
      return () => clearTimeout(timer)
    }

    // Listen for auth state changes to detect email confirmation
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        if (session?.user) {
          // Set email when session becomes available
          setEmail(session.user.email || '')
          
          if (session.user.email_confirmed_at) {
            console.log('Email confirmed, checking profile completion...')
            // Check if profile is complete
            try {
              const { data: profile } = await supabase
                .from('users')
                .select('is_profile_complete')
                .eq('id', session.user.id)
                .single()
              
              console.log('Profile completion status:', profile?.is_profile_complete)
              
              if (profile?.is_profile_complete) {
                router.push('/dashboard')
              } else {
                router.push('/profile-completion')
              }
            } catch (error) {
              console.error('Error checking profile completion:', error)
              // Fallback to dashboard
              router.push('/dashboard')
            }
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, email, hasAutoSent, searchParams])

  // Handle resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleResendConfirmation = async () => {
    if (!email || isResending || resendCooldown > 0) return

    setIsResending(true)
    try {
      console.log('Resending confirmation code to:', email)
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })
      
      if (error) {
        console.error('Failed to resend confirmation code:', error)
        
        // Check if it's a rate limit error and extract the time
        if (error.message.includes('For security purposes, you can only request this after')) {
          const timeMatch = error.message.match(/(\d+) seconds/)
          if (timeMatch) {
            const remainingSeconds = parseInt(timeMatch[1])
            console.log(`Rate limited, setting cooldown to ${remainingSeconds} seconds`)
            setResendCooldown(remainingSeconds)
          } else {
            // Default to 30 seconds if we can't parse the time
            setResendCooldown(30)
          }
        }
        
        toast.error(error.message)
      } else {
        console.log('Confirmation code resent successfully')
        toast.success('Confirmation code sent!')
        setResendCooldown(30) // Set to 30 seconds to match Supabase rate limit
        setHasAutoSent(false) // Reset auto-send flag for manual resend
      }
    } catch (error) {
      console.error('Error resending confirmation code:', error)
      toast.error('Failed to resend confirmation code')
    } finally {
      setIsResending(false)
    }
  }

  const handleSubmitConfirmation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirmationCode.trim()) {
      toast.error('Please enter the confirmation code')
      return
    }

    setIsSubmitting(true)
    try {
      console.log('Submitting confirmation code:', confirmationCode)
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: confirmationCode,
        type: 'signup'
      })

      console.log('Verification result:', { data, error })

      if (error) {
        console.error('Verification error:', error)
        toast.error(error.message)
      } else if (data.user) {
        console.log('Verification successful, user:', data.user.email)
        toast.success('Email confirmed successfully!')
        
        // Update the database to mark email as verified
        try {
          const { error: updateError } = await supabase
            .from('users')
            .update({ is_email_verified: true })
            .eq('id', data.user.id)
          
          if (updateError) {
            console.error('Error updating email verification status:', updateError)
          } else {
            console.log('Email verification status updated in database')
          }
        } catch (dbError) {
          console.error('Error updating database:', dbError)
        }
        
        // Add a small delay to ensure database update is processed
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Check if profile is complete and redirect accordingly
        try {
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('is_profile_complete')
            .eq('id', data.user.id)
            .single()
          
          if (profileError) {
            console.error('Error fetching profile:', profileError)
            // Fallback to profile completion for new users
            console.log('Error fetching profile, redirecting to profile completion')
            router.push('/profile-completion')
            return
          }
          
          console.log('Profile completion status:', profile?.is_profile_complete)
          
          if (profile?.is_profile_complete) {
            console.log('Redirecting to dashboard')
            router.push('/dashboard')
          } else {
            console.log('Redirecting to profile completion')
            router.push('/profile-completion')
          }
        } catch (profileError) {
          console.error('Error checking profile:', profileError)
          // Fallback to profile completion for new users
          console.log('Error checking profile, redirecting to profile completion')
          router.push('/profile-completion')
        }
      }
    } catch (error) {
      console.error('Unexpected error during verification:', error)
      toast.error('Failed to confirm email')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/signin')
  }

  if (isCheckingSession) {
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
           <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
             <Mail className="h-6 w-6 text-blue-600" />
           </div>
           <CardTitle className="text-2xl font-bold">Confirm Your Email</CardTitle>
           <CardDescription>
             We've sent a 6-digit confirmation code to your email address
           </CardDescription>
         </CardHeader>
        
                 <CardContent className="space-y-6">
           {/* Email Display */}
           <div className="text-center">
             <p className="text-sm text-gray-600 mb-2">Email sent to:</p>
             {email ? (
               <p className="font-medium text-gray-900">{email}</p>
             ) : (
               <p className="text-sm text-gray-500">Loading email address...</p>
             )}
           </div>

           <Separator />

           {/* Confirmation Code Form */}
           <form onSubmit={handleSubmitConfirmation} className="space-y-4">
             <div className="space-y-2">
               <Label htmlFor="confirmationCode">Confirmation Code</Label>
               <div className="relative">
                 <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                 <Input
                   id="confirmationCode"
                   type="text"
                   placeholder="Enter the 6-digit code from your email"
                   value={confirmationCode}
                   onChange={(e) => setConfirmationCode(e.target.value)}
                   className="pl-10"
                   maxLength={6}
                   required
                   disabled={isSubmitting || !email}
                 />
               </div>
             </div>

             <Button 
               type="submit"
               className="w-full"
               disabled={isSubmitting || !email || !confirmationCode.trim()}
             >
               {isSubmitting ? (
                 <>
                   <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                   Confirming...
                 </>
               ) : (
                 'Confirm Email'
               )}
             </Button>
           </form>

           <Separator />

           {/* Instructions */}
           <div className="space-y-4">
             <div className="flex items-start gap-3">
               <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
               <div className="text-sm text-gray-700">
                 <p className="font-medium mb-1">Check your email</p>
                 <p>Enter the 6-digit confirmation code sent to your email address.</p>
               </div>
             </div>

             <div className="flex items-start gap-3">
               <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
               <div className="text-sm text-gray-700">
                 <p className="font-medium mb-1">Can&apos;t find the email?</p>
                 <p>Check your spam folder or try resending the confirmation code. There&apos;s a 30-second cooldown between requests.</p>
               </div>
             </div>
           </div>

           <Separator />

                       {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={handleResendConfirmation}
                disabled={isResending || !email || resendCooldown > 0}
                className="w-full"
                variant="outline"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Resend Code ({resendCooldown}s)
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Resend Confirmation Code
                  </>
                )}
              </Button>

             <Button 
               onClick={handleSignOut}
               variant="ghost"
               className="w-full"
             >
               Sign Out
             </Button>
           </div>

           {/* Auto-refresh notice */}
           <div className="text-center text-xs text-gray-500">
             <p>This page will automatically redirect you once your email is confirmed.</p>
           </div>
         </CardContent>
      </Card>
    </div>
  )
} 