'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { sportsService } from '@/lib/supabase/sports'
import type { SportPreference } from '@/types/sports'
import { Trophy, Check, Search } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

export function SportPreferences() {
  const [sports, setSports] = useState<SportPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedSports, setSelectedSports] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')

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
      toast.error('Failed to load sport preferences')
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
      
      // Update all preferences
      const updates = sports.map(sport => ({
        sportId: sport.sport_id,
        isInterested: selectedSports.has(sport.sport_id),
        priority: 0,
      }))

      await sportsService.bulkUpdateSportPreferences(updates)
      
      toast.success('Sport preferences saved successfully!')
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast.error('Failed to save preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Filter sports based on search term
  const filteredSports = sports.filter(sport =>
    sport.sport_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const selectedCount = selectedSports.size
  const hasChanges = sports.some(sport => {
    const wasInterested = sport.is_interested
    const isNowInterested = selectedSports.has(sport.sport_id)
    return wasInterested !== isNowInterested
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <CardTitle>Sport Preferences</CardTitle>
        </div>
        <CardDescription>
          Select the sports you're interested in to personalize your experience and recommendations
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search sports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={selectAll}
              disabled={saving}
              size="sm"
            >
              Select All
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={clearAll}
              disabled={saving}
              size="sm"
            >
              Clear All
            </Button>
          </div>
        </div>

        {/* Selected Count */}
        <div className="text-sm text-gray-600">
          {selectedCount} {selectedCount === 1 ? 'sport' : 'sports'} selected
        </div>

        {/* Sports Grid */}
        {filteredSports.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No sports found matching "{searchTerm}"
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredSports.map((sport) => {
              const isSelected = selectedSports.has(sport.sport_id)
              return (
                <button
                  key={sport.sport_id}
                  type="button"
                  onClick={() => toggleSport(sport.sport_id)}
                  disabled={saving}
                  className={cn(
                    'relative p-4 rounded-lg border-2 transition-all text-left',
                    'hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed',
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )}
                  
                  {sport.sport_icon_url ? (
                    <img 
                      src={sport.sport_icon_url} 
                      alt={sport.sport_name}
                      className="w-10 h-10 mx-auto mb-2 object-contain"
                    />
                  ) : (
                    <div className="w-10 h-10 mx-auto mb-2 bg-gray-100 rounded-full flex items-center justify-center">
                      <Trophy className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  
                  <div className="font-semibold text-sm text-center">{sport.sport_name}</div>
                </button>
              )
            })}
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="min-w-[120px]"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>

        {!hasChanges && selectedCount > 0 && (
          <p className="text-sm text-gray-500 text-center">
            No changes to save
          </p>
        )}
      </CardContent>
    </Card>
  )
}

