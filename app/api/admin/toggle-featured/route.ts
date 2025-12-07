import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    // Create authenticated Supabase client from request
    const supabase = createServerSupabaseClient(request)
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin or superadmin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Unable to verify user role' },
        { status: 403 }
      )
    }

    if (profile.role !== 'admin' && profile.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    // Get helper ID and featured status from request body
    const body = await request.json()
    const { helperId, isFeatured } = body

    if (!helperId || typeof isFeatured !== 'boolean') {
      return NextResponse.json(
        { error: 'Helper ID and featured status are required' },
        { status: 400 }
      )
    }

    // Verify the user is a helper
    const { data: helperProfile, error: helperError } = await supabase
      .from('profiles')
      .select('is_helper')
      .eq('id', helperId)
      .single()

    if (helperError || !helperProfile) {
      return NextResponse.json(
        { error: 'Helper not found' },
        { status: 404 }
      )
    }

    if (!helperProfile.is_helper) {
      return NextResponse.json(
        { error: 'User is not a helper' },
        { status: 400 }
      )
    }

    // Update the helper's featured status
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_featured: isFeatured })
      .eq('id', helperId)
      .select()
      .single()

    if (error) {
      console.error('Error updating featured status:', error)
      return NextResponse.json(
        { error: 'Failed to update featured status', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      helper: data,
      message: isFeatured ? 'Helper featured successfully' : 'Helper unfeatured successfully'
    })

  } catch (error) {
    console.error('Error in toggle-featured API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}





