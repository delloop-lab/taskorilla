import { NextRequest, NextResponse } from 'next/server'
import { processStripeWebhook } from '@/services/payments/webhook-stripe'

/**
 * Stripe Webhook Handler
 * POST /api/payments/webhook/stripe
 * Provider selection is handled entirely in services/payments/webhook-stripe.ts
 *
 * For local testing: stripe listen --forward-to localhost:3000/api/payments/webhook/stripe
 */

export async function POST(request: NextRequest) {
  try {
    return await processStripeWebhook(request)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Stripe Webhook] Error:', message)

    // If signature verification failed, return 400
    if (message.includes('signature verification failed')) {
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    // For other errors, return 500
    return NextResponse.json(
      { error: 'Webhook processing failed', details: message },
      { status: 500 }
    )
  }
}

// Stripe sends POST requests only
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}
