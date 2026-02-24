/**
 * Payment Status - Provider orchestration
 * All provider selection logic lives here. Routes must not contain provider conditionals.
 */

import { isStripeEnabled, isAirwallexEnabled, isPayPalEnabled, getProviderNotEnabledError } from '@/lib/payment-provider'
import { getPaymentStatus as paypalGetPaymentStatus } from './paypal/payment-status'

export type PaymentStatusResult =
  | { success: true; data: unknown }
  | { status: 501; body: { error: string; details: string; code: string } }
  | { status: 503; body: ReturnType<typeof getProviderNotEnabledError> }
  | { status: number; body: unknown }

export async function executePaymentStatus(
  paymentIntentId: string,
  requestContext: { cookieHeader: string; baseUrl: string }
): Promise<PaymentStatusResult> {
  const { cookieHeader, baseUrl } = requestContext

  if (isStripeEnabled()) {
    return {
      status: 501,
      body: {
        error: 'Status check not supported',
        details: 'The current payment provider uses webhooks for status updates.',
        code: 'NOT_SUPPORTED',
      },
    }
  }

  if (isPayPalEnabled()) {
    try {
      const status = await paypalGetPaymentStatus(paymentIntentId)
      return {
        success: true,
        data: {
          id: status.id,
          status: status.status,
          paymentIntentId: status.paymentIntentId,
          amount: status.amount,
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        status: 500,
        body: { error: 'Failed to get payment status', details: message },
      }
    }
  }

  if (!isAirwallexEnabled()) {
    return { status: 503, body: getProviderNotEnabledError('airwallex') }
  }

  const response = await fetch(
    `${baseUrl}/api/airwallex/payment-status?paymentIntentId=${encodeURIComponent(paymentIntentId)}`,
    { headers: { cookie: cookieHeader } }
  )
  const data = await response.json()

  if (!response.ok) {
    return { status: response.status, body: data }
  }

  return { success: true, data }
}
