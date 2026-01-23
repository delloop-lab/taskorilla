import { supabase } from './supabase'

/**
 * Track a page visit
 * @param pageName - The name/identifier of the page (e.g., 'home', 'tasks', 'profile')
 */
export async function trackPageVisit(pageName: string) {
  try {
    // Only track on client side
    if (typeof window === 'undefined') return

    // Check if user is admin - don't count admin traffic
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      // Skip tracking if user is admin or superadmin
      if (profile?.role === 'admin' || profile?.role === 'superadmin') {
        return
      }
    }

    // Track total visits (existing functionality)
    const { data: existing, error: trafficSelectError } = await supabase
      .from('traffic')
      .select('visits')
      .eq('page', pageName)
      .maybeSingle()

    if (trafficSelectError && trafficSelectError.code !== 'PGRST116') {
      console.error('Error checking traffic:', trafficSelectError)
    }

    if (existing) {
      // Update existing record by incrementing visits
      const { error: updateError } = await supabase
        .from('traffic')
        .update({ visits: existing.visits + 1 })
        .eq('page', pageName)
      
      if (updateError) {
        console.error('Error updating traffic:', updateError)
      }
    } else {
      // Insert new record, handle conflict if it was created between select and insert
      const { error: insertError } = await supabase
        .from('traffic')
        .insert({
          page: pageName,
          visits: 1,
        })
      
      // If insert fails due to conflict, try updating instead
      if (insertError && insertError.code === '23505') {
        const { data: conflictData } = await supabase
          .from('traffic')
          .select('visits')
          .eq('page', pageName)
          .single()
        
        if (conflictData) {
          await supabase
            .from('traffic')
            .update({ visits: conflictData.visits + 1 })
            .eq('page', pageName)
        }
      } else if (insertError) {
        console.error('Error inserting traffic:', insertError)
      }
    }

    // Track daily visits using atomic database function to eliminate race conditions
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    
    // Use the database function for atomic increment (handles insert/update atomically)
    const { error: rpcError } = await supabase.rpc('increment_traffic_daily', {
      p_page: pageName,
      p_visit_date: today
    })
    
    // If RPC function doesn't exist yet, fall back to manual handling
    if (rpcError) {
      // Check if it's because the function doesn't exist
      if (rpcError.message?.includes('function') || rpcError.code === '42883') {
        // Fallback to manual insert/update with conflict handling
        const { data: dailyExisting } = await supabase
          .from('traffic_daily')
          .select('visits')
          .eq('page', pageName)
          .eq('visit_date', today)
          .maybeSingle()

        if (dailyExisting) {
          await supabase
            .from('traffic_daily')
            .update({ visits: dailyExisting.visits + 1 })
            .eq('page', pageName)
            .eq('visit_date', today)
        } else {
          const { error: insertError } = await supabase
            .from('traffic_daily')
            .insert({
              page: pageName,
              visit_date: today,
              visits: 1,
            })
          
          // Silently handle conflicts (they'll be caught on next page load)
          if (insertError && insertError.code !== '23505') {
            console.error('Error inserting daily traffic:', insertError)
          }
        }
      } else {
        console.error('Error calling increment_traffic_daily:', rpcError)
      }
    }
  } catch (error) {
    console.error('Error tracking page visit:', error)
  }
}

/**
 * Get traffic statistics for all pages or a specific page
 * Aggregates duplicate entries by page name
 */
export async function getTrafficStats(pageName?: string) {
  try {
    let query = supabase.from('traffic').select('page, visits')

    if (pageName) {
      query = query.eq('page', pageName)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching traffic stats:', error)
      return null
    }

    if (!data) {
      return null
    }

    // Aggregate visits by page name (in case there are duplicates)
    const aggregated: Record<string, number> = {}
    
    data.forEach((record) => {
      const page = record.page
      if (aggregated[page]) {
        aggregated[page] += record.visits || 0
      } else {
        aggregated[page] = record.visits || 0
      }
    })

    // Convert to array and sort by visits descending
    const result = Object.entries(aggregated)
      .map(([page, visits]) => ({
        page,
        visits,
      }))
      .sort((a, b) => b.visits - a.visits)

    return result
  } catch (error) {
    console.error('Error fetching traffic stats:', error)
    return null
  }
}

/**
 * Get daily traffic statistics
 * @param days - Number of days to retrieve (default: 30)
 * @param pageName - Optional page name to filter by
 */
export async function getDailyTrafficStats(days: number = 30, pageName?: string) {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]

    let query = supabase
      .from('traffic_daily')
      .select('*')
      .gte('visit_date', startDateStr)
      .order('visit_date', { ascending: false })

    if (pageName) {
      query = query.eq('page', pageName)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching daily traffic stats:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error fetching daily traffic stats:', error)
    return null
  }
}

/**
 * Get daily traffic summary (total hits per day across all pages)
 * @param days - Number of days to retrieve (default: 30)
 */
export async function getDailyTrafficSummary(days: number = 30) {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('traffic_daily')
      .select('visit_date, visits')
      .gte('visit_date', startDateStr)
      .order('visit_date', { ascending: true })

    if (error) {
      console.error('Error fetching daily traffic summary:', error)
      return null
    }

    // Aggregate visits by date
    const summary: Record<string, number> = {}
    data?.forEach((record) => {
      const date = record.visit_date
      summary[date] = (summary[date] || 0) + record.visits
    })

    // Convert to array format
    return Object.entries(summary)
      .map(([date, visits]) => ({ date, visits }))
      .sort((a, b) => a.date.localeCompare(b.date))
  } catch (error) {
    console.error('Error fetching daily traffic summary:', error)
    return null
  }
}

