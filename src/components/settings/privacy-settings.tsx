'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { privacyService } from '@/lib/supabase/privacy'
import type { UserPrivacySettings, PrivacyLevel } from '@/types/privacy'
import { Shield, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

export function PrivacySettings() {
  const [settings, setSettings] = useState<UserPrivacySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      setLoading(true)
      const data = await privacyService.getMyPrivacySettings()
      setSettings(data)
    } catch (error) {
      console.error('Error loading privacy settings:', error)
      toast.error('Failed to load privacy settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!settings) return

    try {
      setSaving(true)
      await privacyService.updatePrivacySettings(settings)
      toast.success('Privacy settings saved successfully!')
    } catch (error) {
      console.error('Error saving privacy settings:', error)
      toast.error('Failed to save privacy settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function updateSetting<K extends keyof UserPrivacySettings>(
    key: K,
    value: UserPrivacySettings[K]
  ) {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-gray-600">Failed to load privacy settings.</p>
            <Button onClick={loadSettings} className="mt-4" variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const privacyLevels: PrivacyLevel[] = ['all', 'friends', 'none']

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Privacy Settings</CardTitle>
          </div>
          <CardDescription>
            Control who can see your profile information and betting activity
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Profile Visibility */}
          <div className="space-y-2">
            <Label htmlFor="profile_visibility">Profile Visibility</Label>
            <Select
              value={settings.profile_visibility}
              onValueChange={(value: PrivacyLevel) => updateSetting('profile_visibility', value)}
            >
              <SelectTrigger id="profile_visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {privacyLevels.map(level => (
                  <SelectItem key={level} value={level}>
                    {level === 'all' ? 'Everyone' : level === 'friends' ? 'Friends Only' : 'No One'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              Who can view your profile information
            </p>
          </div>

          <Separator />

          {/* Stats Visibility */}
          <div className="space-y-2">
            <Label htmlFor="stats_visibility">Stats Visibility</Label>
            <Select
              value={settings.stats_visibility}
              onValueChange={(value: PrivacyLevel) => updateSetting('stats_visibility', value)}
            >
              <SelectTrigger id="stats_visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {privacyLevels.map(level => (
                  <SelectItem key={level} value={level}>
                    {level === 'all' ? 'Everyone' : level === 'friends' ? 'Friends Only' : 'No One'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              Who can view your betting statistics (wins, losses, win rate)
            </p>
          </div>

          <Separator />

          {/* Bet History Visibility */}
          <div className="space-y-2">
            <Label htmlFor="bet_history_visibility">Bet History Visibility</Label>
            <Select
              value={settings.bet_history_visibility}
              onValueChange={(value: PrivacyLevel) => updateSetting('bet_history_visibility', value)}
            >
              <SelectTrigger id="bet_history_visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {privacyLevels.map(level => (
                  <SelectItem key={level} value={level}>
                    {level === 'all' ? 'Everyone' : level === 'friends' ? 'Friends Only' : 'No One'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              Who can view your bet history
            </p>
          </div>

          <Separator />

          {/* Public Bet Privacy */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Public Bet Visibility</h3>
              <p className="text-sm text-gray-500 mb-4">
                Control what information others can see about your participation in public bets
              </p>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.show_public_bet_participation}
                  onChange={(e) => updateSetting('show_public_bet_participation', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div>
                  <span className="font-medium">Show Public Bet Participation</span>
                  <p className="text-sm text-gray-500">
                    Allow others to see that you're participating in a public bet
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.show_bet_predictions}
                  onChange={(e) => updateSetting('show_bet_predictions', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div>
                  <span className="font-medium">Show Bet Predictions</span>
                  <p className="text-sm text-gray-500">
                    Allow others to see which outcome you selected (home win, away win, or draw)
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.show_bet_amounts}
                  onChange={(e) => updateSetting('show_bet_amounts', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div>
                  <span className="font-medium">Show Bet Amounts</span>
                  <p className="text-sm text-gray-500">
                    Allow others to see how much you wagered on bets
                  </p>
                </div>
              </label>
            </div>
          </div>

          <Separator />

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="min-w-[120px]"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

