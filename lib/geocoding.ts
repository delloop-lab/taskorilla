// Geocoding utility using OpenStreetMap Nominatim API (free, no API key required)

import { isPortugueseCountry, normalizePortuguesePostcode } from './postcode'

export interface GeocodeResult {
  latitude: number
  longitude: number
  display_name: string
  postcode?: string
  closest_address?: string
}

export async function geocodeAddress(
  address: string,
  postcode?: string,
  country?: string
): Promise<GeocodeResult | null> {
  try {
    // Build query - prefer postcode if provided
    const query = postcode ? `${postcode}, ${address}` : address
    
    // Use our API route to avoid CORS issues (server-side proxy)
    const apiUrl = typeof window !== 'undefined' 
      ? '/api/geocode' 
      : process.env.NEXT_PUBLIC_SITE_URL 
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/geocode`
        : 'http://localhost:3000/api/geocode'
    
    const params = new URLSearchParams()
    if (query) params.append('q', query)
    if (postcode) params.append('postcode', postcode)
    if (country) params.append('country', country)
    
    const response = await fetch(
      `${apiUrl}?${params.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    )

    if (!response.ok) {
      throw new Error('Geocoding request failed')
    }

    const data = await response.json()

    if (data.error) {
      console.error('Geocoding API error:', data.error)
      return null
    }

    return data.result || null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

// Helper function to check if a postcode is complete (not being typed)
export function isPostcodeComplete(postcode: string, country?: string): boolean {
  const normalized = postcode.trim()
  
  if (isPortugueseCountry(country)) {
    return normalizePortuguesePostcode(normalized) !== null
  }
  
  // For other countries, consider it complete if it has at least 4 characters
  // and doesn't end with a dash (indicating incomplete typing)
  return normalized.length >= 4 && !normalized.endsWith('-')
}

export async function geocodePostcode(postcode: string, country?: string): Promise<GeocodeResult | null> {
  let normalizedPostcode = postcode.trim()
  
  if (isPortugueseCountry(country)) {
    const formatted = normalizePortuguesePostcode(normalizedPostcode)
    if (!formatted) {
      return null
    }
    normalizedPostcode = formatted
  }
  
  // Don't geocode incomplete postcodes
  if (!isPostcodeComplete(normalizedPostcode, country)) {
    return null
  }
  
  // For Portuguese postcodes with dash format (XXXX-XXX), use specialized handling
  if (isPortugueseCountry(country)) {
    const areaCode = normalizedPostcode.split('-')[0].trim()
    const suffix = normalizedPostcode.split('-')[1]?.trim()
    
    // Strategy 1: Call the API route directly with postcode parameter to ensure GEO API PT is used
    // This bypasses the geocodeAddress wrapper to ensure we get GEO API PT results
    let result: GeocodeResult | null = null
    
    try {
      const apiUrl = typeof window !== 'undefined' 
        ? '/api/geocode' 
        : process.env.NEXT_PUBLIC_SITE_URL 
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/geocode`
          : 'http://localhost:3000/api/geocode'
      
      const params = new URLSearchParams()
      params.append('postcode', normalizedPostcode)
      params.append('country', country || 'Portugal')
      
      const response = await fetch(`${apiUrl}?${params.toString()}`, {
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.result && data.result.latitude && data.result.longitude) {
          console.log(`✅ geocodePostcode: Got result from API route for ${normalizedPostcode}:`, {
            lat: data.result.latitude,
            lon: data.result.longitude
          })
          return data.result
        }
      }
    } catch (error) {
      console.error('Error calling geocode API route directly:', error)
    }
    
    // If we got a result from the direct API call, return it
    // (The direct API call above should have returned if successful)
    
    // Strategy 2: Fallback - try with just the area code if full postcode failed
    // This should rarely be needed as GEO API PT should handle full postcodes
    if (!result) {
      console.warn(`⚠️ Full postcode ${normalizedPostcode} geocoding failed, trying area code ${areaCode}`)
      // Use the API route directly with area code
      const apiUrl = typeof window !== 'undefined' 
        ? '/api/geocode' 
        : process.env.NEXT_PUBLIC_SITE_URL 
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/geocode`
          : 'http://localhost:3000/api/geocode'
      
      try {
        const params = new URLSearchParams()
        params.append('postcode', areaCode)
        params.append('country', country || 'Portugal')
        
        const response = await fetch(`${apiUrl}?${params.toString()}`, {
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.result && data.result.latitude && data.result.longitude) {
            result = data.result
            
            // Update the postcode in the address
            if (result && result.closest_address) {
              result.closest_address = result.closest_address.replace(/\b\d{4}(-\d{3})?\b/, normalizedPostcode)
            } else if (result && result.display_name) {
              result.closest_address = result.display_name.replace(/\b\d{4}(-\d{3})?\b/, normalizedPostcode)
            }
            
            // Add small offset based on suffix to differentiate postcodes in same area
            if (result && suffix && result.latitude && result.longitude) {
              const suffixNum = parseInt(suffix, 10) || 0
              const latOffset = ((suffixNum % 200) - 100) * 0.0002
              const lngOffset = ((suffixNum % 150) - 75) * 0.0002
              
              result.latitude = result.latitude + latOffset
              result.longitude = result.longitude + lngOffset
              
              console.log(`📍 Used area code "${areaCode}" for postcode "${normalizedPostcode}":`, {
                closest_address: result.closest_address,
                suffix: suffix,
                finalLat: result.latitude,
                finalLng: result.longitude
              })
            }
          }
        }
      } catch (error) {
        console.error('Error geocoding area code:', error)
      }
    }
    
    // Return result if we have one
    if (result && result.latitude && result.longitude) {
      return result
    }
    
    // Strategy 3: Last resort - use geographic mapping based on Portuguese postcode ranges
    // Portuguese postcodes are organized geographically:
    // 1000-1999: Greater Lisbon (Lisboa)
    // 2000-2999: Greater Porto
    // 3000-4999: Central Portugal (Coimbra, Aveiro, etc.)
    // 5000-6999: Northern Portugal (Braga, Viana, etc.)
    // 7000-7999: Alentejo region (Évora, Beja, etc.)
    // 8000-8999: Algarve region (Faro, Lagos, Portimão, etc.)
    if (!result) {
      const areaNum = parseInt(areaCode, 10) || 0
      
      // Map area codes to approximate regional centers
      let approximateLat: number
      let approximateLng: number
      let regionName: string
      
      if (areaNum >= 1000 && areaNum < 2000) {
        // Greater Lisbon
        approximateLat = 38.7223
        approximateLng = -9.1393
        regionName = 'Greater Lisbon'
      } else if (areaNum >= 2000 && areaNum < 3000) {
        // Greater Porto
        approximateLat = 41.1579
        approximateLng = -8.6291
        regionName = 'Greater Porto'
      } else if (areaNum >= 3000 && areaNum < 5000) {
        // Central Portugal
        approximateLat = 40.2033
        approximateLng = -8.4103
        regionName = 'Central Portugal'
      } else if (areaNum >= 5000 && areaNum < 7000) {
        // Northern Portugal
        approximateLat = 41.5454
        approximateLng = -8.4265
        regionName = 'Northern Portugal'
      } else if (areaNum >= 7000 && areaNum < 8000) {
        // Alentejo
        approximateLat = 38.5667
        approximateLng = -7.9000
        regionName = 'Alentejo'
      } else if (areaNum >= 8000 && areaNum < 9000) {
        // Algarve (where Lagos is - 8600)
        // Use Lagos coordinates as base for 8600 area
        if (areaNum >= 8600 && areaNum < 8700) {
          approximateLat = 37.1020
          approximateLng = -8.6753
          regionName = 'Lagos, Algarve'
        } else {
          // Other Algarve areas (Faro, Portimão, etc.)
          approximateLat = 37.0194
          approximateLng = -7.9322
          regionName = 'Algarve'
        }
      } else {
        // Fallback to center of Portugal
        approximateLat = 39.5
        approximateLng = -8.0
        regionName = 'Portugal'
      }
      
      // Create result with approximate coordinates
      result = {
        latitude: approximateLat,
        longitude: approximateLng,
        display_name: `${normalizedPostcode}, ${regionName}, Portugal`,
        postcode: normalizedPostcode,
        closest_address: `${normalizedPostcode}, ${regionName}, Portugal`
      }
      
      console.warn(`⚠️ Using approximate coordinates for postcode "${postcode}" (${regionName})`)
    }
    
    // Log for debugging
    if (result) {
      console.log(`✅ Geocoded postcode "${postcode}" to:`, {
        lat: result.latitude,
        lng: result.longitude,
        display_name: result.display_name
      })
    } else {
      console.warn(`⚠️ Failed to geocode postcode "${postcode}"`)
    }
    
    return result
  }
  
  // For non-Portuguese or postcodes without dashes, use standard approach
  return await geocodeAddress('', normalizedPostcode, country)
}

// Calculate distance between two coordinates using Haversine formula
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return Math.round(distance * 10) / 10 // Round to 1 decimal place
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Extract just the town/city name from a full address string
 * For Portuguese addresses: "Street, Parish, Municipality, District, Postcode, Portugal" -> "Municipality"
 * For simple addresses: "City, State" -> "City"
 * For addresses like "Lagos, 8600-545, Portugal" -> "Lagos"
 */
export function extractTownName(location: string): string {
  if (!location) return ''
  
  const parts = location.split(',').map(p => p.trim())
  
  // If it's a Portuguese address format with postcode pattern (xxxx-xxx)
  const hasPortuguesePostcode = parts.some(p => /^\d{4}-\d{3}$/.test(p))
  
  if (hasPortuguesePostcode) {
    // Portuguese format: usually "Street, Parish, Municipality, District, Postcode, Portugal"
    // Or simpler: "Municipality, Postcode, Portugal"
    // Try to find the municipality (usually 3rd part, or 1st if simple)
    if (parts.length >= 3) {
      // Check if first part looks like a street (has numbers or common street words)
      const firstPart = parts[0].toLowerCase()
      const looksLikeStreet = /\d|street|avenue|road|rua|avenida|rua da|rua do|rua de/i.test(firstPart)
      
      if (looksLikeStreet && parts.length >= 3) {
        // Full format: return municipality (usually 3rd part)
        return parts[2] || parts[0]
      } else {
        // Simple format: "Municipality, Postcode, Portugal" -> return first part
        return parts[0]
      }
    } else {
      // Fallback: return first part
      return parts[0]
    }
  }
  
  // For non-Portuguese addresses, return the first part (city name)
  return parts[0] || location
}

