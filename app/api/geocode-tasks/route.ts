import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { geocodePostcode } from '@/lib/geocoding'

/**
 * API endpoint to retroactively geocode tasks that have postcodes but no coordinates
 * This can be called to update old tasks after fixing the geocoding implementation
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

    // Optional: Check if user is admin (uncomment if you want admin-only access)
    // const { data: profile } = await supabase
    //   .from('profiles')
    //   .select('role')
    //   .eq('id', user.id)
    //   .single()
    // if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
    //   return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    // }

    // Get all tasks that have postcodes but no coordinates
    const { data: tasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, postcode, country, latitude, longitude')
      .not('postcode', 'is', null)
      .or('latitude.is.null,longitude.is.null')

    if (fetchError) {
      throw fetchError
    }

    // Get diagnostic info about tasks
    const { count: totalTasksWithPostcode } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .not('postcode', 'is', null)
    
    const { count: totalTasksWithCoords } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        message: 'No tasks need geocoding',
        total: 0,
        updated: 0,
        failed: 0,
        errors: [],
        diagnostics: {
          tasksWithPostcode: totalTasksWithPostcode || 0,
          tasksWithCoordinates: totalTasksWithCoords || 0,
          message: totalTasksWithPostcode === 0 
            ? 'No tasks have postcodes' 
            : 'All tasks with postcodes already have coordinates'
        }
      })
    }

    let updated = 0
    let failed = 0
    const errors: string[] = []

    // Process tasks in batches to avoid overwhelming the API
    for (const task of tasks) {
      try {
        if (!task.postcode || !task.country) {
          failed++
          continue
        }

        // Geocode the postcode
        const result = await geocodePostcode(task.postcode, task.country)

        if (result && result.latitude && result.longitude) {
          // Update the task with coordinates
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
          await new Promise(resolve => setTimeout(resolve, 100))
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
      message: `Geocoding complete`,
      total: tasks.length,
      updated,
      failed,
      errors: errors.slice(0, 10) // Return first 10 errors
    })
  } catch (error: any) {
    console.error('Geocoding tasks error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to geocode tasks' },
      { status: 500 }
    )
  }
}

