import { User } from './types'

/**
 * Type for profile completeness check - only requires the fields we actually check
 */
export type ProfileCompletenessCheck = {
  full_name?: string | null
  country?: string | null
  phone_country_code?: string | null
  phone_number?: string | null
} | null

/**
 * Check if a user profile is complete (has all required fields)
 * Required fields: full_name, country, phone_country_code, phone_number
 */
export function isProfileComplete(profile: User | ProfileCompletenessCheck | { full_name?: any; country?: any; phone_country_code?: any; phone_number?: any; } | null | any): boolean {
  if (!profile) return false

  const hasFullName = !!profile.full_name && profile.full_name.trim().length > 0
  const hasCountry = !!profile.country && profile.country.trim().length > 0
  const hasPhone = !!profile.phone_country_code && !!profile.phone_number && 
                   profile.phone_country_code.trim().length > 0 && 
                   profile.phone_number.trim().length > 0

  return hasFullName && hasCountry && hasPhone
}

/**
 * Get list of missing required fields
 */
export function getMissingFields(profile: User | ProfileCompletenessCheck): string[] {
  if (!profile) return ['Full Name', 'Country', 'Phone Number']

  const missing: string[] = []

  if (!profile.full_name || profile.full_name.trim().length === 0) {
    missing.push('Full Name')
  }

  if (!profile.country || profile.country.trim().length === 0) {
    missing.push('Country')
  }

  if (!profile.phone_country_code || !profile.phone_number || 
      profile.phone_country_code.trim().length === 0 || 
      profile.phone_number.trim().length === 0) {
    missing.push('Phone Number')
  }

  return missing
}


