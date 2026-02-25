/**
 * PayPal Webhook Handler
 * Verifies signature and processes: CHECKOUT.ORDER.APPROVED, PAYMENT.CAPTURE.*, PAYMENT.PAYOUTS-ITEM.*
 * @see https://developer.paypal.com/docs/api/webhooks/v1/
 */

import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import { isPayPalEnabled, getProviderNotEnabledError } from '@/lib/payment-provider'
import { captureOrder } from './checkout'

const PAYPAL_BASE =
  process.env.PAYPAL_ENV === 'production' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com'

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set')
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`PayPal OAuth failed: ${response.status} ${err}`)
  }

  const data = (await response.json()) as { access_token?: string }
  if (!data.access_token) {
    throw new Error('PayPal OAuth succeeded but no access_token returned')
  }
  return data.access_token
}

export async function processPayPalWebhook(request: NextRequest): Promise<NextResponse> {
  if (!isPayPalEnabled()) {
    console.log('[PayPal Webhook] Received webhook but PayPal is not enabled')
    return NextResponse.json(getProviderNotEnabledError('paypal'), { status: 503 })
  }

  const rawBody = await request.text()

  const authAlgo = request.headers.get('PAYPAL-AUTH-ALGO')
  const certUrl = request.headers.get('PAYPAL-CERT-URL')
  const transmissionId = request.headers.get('PAYPAL-TRANSMISSION-ID')
  const transmissionSig = request.headers.get('PAYPAL-TRANSMISSION-SIG')
  const transmissionTime = request.headers.get('PAYPAL-TRANSMISSION-TIME')

  let event: { event_type?: string; resource?: Record<string, unknown> }
  try {
    event = JSON.parse(rawBody) as { event_type?: string; resource?: Record<string, unknown> }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const skipVerification = process.env.PAYPAL_SKIP_WEBHOOK_VERIFICATION === 'true'

  if (skipVerification) {
    console.warn('[PayPal Webhook] Signature verification SKIPPED (PAYPAL_SKIP_WEBHOOK_VERIFICATION=true)')
  } else {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID
    if (!webhookId) {
      console.error('[PayPal Webhook] PAYPAL_WEBHOOK_ID is not set')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
      return NextResponse.json(
        { error: 'Missing PayPal webhook signature headers' },
        { status: 400 }
      )
    }

    const verified = await verifyWebhookSignature({
      authAlgo,
      certUrl,
      transmissionId,
      transmissionSig,
      transmissionTime,
      webhookId,
      webhookEvent: event,
    })

    if (!verified) {
      console.error('[PayPal Webhook] Signature verification failed')
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }
  }

  const eventType = event.event_type
  console.log('[PayPal Webhook] Received:', eventType)

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  try {
    switch (eventType) {
      case 'CHECKOUT.ORDER.APPROVED': {
        const orderId = (event.resource as { id?: string })?.id
        if (orderId) {
          await captureOrder(orderId)
          console.log('[PayPal Webhook] Captured order:', orderId)
        }
        break
      }

      case 'PAYMENT.CAPTURE.COMPLETED': {
        await markTaskPaid(event.resource, supabaseAdmin)
        break
      }

      case 'PAYMENT.CAPTURE.DENIED': {
        await markTaskFailed(event.resource, supabaseAdmin)
        break
      }

      case 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED': {
        await markPayoutSuccessful(event.resource, supabaseAdmin)
        break
      }

      case 'PAYMENT.PAYOUTSBATCH.SUCCESS': {
        await markPayoutBatchSuccessful(event.resource, supabaseAdmin)
        break
      }

      case 'PAYMENT.PAYOUTS-ITEM.FAILED':
      case 'PAYMENT.PAYOUTSBATCH.DENIED': {
        await markPayoutFailed(event.resource, supabaseAdmin)
        break
      }

      default:
        console.log('[PayPal Webhook] Unhandled event type:', eventType)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[PayPal Webhook] Error processing event:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed', details: String(error) },
      { status: 500 }
    )
  }
}

async function verifyWebhookSignature(params: {
  authAlgo: string
  certUrl: string
  transmissionId: string
  transmissionSig: string
  transmissionTime: string
  webhookId: string
  webhookEvent: object
}): Promise<boolean> {
  const accessToken = await getAccessToken()
  const response = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      auth_algo: params.authAlgo,
      cert_url: params.certUrl,
      transmission_id: params.transmissionId,
      transmission_sig: params.transmissionSig,
      transmission_time: params.transmissionTime,
      webhook_id: params.webhookId,
      webhook_event: params.webhookEvent,
    }),
  })

  const raw = await response.text()
  let data: { verification_status?: string } | null = null
  try {
    data = JSON.parse(raw) as { verification_status?: string }
  } catch {
    data = null
  }

  if (!response.ok) {
    console.error('[PayPal Webhook] Signature verification API error:', response.status, raw.substring(0, 300))
    return false
  }

  return data?.verification_status === 'SUCCESS'
}

async function markTaskPaid(
  resource: Record<string, unknown> | undefined,
  supabase: SupabaseClient
) {
  if (!resource) return

  // PAYMENT.CAPTURE.COMPLETED resource is a Capture object:
  // custom_id is at the top level (inherited from the purchase unit)
  const taskId = resource.custom_id as string | undefined

  const orderId =
    (resource.supplementary_data as { related_ids?: { order_id?: string } })?.related_ids?.order_id ??
    (resource as { id?: string }).id

  const updatePayload = {
    payment_status: 'paid',
    payment_provider: 'paypal',
    payment_intent_id: orderId ?? undefined,
  }

  if (taskId) {
    const { error } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', taskId)

    if (error) {
      console.error('[PayPal Webhook] Failed to mark task paid:', error)
    } else {
      console.log('[PayPal Webhook] Marked task paid:', taskId)
    }
  } else if (orderId) {
    const { error } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('payment_intent_id', orderId)
    if (error) console.error('[PayPal Webhook] Failed to mark task paid by order:', error)
  } else {
    console.warn('[PayPal Webhook] PAYMENT.CAPTURE.COMPLETED missing custom_id and order reference')
  }
}

async function markTaskFailed(
  resource: Record<string, unknown> | undefined,
  supabase: SupabaseClient
) {
  if (!resource) return

  const taskId = resource.custom_id as string | undefined
  const orderId =
    (resource.supplementary_data as { related_ids?: { order_id?: string } })?.related_ids?.order_id ??
    (resource as { id?: string }).id

  if (taskId) {
    const { error } = await supabase.from('tasks').update({ payment_status: 'failed' }).eq('id', taskId)
    if (!error) console.log('[PayPal Webhook] Marked task failed:', taskId)
  } else if (orderId) {
    await supabase.from('tasks').update({ payment_status: 'failed' }).eq('payment_intent_id', orderId)
  }
}

async function markPayoutSuccessful(
  resource: Record<string, unknown> | undefined,
  supabase: SupabaseClient
) {
  if (!resource) return

  const payoutBatchId = resource.payout_batch_id as string | undefined
  const payoutItem = resource.payout_item as { sender_item_id?: string } | undefined
  const senderItemId = payoutItem?.sender_item_id

  const updatePayload = {
    status: 'completed',
    completed_at: new Date().toISOString(),
    error_message: null,
  }

  if (payoutBatchId) {
    const { error } = await supabase.from('payouts').update(updatePayload).eq('paypal_payout_id', payoutBatchId)
    if (!error) {
      console.log('[PayPal Webhook] Marked payout successful, batch:', payoutBatchId)
      await supabase.from('tasks').update({ payout_status: 'completed' }).eq('payout_id', payoutBatchId)
      return
    }
  }

  if (senderItemId?.startsWith('task_')) {
    const taskId = senderItemId.replace('task_', '')
    const { error } = await supabase
      .from('payouts')
      .update(updatePayload)
      .eq('task_id', taskId)
    if (!error) console.log('[PayPal Webhook] Marked payout successful by task:', taskId)
    await supabase.from('tasks').update({ payout_status: 'completed' }).eq('id', taskId)
  }
}

async function markPayoutBatchSuccessful(
  resource: Record<string, unknown> | undefined,
  supabase: SupabaseClient
) {
  if (!resource) return

  const batchHeader = resource.batch_header as { payout_batch_id?: string } | undefined
  const payoutBatchId = batchHeader?.payout_batch_id

  if (!payoutBatchId) {
    console.warn('[PayPal Webhook] PAYOUTSBATCH.SUCCESS missing payout_batch_id')
    return
  }

  const updatePayload = {
    status: 'completed',
    completed_at: new Date().toISOString(),
    error_message: null,
  }

  const { error } = await supabase
    .from('payouts')
    .update(updatePayload)
    .eq('paypal_payout_id', payoutBatchId)

  if (error) {
    console.error('[PayPal Webhook] Failed to mark payout batch successful:', error)
  } else {
    console.log('[PayPal Webhook] Marked payout batch successful:', payoutBatchId)
    await supabase.from('tasks').update({ payout_status: 'completed' }).eq('payout_id', payoutBatchId)
  }
}

async function markPayoutFailed(
  resource: Record<string, unknown> | undefined,
  supabase: SupabaseClient
) {
  if (!resource) return

  const payoutBatchId = resource.payout_batch_id as string | undefined
  const payoutItem = resource.payout_item as { sender_item_id?: string } | undefined
  const senderItemId = payoutItem?.sender_item_id
  const failureReason = (resource as { errors?: Array<{ message?: string }> }).errors?.[0]?.message ?? 'Payout failed'

  const updatePayload = { status: 'failed', error_message: failureReason }

  if (payoutBatchId) {
    const { error } = await supabase.from('payouts').update(updatePayload).eq('paypal_payout_id', payoutBatchId)
    if (!error) {
      console.log('[PayPal Webhook] Marked payout failed, batch:', payoutBatchId)
      await supabase.from('tasks').update({ payout_status: 'failed' }).eq('payout_id', payoutBatchId)
      return
    }
  }

  if (senderItemId?.startsWith('task_')) {
    const taskId = senderItemId.replace('task_', '')
    await supabase.from('payouts').update(updatePayload).eq('task_id', taskId)
    await supabase.from('tasks').update({ payout_status: 'failed' }).eq('id', taskId)
  }
}
