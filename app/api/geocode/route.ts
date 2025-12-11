import { NextRequest, NextResponse } from 'next/server'
import { isPortugueseCountry, normalizePortuguesePostcode } from '@/lib/postcode'

type NominatimResult = {
  lat: string
  lon: string
  display_name: string
  address?: Record<string, string>
}

const fetchFromNominatim = async (params: Record<string, string | undefined>) => {
  const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search')
  nominatimUrl.searchParams.set('format', 'json')
  nominatimUrl.searchParams.set('limit', '10') // Get multiple results to find exact match
  nominatimUrl.searchParams.set('addressdetails', '1')

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      nominatimUrl.searchParams.set(key, value)
    }
  })

  const response = await fetch(nominatimUrl.toString(), {
    headers: {
      'User-Agent': 'Taskorilla/1.0 (contact@taskorilla.com)'
    }
  })

  if (!response.ok) {
    throw new Error('Geocoding request failed')
  }

  return (await response.json()) as NominatimResult[]
}

const buildClosestAddress = (
  address: Record<string, string> | undefined,
  fallbackPostcode?: string,
  fallbackCountry?: string | null
) => {
  if (!address) {
    return undefined
  }

  const street =
    address.road ||
    address.pedestrian ||
    address.residential ||
    address.footway ||
    address.path
  const locality =
    address.suburb ||
    address.neighbourhood ||
    address.city_district ||
    address.hamlet ||
    address.quarter
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county
  const state = address.state || address.region
  const country = address.country || fallbackCountry || undefined
  const postcode = address.postcode || fallbackPostcode || undefined

  const parts = [street, locality, city, state].filter(Boolean)
  if (postcode) {
    parts.push(postcode)
  }
  if (country) {
    parts.push(country)
  }

  return parts.length > 0 ? parts.join(', ') : undefined
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const postcode = searchParams.get('postcode')
  const country = searchParams.get('country')
  const trimmedCountry = country?.trim() || null
  const isPortugal = isPortugueseCountry(trimmedCountry || undefined)
  const normalizedPostcode =
    postcode && isPortugal ? normalizePortuguesePostcode(postcode) || postcode.trim() : postcode?.trim() || null

  if (!query && !postcode) {
    return NextResponse.json({ error: 'Query or postcode required' }, { status: 400 })
  }

  try {
    // SINGLE API: Use Nominatim only - it's free, reliable, and supports Portuguese postcodes correctly
    let nominatimQuery = ''
    
    if (isPortugal && normalizedPostcode) {
      // For Portuguese postcodes, try multiple query formats for better accuracy
      // Format 1: "8600-616, Portugal" (exact postcode)
      // Format 2: "postalcode:8600-616" (more specific Nominatim parameter)
      // We'll try both if the first doesn't work
      nominatimQuery = `${normalizedPostcode}, Portugal`
      console.log(`🔍 Geocoding Portuguese postcode with Nominatim: ${normalizedPostcode}`)
    } else if (postcode && country) {
      nominatimQuery = `${postcode}, ${country}`
    } else if (postcode) {
      nominatimQuery = postcode
    } else if (query) {
      nominatimQuery = query
    } else {
      return NextResponse.json({ error: 'Query or postcode required' }, { status: 400 })
    }

    // Fetch from Nominatim with strict country restriction for Portugal
    let data = await fetchFromNominatim({
      q: nominatimQuery,
      countrycodes: isPortugal ? 'pt' : undefined,
    })

    // CRITICAL: For Portuguese postcodes, filter to find EXACT postcode match
    if (isPortugal && normalizedPostcode && data && data.length > 0) {
      const exactMatch = data.find(result => {
        // Check both structured address field and display_name for postcode
        const returnedPostcode = result.address?.postcode
        const displayNamePostcode = result.display_name.match(/\b\d{4}-\d{3}\b/)?.[0]
        
        // Try to normalize both
        if (returnedPostcode) {
          const normalizedReturned = normalizePortuguesePostcode(returnedPostcode)
          if (normalizedReturned === normalizedPostcode) {
            return true
          }
        }
        
        // Also check display_name for postcode pattern
        if (displayNamePostcode) {
          const normalizedDisplay = normalizePortuguesePostcode(displayNamePostcode)
          if (normalizedDisplay === normalizedPostcode) {
            return true
          }
        }
        
        return false
      })
      
      if (exactMatch) {
        console.log(`✅ Found exact postcode match: ${normalizedPostcode}`)
        data = [exactMatch]
      } else {
        console.error(`❌ No exact postcode match found for ${normalizedPostcode}`)
        console.error(`   Available postcodes in address field:`, data.map(r => r.address?.postcode).filter(Boolean))
        console.error(`   Available postcodes in display_name:`, data.map(r => r.display_name.match(/\b\d{4}-\d{3}\b/)?.[0]).filter(Boolean))
        data = []
      }
    }

    // If no exact match found, try with postalcode parameter (more specific)
    if ((!data || data.length === 0) && isPortugal && normalizedPostcode) {
      console.log(`🔍 Trying Nominatim with postalcode parameter: ${normalizedPostcode}`)
      data = await fetchFromNominatim({
        postalcode: normalizedPostcode,
        countrycodes: 'pt',
      })
      
      // Filter for exact match again
      if (data && data.length > 0) {
        const exactMatch = data.find(result => {
          // Check both structured address field and display_name for postcode
          const returnedPostcode = result.address?.postcode
          const displayNamePostcode = result.display_name.match(/\b\d{4}-\d{3}\b/)?.[0]
          
          if (returnedPostcode) {
            const normalizedReturned = normalizePortuguesePostcode(returnedPostcode)
            if (normalizedReturned === normalizedPostcode) {
              return true
            }
          }
          
          if (displayNamePostcode) {
            const normalizedDisplay = normalizePortuguesePostcode(displayNamePostcode)
            if (normalizedDisplay === normalizedPostcode) {
              return true
            }
          }
          
          return false
        })
        
        if (exactMatch) {
          console.log(`✅ Found exact postcode match with postalcode parameter: ${normalizedPostcode}`)
          data = [exactMatch]
        } else {
          console.error(`❌ No exact postcode match with postalcode parameter for ${normalizedPostcode}`)
          console.error(`   Available postcodes in address:`, data.map(r => r.address?.postcode).filter(Boolean))
          console.error(`   Available postcodes in display_name:`, data.map(r => r.display_name.match(/\b\d{4}-\d{3}\b/)?.[0]).filter(Boolean))
          data = []
        }
      }
    }

    // Strategy 3: If still no exact match, try with city context for known postcode areas
    if ((!data || data.length === 0) && isPortugal && normalizedPostcode) {
      const areaCode = normalizedPostcode.split('-')[0]
      const areaNum = parseInt(areaCode, 10) || 0
      
      // Map known area codes to their cities for better geocoding
      const cityMap: Record<number, string> = {
        8600: 'Lagos',
        8500: 'Portimão',
        8000: 'Faro',
        1000: 'Lisboa',
        2000: 'Porto',
        3000: 'Coimbra',
        4000: 'Porto',
        5000: 'Braga',
        7000: 'Évora',
      }
      
      const city = cityMap[areaNum]
      if (city) {
        console.log(`🔍 Trying geocoding with city context: ${normalizedPostcode}, ${city}, Portugal`)
        const cityQuery = `${normalizedPostcode}, ${city}, Portugal`
        data = await fetchFromNominatim({
          q: cityQuery,
          countrycodes: 'pt',
        })
        
        // Filter for exact match again
        if (data && data.length > 0) {
          const exactMatch = data.find(result => {
            const returnedPostcode = result.address?.postcode
            const displayNamePostcode = result.display_name.match(/\b\d{4}-\d{3}\b/)?.[0]
            
            if (returnedPostcode) {
              const normalizedReturned = normalizePortuguesePostcode(returnedPostcode)
              if (normalizedReturned === normalizedPostcode) {
                return true
              }
            }
            
            if (displayNamePostcode) {
              const normalizedDisplay = normalizePortuguesePostcode(displayNamePostcode)
              if (normalizedDisplay === normalizedPostcode) {
                return true
              }
            }
            
            return false
          })
          
          if (exactMatch) {
            console.log(`✅ Found exact postcode match with city context: ${normalizedPostcode}`)
            data = [exactMatch]
          } else {
            // Even if not exact, if city matches, use the first result (better than nothing)
            const cityMatch = data.find(result => {
              const cityName = result.address?.city || result.address?.town || result.address?.municipality
              return cityName && cityName.toLowerCase().includes(city.toLowerCase())
            })
            
            if (cityMatch) {
              console.log(`⚠️ Using city match for ${normalizedPostcode} in ${city} (not exact postcode)`)
              data = [cityMatch]
            } else {
              data = []
            }
          }
        }
      }
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ result: null })
    }

    const result = data[0]
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json({ result: null })
    }

    // FINAL VALIDATION: Ensure returned postcode matches requested one
    if (isPortugal && normalizedPostcode) {
      const returnedPostcode = result.address?.postcode
      const displayNamePostcode = result.display_name.match(/\b\d{4}-\d{3}\b/)?.[0]
      
      let normalizedReturned: string | null = null
      if (returnedPostcode) {
        normalizedReturned = normalizePortuguesePostcode(returnedPostcode)
      } else if (displayNamePostcode) {
        normalizedReturned = normalizePortuguesePostcode(displayNamePostcode)
      }
      
      if (normalizedReturned && normalizedReturned !== normalizedPostcode) {
        console.error(`❌ CRITICAL: Final validation failed - requested "${normalizedPostcode}", got "${normalizedReturned}"`)
        console.error(`   Result display_name: ${result.display_name}`)
        console.error(`   Result address:`, result.address)
        return NextResponse.json({ result: null })
      }
    }

    // Build address
    let closestAddress = buildClosestAddress(result.address, normalizedPostcode || postcode || undefined, trimmedCountry)
    
    // Use the requested postcode in the address (not the returned one, to ensure accuracy)
    const postcodeForAddress = normalizedPostcode || postcode || result.address?.postcode || undefined
    
    if (closestAddress && postcodeForAddress) {
      // Replace postcode in address with the requested one
      closestAddress = closestAddress.replace(/\b\d{4}(-\d{3})?\b/, postcodeForAddress)
    }

    return NextResponse.json({
      result: {
        latitude: lat,
        longitude: lon,
        display_name: result.display_name,
        postcode: postcodeForAddress,
        closest_address: closestAddress || result.display_name,
      }
    })
  } catch (error) {
    console.error('Geocoding error:', error)
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 })
  }
}
