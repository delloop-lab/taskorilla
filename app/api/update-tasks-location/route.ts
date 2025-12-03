import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isPortugueseCountry } from '@/lib/postcode'

/**
 * API endpoint to update all existing tasks with properly formatted location
 * including municipality and district (e.g., "Lagos, Faro, 8600-545, Portugal")
 */
export async function POST(request: NextRequest) {
  try {
    // Try to get access token from Authorization header first
    const authHeader = request.headers.get('Authorization')
    let accessToken: string | undefined
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7)
    }
    
    // If no Authorization header, try to get from cookies (for browser requests)
    if (!accessToken) {
      const cookies = request.cookies
      const sbAccessToken = cookies.get('sb-access-token')?.value
      const sbRefreshToken = cookies.get('sb-refresh-token')?.value
      
      // If we have cookies but no header, we'll need to create a client that uses cookies
      // For now, require Authorization header
      if (!sbAccessToken && !sbRefreshToken) {
        return NextResponse.json({ 
          error: 'Unauthorized - Please ensure you are logged in and try again' 
        }, { status: 401 })
      }
    }
    
    // Create authenticated Supabase client from request
    const supabase = createServerSupabaseClient(request)
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Unauthorized - Please ensure you are logged in and try again',
        details: authError?.message 
      }, { status: 401 })
    }

    // Get all tasks that have postcodes and coordinates
    const { data: tasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, postcode, country, latitude, longitude, location')
      .not('postcode', 'is', null)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)

    if (fetchError) {
      throw fetchError
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        message: 'No tasks with postcodes and coordinates found',
        total: 0,
        updated: 0,
        failed: 0,
        errors: []
      })
    }

    let updated = 0
    let failed = 0
    const errors: string[] = []

    // Process tasks in batches to avoid overwhelming the API
    for (const task of tasks) {
      try {
        if (!task.postcode || !task.latitude || !task.longitude) {
          failed++
          continue
        }

        // Reverse geocode coordinates to get municipality and district
        const nominatimUrl = new URL('https://nominatim.openstreetmap.org/reverse')
        nominatimUrl.searchParams.set('format', 'json')
        nominatimUrl.searchParams.set('lat', task.latitude.toString())
        nominatimUrl.searchParams.set('lon', task.longitude.toString())
        nominatimUrl.searchParams.set('addressdetails', '1')
        nominatimUrl.searchParams.set('zoom', '10') // Get municipality level detail

        const response = await fetch(nominatimUrl.toString(), {
          headers: {
            'User-Agent': 'Taskorilla/1.0 (contact@taskorilla.com)'
          }
        })

        if (!response.ok) {
          throw new Error(`Nominatim returned ${response.status}`)
        }

        const data = await response.json()

        if (data && data.address) {
          const address = data.address
          
          // Extract municipality and district
          // For Portugal: municipality is usually city/town/municipality, district is state/region
          const municipality = address.city || address.town || address.village || address.municipality || ''
          const district = address.state || address.region || ''
          const country = address.country || task.country || 'Portugal'

          // Build location string: "Municipality, District, Postcode, Country"
          let locationParts: string[] = []
          
          if (municipality) {
            locationParts.push(municipality)
          }
          
          if (district && district !== municipality) {
            locationParts.push(district)
          }
          
          if (task.postcode) {
            locationParts.push(task.postcode)
          }
          
          if (country) {
            locationParts.push(country)
          }

          const formattedLocation = locationParts.join(', ')

          // Only update if we got a valid location
          if (formattedLocation && formattedLocation !== task.location) {
            const { error: updateError } = await supabase
              .from('tasks')
              .update({
                location: formattedLocation
              })
              .eq('id', task.id)

            if (updateError) {
              throw updateError
            }

            updated++
            console.log(`✅ Updated task ${task.id}: "${formattedLocation}"`)
          } else {
            console.log(`⏭️ Skipped task ${task.id}: location unchanged or invalid`)
          }
          
          // Small delay to avoid rate limiting (Nominatim requires max 1 request per second)
          await new Promise(resolve => setTimeout(resolve, 1100))
        } else {
          failed++
          errors.push(`Task ${task.id}: No address data returned from reverse geocoding`)
        }
      } catch (error: any) {
        failed++
        errors.push(`Task ${task.id}: ${error.message || 'Unknown error'}`)
        console.error(`Error updating task ${task.id}:`, error)
        
        // Still add delay even on error to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1100))
      }
    }

    return NextResponse.json({
      message: `Location update complete`,
      total: tasks.length,
      updated,
      failed,
      errors: errors.slice(0, 20) // Return first 20 errors
    })
  } catch (error: any) {
    console.error('Update tasks location error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update tasks location' },
      { status: 500 }
    )
  }
}

