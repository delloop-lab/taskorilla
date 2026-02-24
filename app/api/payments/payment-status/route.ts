import { NextRequest, NextResponse } from 'next/server'
import { executePaymentStatus } from '@/services/payments/payment-status'

/**
 * Provider-agnostic Payment Status API
 * GET /api/payments/payment-status?paymentIntentId=xxx
 * Provider selection is handled entirely in services/payments/payment-status.ts
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentIntentId = searchParams.get('paymentIntentId') || searchParams.get('id')

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'paymentIntentId or id is required' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const result = await executePaymentStatus(paymentIntentId, {
      cookieHeader: request.headers.get('cookie') || '',
      baseUrl,
    })

    if ('status' in result && result.status >= 400) {
      return NextResponse.json(result.body, { status: result.status })
    }

    return NextResponse.json((result as { success: true; data: unknown }).data)
  } catch (error) {
    console.error('[Payment Status] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to get payment status', details: message },
      { status: 500 }
    )
  }
}
