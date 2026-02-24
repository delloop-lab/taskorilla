/**
 * Payout Status - Provider orchestration
 * All provider selection logic lives here. Routes must not contain provider conditionals.
 */

import { isStripeEnabled, isAirwallexEnabled, isPayPalEnabled, getProviderNotEnabledError } from '@/lib/payment-provider'
import { getPayoutStatus as paypalGetPayoutStatus } from './paypal/payout-status'

export type PayoutStatusResult =
  | { success: true; data: unknown }
  | { status: 501; body: { error: string; details: string; code: string } }
  | { status: 503; body: ReturnType<typeof getProviderNotEnabledError> }
  | { status: number; body: unknown }

export async function executePayoutStatus(
  payoutId: string,
  requestContext: { cookieHeader: string; baseUrl: string }
): Promise<PayoutStatusResult> {
  const { cookieHeader, baseUrl } = requestContext

  if (isStripeEnabled()) {
    return {
      status: 501,
      body: {
        error: 'Status check not supported',
        details: 'The current payment provider handles payouts automatically.',
        code: 'NOT_SUPPORTED',
      },
    }
  }

  if (isPayPalEnabled()) {
    try {
      const status = await paypalGetPayoutStatus(payoutId)
      return {
        success: true,
        data: {
          payoutId: status.payoutId,
          status: status.status,
          batchStatus: status.batchStatus,
          amount: status.amount,
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        status: 500,
        body: { error: 'Failed to get payout status', details: message },
      }
    }
  }

  if (!isAirwallexEnabled()) {
    return { status: 503, body: getProviderNotEnabledError('airwallex') }
  }

  const response = await fetch(
    `${baseUrl}/api/airwallex/payout-status?payoutId=${encodeURIComponent(payoutId)}`,
    { headers: { cookie: cookieHeader } }
  )
  const data = await response.json()

  if (!response.ok) {
    return { status: response.status, body: data }
  }

  return { success: true, data }
}
