import { NextResponse } from 'next/server'
import { getProviderConfig } from '@/lib/payment-provider'

/**
 * Payment Provider Status API
 * GET /api/payments/provider
 * Configuration is read exclusively from lib/payment-provider.ts
 */

export async function GET() {
  const config = getProviderConfig()
  return NextResponse.json(config)
}
