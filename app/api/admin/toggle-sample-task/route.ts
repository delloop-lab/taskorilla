import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const body = await request.json()
    const { taskId, isSample } = body as { taskId?: string; isSample?: boolean }

    if (!taskId || typeof isSample !== 'boolean') {
      return NextResponse.json(
        { error: 'Task ID and isSample flag are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({ is_sample_task: isSample })
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      console.error('Error updating is_sample_task:', error)
      return NextResponse.json(
        { error: 'Failed to update sample status', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      task: data,
      message: isSample ? 'Task marked as sample' : 'Task marked as real',
    })
  } catch (error) {
    console.error('Error in toggle-sample-task API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

