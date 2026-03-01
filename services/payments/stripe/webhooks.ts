/**
 * Stripe Webhook Handlers
 * 
 * Implements webhook handling with the "thin events" approach:
 * - Verify webhook signatures
 * - Fetch full event data from Stripe API
 * - Handle account requirements and capability updates
 * 
 * For LOCAL STRIPE CLI TESTING ONLY.
 * Not registered as public routes yet.
 * 
 * To test locally:
 *   stripe listen --forward-to localhost:3000/api/payments/webhook/stripe
 */

import { stripeClient } from './stripeClient'
import type Stripe from 'stripe'

/**
 * Webhook event types we handle
 */
export const HANDLED_EVENTS = [
  // Account events (Connect)
  'account.updated',
  'account.application.authorized',
  'account.application.deauthorized',
  
  // Checkout events
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
  
  // Payment intent events
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
  
  // Transfer events (for destination charges)
  'transfer.created',
  'transfer.reversed',
  
  // Payout events (for connected accounts)
  'payout.paid',
  'payout.failed',
  
  // Capability events
  'capability.updated',
] as const

export type HandledEventType = typeof HANDLED_EVENTS[number]

/**
 * Result of processing a webhook event
 */
export interface WebhookProcessingResult {
  success: boolean
  eventId: string
  eventType: string
  message: string
  data?: Record<string, unknown>
}

/**
 * Account status change notification
 */
export interface AccountStatusChange {
  accountId: string
  previouslyEnabled: boolean
  nowEnabled: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  requirements: {
    currentlyDue: string[]
    eventuallyDue: string[]
    pastDue: string[]
    disabledReason: string | null
  }
}

/**
 * Verify Stripe webhook signature and construct the event
 * 
 * IMPORTANT: This must receive the RAW request body, not parsed JSON.
 * 
 * @param payload - Raw request body as string or Buffer
 * @param signature - Stripe-Signature header value
 * @param webhookSecret - Webhook endpoint secret (from Stripe CLI or Dashboard)
 * @returns The verified Stripe event
 * @throws Error if signature verification fails
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  try {
    const event = stripeClient.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    )
    return event
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Webhook signature verification failed: ${message}`)
  }
}

/**
 * Fetch the full event from Stripe API (thin events approach)
 * 
 * Even though we receive the event in the webhook, fetching it fresh
 * ensures we have the latest data and aren't affected by webhook
 * delivery timing issues.
 * 
 * @param eventId - The Stripe event ID
 * @returns The full event object from Stripe
 */
export async function fetchFullEvent(eventId: string): Promise<Stripe.Event> {
  return await stripeClient.events.retrieve(eventId)
}

/**
 * Main webhook event processor
 * 
 * Handles the event based on its type and returns processing result.
 * Uses thin events approach: fetches full event data from Stripe.
 * 
 * @param rawPayload - Raw request body
 * @param signature - Stripe-Signature header
 * @param webhookSecret - Webhook secret
 * @returns Processing result
 */
export async function processWebhookEvent(
  rawPayload: string | Buffer,
  signature: string,
  webhookSecret: string
): Promise<WebhookProcessingResult> {
  // Step 1: Verify signature
  const webhookEvent = verifyWebhookSignature(rawPayload, signature, webhookSecret)
  
  console.log(`[Stripe Webhook] Received event: ${webhookEvent.type} (${webhookEvent.id})`)
  
  // Step 2: Fetch full event from Stripe (thin events approach)
  const event = await fetchFullEvent(webhookEvent.id)
  
  console.log(`[Stripe Webhook] Fetched full event: ${event.type}`)
  
  // Step 3: Route to appropriate handler
  try {
    switch (event.type) {
      // Account events
      case 'account.updated':
        return await handleAccountUpdated(event)
      
      // Checkout events
      case 'checkout.session.completed':
        return await handleCheckoutSessionCompleted(event)
      case 'checkout.session.async_payment_succeeded':
        return await handleCheckoutSessionAsyncPaymentSucceeded(event)
      case 'checkout.session.async_payment_failed':
        return await handleCheckoutSessionAsyncPaymentFailed(event)
      
      // Payment intent events
      case 'payment_intent.succeeded':
        return await handlePaymentIntentSucceeded(event)
      case 'payment_intent.payment_failed':
        return await handlePaymentIntentFailed(event)
      
      // Transfer events
      case 'transfer.created':
        return await handleTransferCreated(event)
      
      // Payout events
      case 'payout.paid':
        return await handlePayoutPaid(event)
      case 'payout.failed':
        return await handlePayoutFailed(event)
      
      // Capability events
      case 'capability.updated':
        return await handleCapabilityUpdated(event)
      
      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
        return {
          success: true,
          eventId: event.id,
          eventType: event.type,
          message: `Event type ${event.type} acknowledged but not handled`,
        }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, message)
    return {
      success: false,
      eventId: event.id,
      eventType: event.type,
      message: `Error processing event: ${message}`,
    }
  }
}

// ============================================================================
// Account Event Handlers
// ============================================================================

/**
 * Handle account.updated event
 * 
 * Monitors connected account status changes including:
 * - Onboarding completion
 * - Requirements changes
 * - Capability status changes
 */
async function handleAccountUpdated(
  event: Stripe.Event
): Promise<WebhookProcessingResult> {
  const account = event.data.object as Stripe.Account
  
  const statusChange: AccountStatusChange = {
    accountId: account.id,
    previouslyEnabled: false, // Would need to track this separately
    nowEnabled: Boolean(account.charges_enabled && account.payouts_enabled),
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    detailsSubmitted: account.details_submitted ?? false,
    requirements: {
      currentlyDue: account.requirements?.currently_due ?? [],
      eventuallyDue: account.requirements?.eventually_due ?? [],
      pastDue: account.requirements?.past_due ?? [],
      disabledReason: account.requirements?.disabled_reason ?? null,
    },
  }
  
  console.log(`[Stripe Webhook] Account ${account.id} updated:`, {
    chargesEnabled: statusChange.chargesEnabled,
    payoutsEnabled: statusChange.payoutsEnabled,
    detailsSubmitted: statusChange.detailsSubmitted,
    currentlyDue: statusChange.requirements.currentlyDue.length,
    disabledReason: statusChange.requirements.disabledReason,
  })
  
  // Check if account just completed onboarding
  if (statusChange.nowEnabled && statusChange.detailsSubmitted) {
    console.log(`[Stripe Webhook] Account ${account.id} is now fully enabled!`)
    // TODO: Update database, notify user, etc.
  }
  
  // Check if account has new requirements
  if (statusChange.requirements.currentlyDue.length > 0) {
    console.log(`[Stripe Webhook] Account ${account.id} has pending requirements:`, 
      statusChange.requirements.currentlyDue)
    // TODO: Notify user about pending requirements
  }
  
  // Check if account was disabled
  if (statusChange.requirements.disabledReason) {
    console.log(`[Stripe Webhook] Account ${account.id} disabled:`, 
      statusChange.requirements.disabledReason)
    // TODO: Handle disabled account
  }
  
  return {
    success: true,
    eventId: event.id,
    eventType: event.type,
    message: `Account ${account.id} status updated`,
    data: statusChange as unknown as Record<string, unknown>,
  }
}

/**
 * Handle capability.updated event
 */
async function handleCapabilityUpdated(
  event: Stripe.Event
): Promise<WebhookProcessingResult> {
  const capability = event.data.object as Stripe.Capability
  
  console.log(`[Stripe Webhook] Capability updated:`, {
    account: capability.account,
    capability: capability.id,
    status: capability.status,
    requirements: capability.requirements,
  })
  
  // Check if capability became active
  if (capability.status === 'active') {
    console.log(`[Stripe Webhook] Capability ${capability.id} is now active for account ${capability.account}`)
  }
  
  // Check if capability has requirements
  if (capability.status === 'pending' && capability.requirements?.currently_due?.length) {
    console.log(`[Stripe Webhook] Capability ${capability.id} pending requirements:`,
      capability.requirements.currently_due)
  }
  
  return {
    success: true,
    eventId: event.id,
    eventType: event.type,
    message: `Capability ${capability.id} updated to ${capability.status}`,
    data: {
      account: capability.account,
      capability: capability.id,
      status: capability.status,
    },
  }
}

// ============================================================================
// Checkout Event Handlers
// ============================================================================

/**
 * Handle checkout.session.completed event
 * 
 * Fired when a customer completes the checkout flow.
 * For card payments, this means payment is confirmed.
 */
async function handleCheckoutSessionCompleted(
  event: Stripe.Event
): Promise<WebhookProcessingResult> {
  const session = event.data.object as Stripe.Checkout.Session
  
  console.log(`[Stripe Webhook] Checkout session completed:`, {
    sessionId: session.id,
    paymentStatus: session.payment_status,
    amountTotal: session.amount_total,
    currency: session.currency,
    metadata: session.metadata,
  })
  
  // Extract task metadata
  const taskId = session.metadata?.task_id
  const helperId = session.metadata?.helper_id
  const taskerId = session.metadata?.tasker_id
  
  if (session.payment_status === 'paid' && taskId) {
    console.log(`[Stripe Webhook] Payment confirmed for task ${taskId}`)
    const supabaseAdmin = (await import('@supabase/supabase-js')).createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
    await supabaseAdmin.from('tasks').update({
      payment_status: 'paid',
      status: 'in_progress',
    }).eq('id', taskId)

    // Notify helper — same pattern as PayPal webhook
    try {
      const { data: task } = await supabaseAdmin.from('tasks').select('id, title, budget, assigned_to, created_by').eq('id', taskId).single()
      if (task?.assigned_to) {
        const { data: helper } = await supabaseAdmin.from('profiles').select('email, full_name').eq('id', task.assigned_to).single()
        const { data: owner } = await supabaseAdmin.from('profiles').select('full_name').eq('id', task.created_by).single()
        if (helper?.email) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          await fetch(`${appUrl}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'bid_accepted',
              bidderEmail: helper.email,
              bidderName: helper.full_name || 'Helper',
              taskTitle: task.title || 'Task',
              taskOwnerName: owner?.full_name || 'Task Owner',
              bidAmount: task.budget || 0,
              taskId,
            }),
          })
        }
      }
    } catch (emailErr) {
      console.error('[Stripe Webhook] Error sending helper notification (task still marked paid):', emailErr)
    }
  } else if (session.payment_status === 'unpaid') {
    console.log(`[Stripe Webhook] Payment pending for task ${taskId}`)
  }
  
  return {
    success: true,
    eventId: event.id,
    eventType: event.type,
    message: `Checkout session ${session.id} completed with status ${session.payment_status}`,
    data: {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      taskId,
      helperId,
      taskerId,
    },
  }
}

/**
 * Handle checkout.session.async_payment_succeeded event
 * 
 * Fired when an async payment method (e.g., bank transfer) succeeds.
 */
async function handleCheckoutSessionAsyncPaymentSucceeded(
  event: Stripe.Event
): Promise<WebhookProcessingResult> {
  const session = event.data.object as Stripe.Checkout.Session
  
  console.log(`[Stripe Webhook] Async payment succeeded for session ${session.id}`)
  
  const taskId = session.metadata?.task_id
  
  // TODO: Update task status to 'paid' in database
  // TODO: Notify helper that payment was received
  
  return {
    success: true,
    eventId: event.id,
    eventType: event.type,
    message: `Async payment succeeded for session ${session.id}`,
    data: {
      sessionId: session.id,
      taskId,
    },
  }
}

/**
 * Handle checkout.session.async_payment_failed event
 * 
 * Fired when an async payment method fails.
 */
async function handleCheckoutSessionAsyncPaymentFailed(
  event: Stripe.Event
): Promise<WebhookProcessingResult> {
  const session = event.data.object as Stripe.Checkout.Session
  
  console.log(`[Stripe Webhook] Async payment failed for session ${session.id}`)
  
  const taskId = session.metadata?.task_id
  
  // TODO: Update task status in database
  // TODO: Notify tasker that payment failed
  
  return {
    success: true,
    eventId: event.id,
    eventType: event.type,
    message: `Async payment failed for session ${session.id}`,
    data: {
      sessionId: session.id,
      taskId,
    },
  }
}

// ============================================================================
// Payment Intent Event Handlers
// ============================================================================

/**
 * Handle payment_intent.succeeded event
 */
async function handlePaymentIntentSucceeded(
  event: Stripe.Event
): Promise<WebhookProcessingResult> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  
  console.log(`[Stripe Webhook] Payment intent succeeded:`, {
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    metadata: paymentIntent.metadata,
  })
  
  const taskId = paymentIntent.metadata?.task_id
  
  return {
    success: true,
    eventId: event.id,
    eventType: event.type,
    message: `Payment intent ${paymentIntent.id} succeeded`,
    data: {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      taskId,
    },
  }
}

/**
 * Handle payment_intent.payment_failed event
 */
async function handlePaymentIntentFailed(
  event: Stripe.Event
): Promise<WebhookProcessingResult> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  
  console.log(`[Stripe Webhook] Payment intent failed:`, {
    paymentIntentId: paymentIntent.id,
    lastPaymentError: paymentIntent.last_payment_error?.message,
  })
  
  const taskId = paymentIntent.metadata?.task_id
  
  return {
    success: true,
    eventId: event.id,
    eventType: event.type,
    message: `Payment intent ${paymentIntent.id} failed: ${paymentIntent.last_payment_error?.message}`,
    data: {
      paymentIntentId: paymentIntent.id,
      error: paymentIntent.last_payment_error?.message,
      taskId,
    },
  }
}

// ============================================================================
// Transfer Event Handlers
// ============================================================================

/**
 * Handle transfer.created event
 * 
 * Fired when funds are transferred to a connected account.
 */
async function handleTransferCreated(
  event: Stripe.Event
): Promise<WebhookProcessingResult> {
  const transfer = event.data.object as Stripe.Transfer
  
  console.log(`[Stripe Webhook] Transfer created:`, {
    transferId: transfer.id,
    amount: transfer.amount,
    currency: transfer.currency,
    destination: transfer.destination,
  })
  
  return {
    success: true,
    eventId: event.id,
    eventType: event.type,
    message: `Transfer ${transfer.id} created to ${transfer.destination}`,
    data: {
      transferId: transfer.id,
      amount: transfer.amount,
      destination: transfer.destination,
    },
  }
}

// ============================================================================
// Payout Event Handlers
// ============================================================================

/**
 * Handle payout.paid event
 * 
 * Fired when a payout to a connected account's bank succeeds.
 */
async function handlePayoutPaid(
  event: Stripe.Event
): Promise<WebhookProcessingResult> {
  const payout = event.data.object as Stripe.Payout
  
  console.log(`[Stripe Webhook] Payout paid:`, {
    payoutId: payout.id,
    amount: payout.amount,
    currency: payout.currency,
    arrivalDate: payout.arrival_date,
  })
  
  return {
    success: true,
    eventId: event.id,
    eventType: event.type,
    message: `Payout ${payout.id} paid`,
    data: {
      payoutId: payout.id,
      amount: payout.amount,
    },
  }
}

/**
 * Handle payout.failed event
 */
async function handlePayoutFailed(
  event: Stripe.Event
): Promise<WebhookProcessingResult> {
  const payout = event.data.object as Stripe.Payout
  
  console.log(`[Stripe Webhook] Payout failed:`, {
    payoutId: payout.id,
    failureCode: payout.failure_code,
    failureMessage: payout.failure_message,
  })
  
  return {
    success: true,
    eventId: event.id,
    eventType: event.type,
    message: `Payout ${payout.id} failed: ${payout.failure_message}`,
    data: {
      payoutId: payout.id,
      failureCode: payout.failure_code,
      failureMessage: payout.failure_message,
    },
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if an event type is one we handle
 */
export function isHandledEventType(eventType: string): eventType is HandledEventType {
  return HANDLED_EVENTS.includes(eventType as HandledEventType)
}

/**
 * Get the webhook secret for local testing
 * 
 * When using Stripe CLI, it provides a webhook secret like:
 * whsec_... (from `stripe listen --forward-to ...`)
 */
export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET is not set. ' +
      'For local testing, run: stripe listen --forward-to localhost:3000/api/payments/webhook/stripe ' +
      'and use the provided webhook signing secret.'
    )
  }
  return secret
}
