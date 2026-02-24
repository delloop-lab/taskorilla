import { NextRequest, NextResponse } from 'next/server'
import { executeCreatePayment } from '@/services/payments/create-payment'

/**
 * Provider-agnostic Create Payment API (standalone)
 * POST /api/payments/create-payment
 * Provider selection is handled entirely in services/payments/create-payment.ts
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, currency, return_url, merchant_order_id, customer_id, metadata } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount is required and must be greater than 0' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const result = await executeCreatePayment(
      { amount, currency, return_url, merchant_order_id, customer_id, metadata },
      { cookieHeader: request.headers.get('cookie') || '', baseUrl }
    )

    if ('status' in result && result.status >= 400) {
      return NextResponse.json(result.body, { status: result.status })
    }

    return NextResponse.json((result as { success: true; data: unknown }).data)
  } catch (error) {
    console.error('[Create Payment] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to create payment', details: message },
      { status: 500 }
    )
  }
}
