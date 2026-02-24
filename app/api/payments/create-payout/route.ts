import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { executeCreatePayout } from '@/services/payments/create-payout'

/**
 * Provider-agnostic Create Payout API
 * POST /api/payments/create-payout
 * Provider selection is handled entirely in services/payments/create-payout.ts
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      taskId,
      helperId,
      amount,
      currency = 'EUR',
      iban,
      accountHolderName,
      idempotencyKey,
      simulatePayout = false,
      ...rest
    } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount is required and must be greater than 0' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const result = await executeCreatePayout(
      { taskId, helperId, amount, currency, iban, accountHolderName, idempotencyKey, simulatePayout, ...rest },
      {
        cookieHeader: request.headers.get('cookie') || '',
        baseUrl,
        supabase,
      }
    )

    if ('status' in result && typeof result.status === 'number' && result.status >= 400) {
      return NextResponse.json(result.body, { status: result.status })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Create Payout] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to create payout', details: message },
      { status: 500 }
    )
  }
}
