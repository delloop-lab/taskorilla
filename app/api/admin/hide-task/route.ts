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

    // Get task ID and action from request body
    const body = await request.json()
    const { taskId, hidden, reason } = body

    if (!taskId || typeof hidden !== 'boolean') {
      return NextResponse.json(
        { error: 'Task ID and hidden status are required' },
        { status: 400 }
      )
    }

    // Update the task
    const updateData: any = {
      hidden_by_admin: hidden,
      hidden_at: hidden ? new Date().toISOString() : null,
      hidden_by: hidden ? user.id : null,
      hidden_reason: hidden ? (reason || null) : null
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      console.error('Error updating task:', error)
      return NextResponse.json(
        { error: 'Failed to update task', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      task: data,
      message: hidden ? 'Task hidden successfully' : 'Task unhidden successfully'
    })

  } catch (error) {
    console.error('Error in hide-task API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

