import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (adminProfile?.role !== 'admin' && adminProfile?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const userId: string | undefined = body?.userId
    const checkOnly: boolean = body?.check === true
    const force: boolean = body?.force === true

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    if (userId === user.id) {
      return NextResponse.json({ error: 'You cannot archive your own account' }, { status: 400 })
    }

    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('role, archived_at, full_name, email')
      .eq('id', userId)
      .single()

    if (targetProfile?.role === 'admin' || targetProfile?.role === 'superadmin') {
      return NextResponse.json({ error: 'Cannot archive admin accounts' }, { status: 403 })
    }

    if (targetProfile?.archived_at) {
      return NextResponse.json({ error: 'User is already archived' }, { status: 400 })
    }

    // Check for active tasks where this user is the creator or assigned helper
    const { data: activeTasks } = await supabase
      .from('tasks')
      .select('id, title, status, payment_status, payout_status, created_by, assigned_to')
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
      .in('status', ['pending_payment', 'in_progress'])

    const blockers: string[] = []
    const inProgressTasks = (activeTasks || []).filter(t => t.status === 'in_progress')
    const pendingPaymentTasks = (activeTasks || []).filter(t => t.status === 'pending_payment')
    const unpaidTasks = inProgressTasks.filter(t =>
      t.payout_status && !['completed', 'simulated'].includes(t.payout_status)
    )
    const vaultLocked = inProgressTasks.filter(t =>
      t.payment_status === 'paid' && (!t.payout_status || !['completed', 'simulated'].includes(t.payout_status))
    )

    if (vaultLocked.length > 0) {
      blockers.push(`${vaultLocked.length} task(s) with money locked in the Vault (payment received but payout not yet released). Complete or refund these first.`)
    }
    if (inProgressTasks.length > 0) {
      blockers.push(`${inProgressTasks.length} task(s) currently In Progress.`)
    }
    if (pendingPaymentTasks.length > 0) {
      blockers.push(`${pendingPaymentTasks.length} task(s) in Pending Payment status.`)
    }

    // Count preserved items for the confirmation dialog
    const { count: messageCount } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    const { count: bidCount } = await supabase
      .from('bids')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
    const { count: taskCount } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)

    if (checkOnly) {
      return NextResponse.json({
        user_name: targetProfile?.full_name || targetProfile?.email || userId,
        blockers,
        has_blockers: blockers.length > 0,
        counts: {
          messages: messageCount ?? 0,
          bids: bidCount ?? 0,
          tasks: taskCount ?? 0,
        },
      })
    }

    // Block archive if there are vault funds unless admin forces it
    if (blockers.length > 0 && !force) {
      return NextResponse.json({
        error: 'Cannot archive: user has active tasks or funds in the Vault.',
        blockers,
      }, { status: 409 })
    }

    const { data, error } = await supabase.rpc('safe_archive_user', {
      user_id_to_archive: userId,
    })

    if (error) {
      console.error('Error archiving user:', error)
      return NextResponse.json({ error: error.message || 'Failed to archive user' }, { status: 500 })
    }

    if (!data || !data.success) {
      return NextResponse.json({ error: data?.error || 'Failed to archive user' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: data.message,
      preserved_items: data.preserved_items,
    })
  } catch (err: any) {
    console.error('Error in archive-user route:', err)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
