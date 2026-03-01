import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { executeCreateCheckout } from '@/services/payments/create-checkout'

/**
 * Unified Checkout Creation API
 * POST /api/payments/create-checkout
 * Provider selection is handled entirely in services/payments/create-checkout.ts
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[Create Checkout] Auth failed:', authError?.message || 'No user session', '| Cookies present:', !!request.headers.get('cookie'))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { taskId, returnUrl, cancelUrl } = body

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
    }

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, title, budget, status, created_by, assigned_to, payment_status')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Only the task creator can pay for the task' },
        { status: 403 }
      )
    }

    if (!task.assigned_to) {
      return NextResponse.json({ error: 'Task has no assigned helper' }, { status: 400 })
    }

    if (task.payment_status === 'paid') {
      return NextResponse.json({ error: 'Task is already paid' }, { status: 400 })
    }

    if (task.budget == null || task.budget <= 0) {
      return NextResponse.json(
        { error: 'This task has no agreed amount yet. The helper needs to submit a quote and you need to accept it before payment.' },
        { status: 400 }
      )
    }

    const { data: helperProfile, error: helperError } = await supabase
      .from('profiles')
      .select('id, email, full_name, stripe_account_id, iban, paypal_email')
      .eq('id', task.assigned_to)
      .single()

    if (helperError || !helperProfile) {
      return NextResponse.json({ error: 'Helper profile not found' }, { status: 404 })
    }

    const { data: taskerProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    let serviceFee = 2
    const { data: feeSettings } = await supabase
      .from('platform_settings')
      .select('key, value')
      .eq('key', 'tasker_service_fee')
      .single()
    if (feeSettings?.value) {
      serviceFee = parseFloat(feeSettings.value) || 2
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const result = await executeCreateCheckout(supabase, {
      taskId,
      task: { id: task.id, title: task.title, budget: task.budget },
      helperProfile,
      taskerId: user.id,
      taskerEmail: taskerProfile?.email ?? user.email ?? null,
      returnUrl,
      cancelUrl,
      serviceFee,
    }, {
      cookieHeader: request.headers.get('cookie') || '',
      baseUrl,
    })

    if ('status' in result && result.status >= 400) {
      return NextResponse.json(result.body, { status: result.status })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Create Checkout] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to create checkout', details: message },
      { status: 500 }
    )
  }
}
