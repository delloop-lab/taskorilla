import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkForContactInfo } from '@/lib/content-filter'
import { getOrCreateTaskConversation } from '@/lib/task-conversations'
import {
  buildBidUpdateChatMessage,
  buildBidWithdrawnChatMessage,
  type BidChatLocale,
} from '@/lib/bid-chat-message'
import { sendBidUpdatedNotification, sendBidWithdrawnByHelperNotification } from '@/lib/email'
import { formatEuro } from '@/lib/currency'
import { logEmail } from '@/lib/email-logger'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await context.params
    if (!taskId) {
      return NextResponse.json({ error: 'Missing task id' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient(request)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { amount?: unknown; message?: unknown; locale?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const chatLocale: BidChatLocale = body.locale === 'pt' ? 'pt' : 'en'
    const messageRaw = typeof body.message === 'string' ? body.message : ''
    const amountNum =
      typeof body.amount === 'number'
        ? body.amount
        : typeof body.amount === 'string'
          ? parseFloat(body.amount)
          : NaN

    if (!messageRaw || messageRaw.trim().length < 50) {
      return NextResponse.json(
        { error: 'Message must be at least 50 characters.' },
        { status: 400 }
      )
    }

    const contact = checkForContactInfo(messageRaw)
    if (!contact.isClean) {
      return NextResponse.json({ error: contact.message }, { status: 400 })
    }

    if (!Number.isFinite(amountNum) || amountNum < 0) {
      return NextResponse.json({ error: 'Invalid amount.' }, { status: 400 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_helper, is_paused')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.is_helper) {
      return NextResponse.json({ error: 'Helper role required.' }, { status: 403 })
    }

    if ((profile as { is_paused?: boolean }).is_paused) {
      return NextResponse.json({ error: 'Account is paused.' }, { status: 403 })
    }

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, status, created_by, title')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 })
    }

    if (task.status !== 'open') {
      return NextResponse.json(
        { error: 'Bid can only be updated while the task is open.' },
        { status: 400 }
      )
    }

    if (task.created_by === user.id) {
      return NextResponse.json({ error: 'Task owners cannot update bids this way.' }, { status: 403 })
    }

    const { data: bid, error: bidError } = await supabase
      .from('bids')
      .select('id, status, user_id')
      .eq('task_id', taskId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (bidError || !bid) {
      return NextResponse.json({ error: 'No bid found for this task.' }, { status: 404 })
    }

    if (bid.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending bids can be adjusted.' },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase
      .from('bids')
      .update({
        amount: amountNum,
        message: messageRaw.trim(),
      })
      .eq('id', bid.id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('[my-bid PATCH] bid update failed:', updateError)
      return NextResponse.json({ error: updateError.message || 'Update failed' }, { status: 400 })
    }

    const { id: conversationId } = await getOrCreateTaskConversation(supabase, {
      taskId,
      userId: user.id,
      otherUserId: task.created_by,
    })

    const chatContent = buildBidUpdateChatMessage(amountNum, chatLocale)
    const { error: msgError } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      receiver_id: task.created_by,
      content: chatContent,
    })

    if (msgError) {
      console.error('[my-bid PATCH] message insert failed:', msgError)
      return NextResponse.json(
        { error: 'Bid saved but chat notice failed. You can try again.' },
        { status: 500 }
      )
    }

    // Un-hide conversation for receiver so the system message is visible
    await supabaseAdmin
      .from('user_hidden_conversations')
      .delete()
      .eq('user_id', task.created_by)
      .eq('conversation_id', conversationId)

    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    const [{ data: ownerProfile }, { data: bidderProfile }] = await Promise.all([
      supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', task.created_by)
        .single(),
      supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
    ])

    const taskOwnerEmail = ownerProfile?.email
    if (taskOwnerEmail) {
      try {
        const bidUpdatedResult = await sendBidUpdatedNotification(
          taskOwnerEmail,
          ownerProfile?.full_name || taskOwnerEmail,
          task.title || 'Task',
          bidderProfile?.full_name || bidderProfile?.email || user.email || 'Helper',
          amountNum,
          taskId
        )
        await logEmail(
          {
            recipient_email: taskOwnerEmail,
            recipient_name: ownerProfile?.full_name || taskOwnerEmail,
            subject: `Updated bid on "${task.title || 'Task'}"`,
            email_type: 'bid_updated',
            status: 'sent',
            related_task_id: taskId,
            metadata: {
              taskTitle: task.title,
              bidderName: bidderProfile?.full_name || bidderProfile?.email,
              bidAmount: amountNum,
              html_content: bidUpdatedResult.htmlContent,
            },
          },
          supabase
        )
      } catch (emailErr) {
        console.error('[my-bid PATCH] bid_updated email failed:', emailErr)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    console.error('[my-bid PATCH]', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await context.params
    if (!taskId) {
      return NextResponse.json({ error: 'Missing task id' }, { status: 400 })
    }

    const chatLocale: BidChatLocale = request.nextUrl.searchParams.get('locale') === 'pt' ? 'pt' : 'en'
    const supabase = createServerSupabaseClient(request)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[my-bid DELETE] auth failed:', authError?.message ?? 'no user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_helper, is_paused')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.is_helper) {
      return NextResponse.json({ error: 'Helper role required.' }, { status: 403 })
    }

    if ((profile as { is_paused?: boolean }).is_paused) {
      return NextResponse.json({ error: 'Account is paused.' }, { status: 403 })
    }

    const { data: task, error: taskError } = await supabaseAdmin
      .from('tasks')
      .select('id, status, created_by, title, assigned_to, helper_confirmed_final_price_at, payment_status')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 })
    }

    const { data: bid, error: bidError } = await supabaseAdmin
      .from('bids')
      .select('id, status, user_id, amount')
      .eq('task_id', taskId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (bidError || !bid) {
      return NextResponse.json({ error: 'No bid found for this task.' }, { status: 404 })
    }

    // Two allowed paths:
    // 1) Open task, pending bid → straightforward withdraw
    // 2) Pending-payment task, accepted bid, helper hasn't confirmed yet → "final say" withdraw
    const isOpenWithdraw = task.status === 'open' && bid.status === 'pending'
    const isPendingPaymentWithdraw =
      task.status === 'pending_payment' &&
      bid.status === 'accepted' &&
      task.assigned_to === user.id &&
      !task.helper_confirmed_final_price_at &&
      task.payment_status !== 'paid'

    if (!isOpenWithdraw && !isPendingPaymentWithdraw) {
      return NextResponse.json(
        {
          error:
            task.status === 'pending_payment' && task.helper_confirmed_final_price_at
              ? 'Cannot withdraw after confirming the final price.'
              : 'Bids can only be withdrawn while the task is open or before confirming the final price.',
        },
        { status: 400 }
      )
    }

    // Mark bid as withdrawn (service role bypasses RLS edge cases)
    const { error: updateError } = await supabaseAdmin
      .from('bids')
      .update({ status: 'withdrawn' })
      .eq('id', bid.id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('[my-bid DELETE] withdraw failed:', updateError)
      return NextResponse.json({ error: updateError.message || 'Withdraw failed' }, { status: 400 })
    }

    // If withdrawing during pending_payment: revert the task back to open
    if (isPendingPaymentWithdraw) {
      const { error: revertError } = await supabaseAdmin
        .from('tasks')
        .update({
          status: 'open',
          assigned_to: null,
          helper_confirmed_final_price_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)

      if (revertError) {
        console.error('[my-bid DELETE] task revert failed:', revertError)
      }

      // Restore other bids that were rejected as part of this acceptance
      const { error: restoreError } = await supabaseAdmin
        .from('bids')
        .update({ status: 'pending' })
        .eq('task_id', taskId)
        .eq('status', 'rejected')

      if (restoreError) {
        console.error('[my-bid DELETE] bid restore failed:', restoreError)
      }
    }

    const { id: conversationId } = await getOrCreateTaskConversation(supabaseAdmin, {
      taskId,
      userId: user.id,
      otherUserId: task.created_by,
    })

    const chatContent = buildBidWithdrawnChatMessage(bid.amount, chatLocale)
    const { error: msgError } = await supabaseAdmin.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      receiver_id: task.created_by,
      content: chatContent,
    })

    if (msgError) {
      console.error('[my-bid DELETE] chat message insert failed:', msgError)
    }

    // Un-hide conversation for receiver so the withdrawal notice is visible
    await supabaseAdmin
      .from('user_hidden_conversations')
      .delete()
      .eq('user_id', task.created_by)
      .eq('conversation_id', conversationId)

    await supabaseAdmin
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    const [{ data: ownerProfile }, { data: bidderProfile }] = await Promise.all([
      supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', task.created_by)
        .single(),
      supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
    ])

    const taskOwnerEmail = ownerProfile?.email
    if (taskOwnerEmail) {
      try {
        const result = await sendBidWithdrawnByHelperNotification(
          taskOwnerEmail,
          ownerProfile?.full_name || taskOwnerEmail,
          task.title || 'Task',
          bidderProfile?.full_name || bidderProfile?.email || user.email || 'Helper',
          bid.amount,
          taskId
        )
        await logEmail(
          {
            recipient_email: taskOwnerEmail,
            recipient_name: ownerProfile?.full_name || taskOwnerEmail,
            subject: `Bid withdrawn on "${task.title || 'Task'}"`,
            email_type: 'bid_withdrawn',
            status: 'sent',
            related_task_id: taskId,
            metadata: {
              taskTitle: task.title,
              bidderName: bidderProfile?.full_name || bidderProfile?.email,
              bidAmount: bid.amount,
              html_content: result.htmlContent,
            },
          },
          supabase
        )
      } catch (emailErr) {
        console.error('[my-bid DELETE] bid_withdrawn email failed:', emailErr)
      }
    }

    return NextResponse.json({ ok: true, reverted: isPendingPaymentWithdraw })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    console.error('[my-bid DELETE]', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
