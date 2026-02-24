/**
 * Stripe Webhook - Provider orchestration
 * Guards and delegates. Provider selection (is Stripe active?) lives here.
 * The route must not contain provider conditionals.
 */

import { NextRequest, NextResponse } from 'next/server'
import { isStripeEnabled, getProviderNotEnabledError } from '@/lib/payment-provider'

export async function processStripeWebhook(request: NextRequest): Promise<NextResponse> {
  if (!isStripeEnabled()) {
    console.log('[Stripe Webhook] Received webhook but Stripe is not enabled')
    return NextResponse.json(getProviderNotEnabledError('stripe'), { status: 503 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing Stripe-Signature header' },
      { status: 400 }
    )
  }

  const { processWebhookEvent, getWebhookSecret } = await import('./stripe/webhooks')

  let webhookSecret: string
  try {
    webhookSecret = getWebhookSecret()
  } catch (error) {
    console.error('[Stripe Webhook] Webhook secret not configured:', error)
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  const result = await processWebhookEvent(rawBody, signature, webhookSecret)

  if (result.success) {
    console.log(`[Stripe Webhook] Processed ${result.eventType}: ${result.message}`)
  } else {
    console.error(`[Stripe Webhook] Failed to process ${result.eventType}: ${result.message}`)
  }

  return NextResponse.json({ received: true, ...result })
}
