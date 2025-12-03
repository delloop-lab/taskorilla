import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// This endpoint allows admins to recalculate badges for all helpers
// Or for a specific helper if helperId is provided
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { helperId } = await request.json()

    if (helperId) {
      // Recalculate badges for a specific helper
      const { error } = await supabase.rpc('update_helper_badges', {
        helper_user_id: helperId
      })

      if (error) throw error

      return NextResponse.json({ 
        success: true, 
        message: `Badges recalculated for helper ${helperId}` 
      })
    } else {
      // Recalculate badges for all helpers
      const { data, error } = await supabase.rpc('update_all_helper_badges')

      if (error) throw error

      return NextResponse.json({ 
        success: true, 
        message: `Badges recalculated for ${data} helpers` 
      })
    }
  } catch (error: any) {
    console.error('Error recalculating badges:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

