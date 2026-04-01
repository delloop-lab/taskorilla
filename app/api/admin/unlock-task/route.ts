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
    const { taskId } = body as { taskId?: string }

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
    }

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.status !== 'locked') {
      return NextResponse.json(
        { error: 'Only locked tasks can be unlocked' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: 'open',
        archived: false,
      })
      .eq('id', taskId)
      .eq('status', 'locked')
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to unlock task', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      task: data,
      message: 'Task unlocked successfully',
    })
  } catch (error) {
    console.error('Error in unlock-task API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
