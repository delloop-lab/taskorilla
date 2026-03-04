import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * Decline a task (assigned helper removes themselves)
 * POST /api/tasks/[id]/decline
 *
 * Only the assigned helper can call this. Clears assigned_to and archives the task.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    if (!taskId) {
      return NextResponse.json({ success: false, error: 'Missing task ID' }, { status: 400 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data: task } = await supabaseAdmin
      .from('tasks')
      .select('id, assigned_to, created_by, status')
      .eq('id', taskId)
      .single()

    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 })
    }

    if (task.assigned_to !== user.id) {
      return NextResponse.json({ success: false, error: 'Only the assigned helper can decline' }, { status: 403 })
    }

    if (task.status !== 'open') {
      return NextResponse.json({ success: false, error: 'Task cannot be declined in current status' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('tasks')
      .update({ assigned_to: null, archived: true })
      .eq('id', taskId)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
