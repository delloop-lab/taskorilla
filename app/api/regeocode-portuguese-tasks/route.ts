import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { geocodePostcode } from '@/lib/geocoding'
import { isPortugueseCountry } from '@/lib/postcode'

/**
 * API endpoint to re-geocode all Portuguese tasks using the new GEO API PT
 * This updates existing tasks to use the more accurate Portuguese postcode API
 */
export async function POST(request: NextRequest) {
  try {
    // Create authenticated Supabase client from request
    const supabase = createServerSupabaseClient(request)
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all Portuguese tasks that have postcodes
    const { data: tasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, postcode, country, latitude, longitude')
      .not('postcode', 'is', null)
      .not('country', 'is', null)

    if (fetchError) {
      throw fetchError
    }

    // Filter to only Portuguese tasks
    const portugueseTasks = tasks?.filter(task => 
      task.country && isPortugueseCountry(task.country)
    ) || []

    if (portugueseTasks.length === 0) {
      return NextResponse.json({
        message: 'No Portuguese tasks found',
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
    for (const task of portugueseTasks) {
      try {
        if (!task.postcode || !task.country) {
          failed++
          continue
        }

        // Geocode the postcode using the new GEO API PT
        const result = await geocodePostcode(task.postcode, task.country)

        if (result && result.latitude && result.longitude) {
          // Update the task with new coordinates from GEO API PT
          const { error: updateError } = await supabase
            .from('tasks')
            .update({
              latitude: result.latitude,
              longitude: result.longitude,
              location: result.closest_address || task.postcode
            })
            .eq('id', task.id)

          if (updateError) {
            throw updateError
          }

          updated++
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 150))
        } else {
          failed++
          errors.push(`Task ${task.id}: Could not geocode postcode ${task.postcode}`)
        }
      } catch (error: any) {
        failed++
        errors.push(`Task ${task.id}: ${error.message || 'Unknown error'}`)
        console.error(`Error geocoding task ${task.id}:`, error)
      }
    }

    return NextResponse.json({
      message: `Re-geocoding complete`,
      total: portugueseTasks.length,
      updated,
      failed,
      errors: errors.slice(0, 10) // Return first 10 errors
    })
  } catch (error: any) {
    console.error('Re-geocoding Portuguese tasks error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to re-geocode Portuguese tasks' },
      { status: 500 }
    )
  }
}


