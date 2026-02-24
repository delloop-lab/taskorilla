import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import crypto from 'crypto'
import { requireAirwallexEnabled } from '@/services/payments/airwallex-gate'

/**
 * Airwallex Webhook Handler
 * POST /api/airwallex/webhook
 * Provider gate is in services/payments/airwallex-gate.ts
 */
export async function POST(request: NextRequest) {
  const gate = requireAirwallexEnabled()
  if (gate) return gate

  try {
    const webhookSecret = process.env.AIRWALLEX_WEBHOOK_SECRET
    
    // Get raw body for signature verification
    const body = await request.text()
    const signature = request.headers.get('x-airwallex-signature') || ''

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex')
      
      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    }

    const event = JSON.parse(body)
    console.log('Received Airwallex webhook event:', event.type, event.id)

    const supabase = createServerSupabaseClient(request)

    // Handle different event types
    // Airwallex uses charge.* events for payments and payout.transfer.* for payouts
    const eventType = event.type || event.name
    
    if (eventType?.startsWith('charge.')) {
      await handlePaymentEvent(event, supabase)
    } else if (eventType?.startsWith('payout.transfer.')) {
      await handlePayoutEvent(event, supabase)
    } else {
      // Fallback for other event naming conventions
      switch (eventType) {
        case 'payment.succeeded':
        case 'payment.failed':
        case 'payment.cancelled':
        case 'payout.succeeded':
        case 'payout.failed':
        case 'payout.cancelled': {
          if (eventType.startsWith('payment.')) {
            await handlePaymentEvent(event, supabase)
          } else {
            await handlePayoutEvent(event, supabase)
          }
          break
        }
        default:
          console.log('Unhandled webhook event type:', eventType)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Error processing Airwallex webhook:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

/**
 * Handle payment events (charge.* events in Airwallex)
 */
async function handlePaymentEvent(event: any, supabase: any) {
  // Airwallex charge events have the charge object in event.data
  const charge = event.data?.object || event.data
  const chargeId = charge.id || charge.charge_id
  const eventType = event.type
  const metadata = charge.metadata || {}

  const taskId = metadata.task_id

  if (!taskId) {
    console.warn('Payment event missing task_id in metadata:', chargeId)
    return
  }

  // Map Airwallex charge event types to our payment status
  let paymentStatus: string
  if (eventType === 'charge.settled' || eventType === 'charge.new') {
    paymentStatus = 'paid'
  } else if (eventType === 'charge.failed' || eventType === 'charge.suspended') {
    paymentStatus = 'failed'
  } else if (eventType === 'charge.pending') {
    paymentStatus = 'pending'
  } else {
    // Fallback to mapping status field if available
    paymentStatus = mapPaymentStatus(charge.status || eventType)
  }

  console.log(`Updating task ${taskId} payment status to ${paymentStatus} (event: ${eventType})`)

  // Update task payment status
  const { error } = await supabase
    .from('tasks')
    .update({
      payment_status: paymentStatus,
      payment_intent_id: chargeId,
    })
    .eq('id', taskId)

  if (error) {
    console.error('Error updating task payment status:', error)
    throw error
  }

  // If payment succeeded/settled, notify the user
  if (eventType === 'charge.settled' || paymentStatus === 'paid') {
    console.log(`Payment succeeded for task ${taskId}`)
    // TODO: Send notification to task owner
  }
}

/**
 * Handle payout events (payout.transfer.* events in Airwallex)
 */
async function handlePayoutEvent(event: any, supabase: any) {
  // Airwallex payout.transfer events have the transfer data in event.data
  const transfer = event.data || {}
  const eventType = event.type || event.name
  const transferId = transfer.id || transfer.request_id
  
  // Extract metadata - could be in transfer.metadata or we need to look it up by transfer ID
  const metadata = transfer.metadata || {}
  let taskId = metadata.task_id
  let helperId = metadata.helper_id

  // If metadata not in transfer, try to find payout record by transfer ID
  if (!taskId && transferId) {
    const { data: payoutRecord } = await supabase
      .from('payouts')
      .select('task_id, helper_id')
      .eq('airwallex_payout_id', transferId)
      .single()
    
    if (payoutRecord) {
      taskId = payoutRecord.task_id
      helperId = payoutRecord.helper_id
    }
  }

  if (!taskId || !transferId) {
    console.warn('Payout event missing required data:', { taskId, transferId, eventType })
    return
  }

  // Map Airwallex payout.transfer event types to our payout status
  let payoutStatus: string
  if (eventType === 'payout.transfer.paid' || eventType === 'payout.transfer.sent') {
    payoutStatus = 'completed'
  } else if (eventType === 'payout.transfer.failed' || eventType === 'payout.transfer.cancelled') {
    payoutStatus = 'failed'
  } else if (eventType === 'payout.transfer.processing' || eventType === 'payout.transfer.funding.processing') {
    payoutStatus = 'processing'
  } else {
    // Fallback to mapping status field if available
    payoutStatus = mapPayoutStatus(transfer.status || eventType)
  }

  console.log(`Updating payout ${transferId} status to ${payoutStatus} for task ${taskId} (event: ${eventType})`)

  // Update payout record
  const { error: payoutError } = await supabase
    .from('payouts')
    .update({
      status: payoutStatus,
      completed_at: (payoutStatus === 'completed') 
        ? new Date().toISOString() 
        : null,
      error_message: (payoutStatus === 'failed') 
        ? transfer.failure_reason || transfer.reason || 'Payout failed' 
        : null,
    })
    .eq('airwallex_payout_id', transferId)

  if (payoutError) {
    console.error('Error updating payout status:', payoutError)
  }

  // Update task payout status
  const { error: taskError } = await supabase
    .from('tasks')
    .update({
      payout_status: payoutStatus,
    })
    .eq('id', taskId)

  if (taskError) {
    console.error('Error updating task payout status:', taskError)
  }

  // If payout succeeded, notify helper
  if (payoutStatus === 'completed') {
    console.log(`Payout completed for task ${taskId}, helper ${helperId}`)
    // TODO: Send notification to helper
  }
}

/**
 * Map Airwallex payment status to our status format
 */
function mapPaymentStatus(airwallexStatus: string): string {
  const statusMap: Record<string, string> = {
    // Charge event types
    'charge.settled': 'paid',
    'charge.new': 'paid',
    'charge.failed': 'failed',
    'charge.suspended': 'failed',
    'charge.pending': 'pending',
    // Status values
    'succeeded': 'paid',
    'SUCCEEDED': 'paid',
    'settled': 'paid',
    'SETTLED': 'paid',
    'failed': 'failed',
    'FAILED': 'failed',
    'cancelled': 'failed',
    'CANCELLED': 'failed',
    'suspended': 'failed',
    'SUSPENDED': 'failed',
    'pending': 'pending',
    'PENDING': 'pending',
    'processing': 'pending',
    'PROCESSING': 'pending',
  }
  
  return statusMap[airwallexStatus] || 'pending'
}

/**
 * Map Airwallex payout status to our status format
 */
function mapPayoutStatus(airwallexStatus: string): string {
  const statusMap: Record<string, string> = {
    // payout.transfer event types
    'payout.transfer.paid': 'completed',
    'payout.transfer.sent': 'completed',
    'payout.transfer.failed': 'failed',
    'payout.transfer.cancelled': 'failed',
    'payout.transfer.processing': 'processing',
    'payout.transfer.funding.processing': 'processing',
    'payout.transfer.funding.funded': 'processing',
    // Status values
    'succeeded': 'completed',
    'SUCCEEDED': 'completed',
    'paid': 'completed',
    'PAID': 'completed',
    'sent': 'completed',
    'SENT': 'completed',
    'failed': 'failed',
    'FAILED': 'failed',
    'cancelled': 'failed',
    'CANCELLED': 'failed',
    'pending': 'pending',
    'PENDING': 'pending',
    'processing': 'processing',
    'PROCESSING': 'processing',
  }
  
  return statusMap[airwallexStatus] || 'pending'
}

