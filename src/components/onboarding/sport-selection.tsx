'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { sportsService } from '@/lib/supabase/sports'
import type { SportPreference } from '@/types/sports'
import { Trophy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SportSelectionProps {
  onComplete?: () => void
}

export function SportSelection({ onComplete }: SportSelectionProps) {
  const [sports, setSports] = useState<SportPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedSports, setSelectedSports] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadSports()
  }, [])

  async function loadSports() {
    try {
      setLoading(true)
      const data = await sportsService.getMySportPreferences()
      setSports(data)
      
      // Initialize selected sports based on is_interested
      const interested = new Set(
        data.filter(sport => sport.is_interested).map(sport => sport.sport_id)
      )
      setSelectedSports(interested)
    } catch (error) {
      console.error('Error loading sports:', error)
      toast.error('Failed to load sports')
    } finally {
      setLoading(false)
    }
  }

  function toggleSport(sportId: string) {
    setSelectedSports(prev => {
      const next = new Set(prev)
      if (next.has(sportId)) {
        next.delete(sportId)
      } else {
        next.add(sportId)
      }
      return next
    })
  }

  function selectAll() {
    const allIds = new Set(sports.map(sport => sport.sport_id))
    setSelectedSports(allIds)
  }

  function clearAll() {
    setSelectedSports(new Set())
  }

  async function handleSave() {
    try {
      setSaving(true)
      
      // Update all preferences (even if none selected - sets all to false)
      const updates = sports.map(sport => ({
        sportId: sport.sport_id,
        isInterested: selectedSports.has(sport.sport_id),
        priority: 0,
      }))

      await sportsService.bulkUpdateSportPreferences(updates)
      
      toast.success('Sport preferences saved!')
      onComplete?.()
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast.error('Failed to save preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSkip() {
    try {
      setSaving(true)
      
      // Call the skip function to mark preferences as set
      await sportsService.skipSportPreferences()
      
      toast.success('Skipped sport selection')
      onComplete?.()
    } catch (error) {
      console.error('Error skipping preferences:', error)
      toast.error('Failed to skip. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (sports.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-gray-600">No active sports available at this time.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const selectedCount = selectedSports.size

  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Trophy className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Choose Your Sports</CardTitle>
        <CardDescription>
          Select the sports you're interested in to personalize your experience
        </CardDescription>
        <p className="text-sm text-gray-500 mt-2">
          {selectedCount} {selectedCount === 1 ? 'sport' : 'sports'} selected
        </p>
      </CardHeader>
      
      <CardContent className="space-y-8 px-4 sm:px-8 pb-10">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={selectAll}
            disabled={saving}
          >
            Select All
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={clearAll}
            disabled={saving}
          >
            Clear All
          </Button>
        </div>

        {/* Sports Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {sports.map((sport) => {
            const isSelected = selectedSports.has(sport.sport_id)
            return (
              <button
                key={sport.sport_id}
                type="button"
                onClick={() => toggleSport(sport.sport_id)}
                disabled={saving}
                className={cn(
                  'relative flex flex-col items-center justify-between p-4 rounded-xl border-2 transition-all',
                  'hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed',
                  'h-[160px] w-full',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 z-10">
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}
                
                <div className="flex-shrink-0 pt-2">
                  {sport.sport_icon_url ? (
                    <img 
                      src={sport.sport_icon_url} 
                      alt={sport.sport_name}
                      className="w-12 h-12 object-contain"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <Trophy className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center w-full px-2">
                  <div className="font-semibold text-gray-900 text-center text-sm sm:text-base leading-tight">
                    {sport.sport_name}
                  </div>
                  
                  {isSelected && (
                    <div className="mt-1.5 text-primary text-xs text-center font-medium">✓ Selected</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Continue and Skip Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto px-8"
            size="lg"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Continue'
            )}
          </Button>
          
          {/* Skip Button - no color or border */}
          <Button
            onClick={handleSkip}
            disabled={saving}
            variant="ghost"
            className="w-full sm:w-auto px-8 text-muted-foreground hover:text-foreground"
            size="lg"
          >
            Skip
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

