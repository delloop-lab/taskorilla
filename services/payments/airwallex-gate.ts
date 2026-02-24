/**
 * Airwallex route gate
 * Provider selection logic: ensures Airwallex routes are only reachable when PAYMENT_PROVIDER=airwallex.
 * Call this at the start of each app/api/airwallex/* route.
 */

import { NextResponse } from 'next/server'
import { isAirwallexEnabled, getProviderNotEnabledError } from '@/lib/payment-provider'

/**
 * Returns 503 response if Airwallex is not the active provider.
 * Returns null if the request should proceed.
 */
export function requireAirwallexEnabled(): NextResponse | null {
  if (!isAirwallexEnabled()) {
    return NextResponse.json(getProviderNotEnabledError('airwallex'), { status: 503 })
  }
  return null
}
