export interface Sport {
  id: string
  name: string
  icon_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  other_name: string
}

export interface SportPreference {
  sport_id: string
  sport_name: string
  sport_icon_url: string | null
  is_interested: boolean
  priority: number
}

