/**
 * Create Customer - Provider orchestration
 * All provider selection logic lives here. Routes must not contain provider conditionals.
 */

import { isStripeEnabled, isAirwallexEnabled, isPayPalEnabled, getProviderNotEnabledError } from '@/lib/payment-provider'

export type CreateCustomerResult =
  | { success: true; data: unknown }
  | { status: 501; body: { error: string; details: string; code: string } }
  | { status: 503; body: ReturnType<typeof getProviderNotEnabledError> }
  | { status: number; body: { error: string; details?: unknown } }

export async function executeCreateCustomer(
  body: unknown,
  requestContext: { cookieHeader: string; baseUrl: string }
): Promise<CreateCustomerResult> {
  const { cookieHeader, baseUrl } = requestContext

  if (isStripeEnabled()) {
    return {
      status: 501,
      body: {
        error: 'Customer creation not supported',
        details: 'The current payment provider manages customers within the checkout flow.',
        code: 'NOT_SUPPORTED',
      },
    }
  }

  if (isPayPalEnabled()) {
    return {
      status: 501,
      body: {
        error: 'Customer creation not supported',
        details: 'PayPal uses email-based payouts. Add PayPal email in profile instead.',
        code: 'NOT_SUPPORTED',
      },
    }
  }

  if (!isAirwallexEnabled()) {
    return { status: 503, body: getProviderNotEnabledError('airwallex') }
  }

  const response = await fetch(`${baseUrl}/api/airwallex/create-customer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: cookieHeader },
    body: JSON.stringify(body),
  })

  const data = await response.json()

  if (!response.ok) {
    return {
      status: response.status,
      body: { error: data.error || 'Failed to create customer', details: data.details },
    }
  }

  return { success: true, data }
}
