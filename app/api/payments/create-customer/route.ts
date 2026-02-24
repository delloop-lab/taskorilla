import { NextRequest, NextResponse } from 'next/server'
import { executeCreateCustomer } from '@/services/payments/create-customer'

/**
 * Provider-agnostic Create Customer API
 * POST /api/payments/create-customer
 * Provider selection is handled entirely in services/payments/create-customer.ts
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const result = await executeCreateCustomer(body, {
      cookieHeader: request.headers.get('cookie') || '',
      baseUrl,
    })

    if ('status' in result && result.status >= 400) {
      return NextResponse.json(result.body, { status: result.status })
    }

    return NextResponse.json((result as { success: true; data: unknown }).data)
  } catch (error) {
    console.error('[Create Customer] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to create customer', details: message },
      { status: 500 }
    )
  }
}
