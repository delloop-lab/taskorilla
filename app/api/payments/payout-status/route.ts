import { NextRequest, NextResponse } from 'next/server'
import { executePayoutStatus } from '@/services/payments/payout-status'

export const dynamic = 'force-dynamic'

/**
 * Provider-agnostic Payout Status API
 * GET /api/payments/payout-status?payoutId=xxx
 * Provider selection is handled entirely in services/payments/payout-status.ts
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const payoutId = searchParams.get('payoutId') || searchParams.get('id')

    if (!payoutId) {
      return NextResponse.json(
        { error: 'payoutId or id is required' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const result = await executePayoutStatus(payoutId, {
      cookieHeader: request.headers.get('cookie') || '',
      baseUrl,
    })

    if ('status' in result && result.status >= 400) {
      return NextResponse.json(result.body, { status: result.status })
    }

    return NextResponse.json((result as { success: true; data: unknown }).data)
  } catch (error) {
    console.error('[Payout Status] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to get payout status', details: message },
      { status: 500 }
    )
  }
}
