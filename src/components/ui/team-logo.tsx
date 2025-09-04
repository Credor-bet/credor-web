'use client'

import { cn } from '@/lib/utils'

interface TeamLogoProps {
  team: { 
    name: string; 
    logo_url?: string; 
    cloudinary_logo_url?: string;
  }
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showName?: boolean
}

export function TeamLogo({ team, size = 'md', className, showName = false }: TeamLogoProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  }
  
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }
  
  // Use cloudinary_logo_url as primary, fallback to logo_url, then default icon
  const logoUrl = team.cloudinary_logo_url || team.logo_url
  
  if (logoUrl) {
    return (
      <div className="flex items-center">
        <img 
          src={logoUrl} 
          alt={`${team.name} logo`} 
          className={cn(sizeClasses[size], 'rounded-full object-cover', className)}
        />
        {showName && (
          <span className={cn('ml-2 font-medium', textSizes[size])}>
            {team.name}
          </span>
        )}
      </div>
    )
  }
  
  return (
    <div className="flex items-center">
      <div className={cn(
        sizeClasses[size], 
        'bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center border border-gray-300',
        className
      )}>
        <span className={cn('font-bold text-gray-600', textSizes[size])}>
          {team.name.charAt(0).toUpperCase()}
        </span>
      </div>
      {showName && (
        <span className={cn('ml-2 font-medium', textSizes[size])}>
          {team.name}
        </span>
      )}
    </div>
  )
}

// Standalone logo without name
export function TeamLogoOnly({ team, size = 'md', className }: Omit<TeamLogoProps, 'showName'>) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  }
  
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }
  
  // Use cloudinary_logo_url as primary, fallback to logo_url, then default icon
  const logoUrl = team.cloudinary_logo_url || team.logo_url
  
  if (logoUrl) {
    return (
      <img 
        src={logoUrl} 
        alt={`${team.name} logo`} 
        className={cn(sizeClasses[size], 'rounded-full object-cover', className)}
      />
    )
  }
  
  return (
    <div className={cn(
      sizeClasses[size], 
      'bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center border border-gray-300',
      className
    )}>
      <span className={cn('font-bold text-gray-600', textSizes[size])}>
        {team.name.charAt(0).toUpperCase()}
      </span>
    </div>
  )
}
