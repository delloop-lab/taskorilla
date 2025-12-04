import { NextRequest, NextResponse } from 'next/server'
import { getPaymentIntent } from '@/lib/airwallex'

// This route depends on request.nextUrl.searchParams; mark it as dynamic
export const dynamic = 'force-dynamic'

/**
 * Get Airwallex payment intent status
 * GET /api/airwallex/payment-status?paymentIntentId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const paymentIntentId = searchParams.get('paymentIntentId')

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'paymentIntentId is required' },
        { status: 400 }
      )
    }

    console.log('Checking Airwallex payment status:', paymentIntentId)

    const paymentIntent = await getPaymentIntent(paymentIntentId)

    return NextResponse.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      paymentIntent,
    })
  } catch (error: any) {
    console.error('Error getting Airwallex payment status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get payment status' },
      { status: 500 }
    )
  }
}


