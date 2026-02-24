/**
 * Create Payment (standalone) - Provider orchestration
 * All provider selection logic lives here. Routes must not contain provider conditionals.
 */

import { isStripeEnabled, isAirwallexEnabled, isPayPalEnabled, getProviderNotEnabledError } from '@/lib/payment-provider'

export interface CreatePaymentParams {
  amount: number
  currency?: string
  return_url?: string
  merchant_order_id?: string
  customer_id?: string
  metadata?: Record<string, string>
}

export type CreatePaymentResult =
  | { success: true; data: unknown }
  | { status: 501; body: { error: string; details: string; code: string } }
  | { status: 503; body: ReturnType<typeof getProviderNotEnabledError> }
  | { status: number; body: { error: string; details?: unknown } }

export async function executeCreatePayment(
  params: CreatePaymentParams,
  requestContext: { cookieHeader: string; baseUrl: string }
): Promise<CreatePaymentResult> {
  const { cookieHeader, baseUrl } = requestContext
  const amountCents = typeof params.amount === 'number' && params.amount < 1000 ? Math.round(params.amount * 100) : Math.round(params.amount)

  if (isStripeEnabled()) {
    return {
      status: 501,
      body: {
        error: 'Standalone payment not supported',
        details: 'The current payment provider requires task-based checkout. Use /api/payments/create-checkout with a taskId.',
        code: 'USE_CREATE_CHECKOUT',
      },
    }
  }

  if (isPayPalEnabled()) {
    return {
      status: 501,
      body: {
        error: 'Standalone payment not supported',
        details: 'PayPal requires task-based checkout. Use /api/payments/create-checkout with a taskId.',
        code: 'USE_CREATE_CHECKOUT',
      },
    }
  }

  if (!isAirwallexEnabled()) {
    return { status: 503, body: getProviderNotEnabledError('airwallex') }
  }

  const response = await fetch(`${baseUrl}/api/airwallex/create-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: cookieHeader },
    body: JSON.stringify({
      amount: amountCents,
      currency: params.currency || 'EUR',
      return_url: params.return_url || `${baseUrl}/?payment=success`,
      merchant_order_id: params.merchant_order_id || `order_${Date.now()}`,
      customer_id: params.customer_id,
      metadata: params.metadata,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    return {
      status: response.status,
      body: { error: data.error || 'Failed to create payment', details: data.details },
    }
  }

  return { success: true, data }
}
