import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * Assigned helper confirms the final agreed price so the tasker can pay.
 * POST /api/tasks/[id]/confirm-final-price
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await context.params
    if (!taskId) {
      return NextResponse.json({ error: 'Missing task ID' }, { status: 400 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createServerSupabaseClient(request)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: task, error: taskError } = await supabaseAdmin
      .from('tasks')
      .select(
        'id, status, assigned_to, payment_status, helper_confirmed_final_price_at'
      )
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.assigned_to !== user.id) {
      return NextResponse.json(
        { error: 'Only the assigned helper can confirm the final price' },
        { status: 403 }
      )
    }

    if (task.status !== 'pending_payment') {
      return NextResponse.json(
        { error: 'Price can only be confirmed while the task is awaiting payment' },
        { status: 400 }
      )
    }

    if (task.payment_status === 'paid') {
      return NextResponse.json({ error: 'This task is already paid' }, { status: 400 })
    }

    if (task.helper_confirmed_final_price_at) {
      return NextResponse.json({ error: 'Final price was already confirmed' }, { status: 400 })
    }

    const { data: bid } = await supabaseAdmin
      .from('bids')
      .select('id, status')
      .eq('task_id', taskId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!bid || bid.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Your bid must be accepted before you can confirm the final price' },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from('tasks')
      .update({
        helper_confirmed_final_price_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)

    if (updateError) {
      console.error('[confirm-final-price]', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
