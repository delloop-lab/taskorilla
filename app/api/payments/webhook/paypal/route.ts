import { NextRequest, NextResponse } from 'next/server'
import { processPayPalWebhook } from '@/services/payments/paypal/webhooks'

/**
 * PayPal Webhook Handler
 * POST /api/payments/webhook/paypal
 *
 * Configure in PayPal Developer Dashboard:
 * - CHECKOUT.ORDER.APPROVED
 * - PAYMENT.CAPTURE.COMPLETED
 * - PAYMENT.CAPTURE.DENIED
 * - PAYMENT.PAYOUTS-ITEM.SUCCEEDED
 * - PAYMENT.PAYOUTS-ITEM.FAILED
 *
 * Env: PAYPAL_WEBHOOK_ID (from Developer Portal webhook config)
 */

export async function POST(request: NextRequest) {
  try {
    return await processPayPalWebhook(request)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[PayPal Webhook] Error:', message)

    if (message.includes('signature verification failed')) {
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Webhook processing failed', details: message },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}
