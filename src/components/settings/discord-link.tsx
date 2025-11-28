'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { discordService, type DiscordLink } from '@/lib/supabase/discord'
import { MessageSquare, Link2, Unlink, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

export function DiscordLink() {
  const [linkStatus, setLinkStatus] = useState<DiscordLink | null>(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadLinkStatus()
  }, [])

  async function loadLinkStatus() {
    try {
      setLoading(true)
      setError(null)
      const data = await discordService.getMyDiscordLink()
      setLinkStatus(data)
    } catch (error) {
      console.error('Error loading Discord link status:', error)
      toast.error('Failed to load Discord link status')
    } finally {
      setLoading(false)
    }
  }

  function handleCodeInput(e: React.ChangeEvent<HTMLInputElement>) {
    // Convert to uppercase, filter invalid characters, and limit to 6 characters
    // Valid characters: A-H, J-K, M-N, P-Z, 2-9 (excludes 0, O, I, 1, L)
    const value = e.target.value
      .toUpperCase()
      .replace(/[^A-HJ-KM-NP-Z2-9]/g, '')
      .slice(0, 6)
    setCode(value)
    setError(null) // Clear error when user types
  }

  async function handleLink() {
    // Validate 6-character alphanumeric code
    const codePattern = /^[A-HJ-KM-NP-Z2-9]{6}$/
    if (!codePattern.test(code)) {
      setError('Please enter a valid 6-character code')
      return
    }

    try {
      setLinking(true)
      setError(null)
      const newLink = await discordService.linkDiscordAccount(code)
      setLinkStatus(newLink)
      setCode('')
      toast.success('Discord account linked successfully!')
    } catch (error: any) {
      console.error('Error linking Discord account:', error)
      const errorMessage = error.message || 'Failed to link Discord account. Please try again.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLinking(false)
    }
  }

  async function handleUnlink() {
    if (!confirm('Are you sure you want to unlink your Discord account?')) {
      return
    }

    try {
      setUnlinking(true)
      setError(null)
      await discordService.unlinkDiscordAccount()
      setLinkStatus(null)
      toast.success('Discord account unlinked successfully')
    } catch (error: any) {
      console.error('Error unlinking Discord account:', error)
      const errorMessage = error.message || 'Failed to unlink Discord account. Please try again.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setUnlinking(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <CardTitle>Discord Account</CardTitle>
        </div>
        <CardDescription>
          Link your Discord account to use bot commands and receive notifications
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {linkStatus ? (
          // Linked State
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div className="flex-1">
                <div className="font-medium text-green-900 dark:text-green-100">
                  Discord account linked
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">
                  Username: <span className="font-mono">{linkStatus.discord_username}</span>
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Linked on {new Date(linkStatus.linked_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            <Button
              onClick={handleUnlink}
              disabled={unlinking}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {unlinking ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Unlinking...
                </>
              ) : (
                <>
                  <Unlink className="h-4 w-4 mr-2" />
                  Unlink Account
                </>
              )}
            </Button>
          </div>
        ) : (
          // Unlinked State
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="discord-code">Verification Code</Label>
              <Input
                id="discord-code"
                type="text"
                pattern="[A-HJ-KM-NP-Z2-9]{6}"
                value={code}
                onChange={handleCodeInput}
                placeholder="K7X9M2"
                maxLength={6}
                disabled={linking}
                className="text-center text-2xl font-mono tracking-widest h-14 text-lg uppercase"
                style={{ textTransform: 'uppercase' }}
              />
              <p className="text-sm text-gray-500">
                Run <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">/link start</code> in Discord to receive your verification code via DM.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <Button
              onClick={handleLink}
              disabled={linking || !/^[A-HJ-KM-NP-Z2-9]{6}$/.test(code)}
              className="w-full sm:w-auto"
            >
              {linking ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Linking...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Link Account
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

