/**
 * Simulate Payment - Provider orchestration
 * All provider selection logic lives here. Routes must not contain provider conditionals.
 */

import { createClient } from '@supabase/supabase-js'
import { isStripeEnabled, isAirwallexEnabled, isPayPalEnabled, getProviderNotEnabledError } from '@/lib/payment-provider'
import { simulatePayment as paypalSimulatePayment } from './paypal/simulate-payment'

export type SimulatePaymentResult =
  | { success: true; data: unknown }
  | { status: 501; body: { error: string; details: string; code: string } }
  | { status: 503; body: ReturnType<typeof getProviderNotEnabledError> }
  | { status: number; body: { error: string; details?: unknown } }

export async function executeSimulatePayment(
  body: unknown,
  requestContext: { cookieHeader: string; baseUrl: string }
): Promise<SimulatePaymentResult> {
  const { cookieHeader, baseUrl } = requestContext

  if (isStripeEnabled()) {
    return {
      status: 501,
      body: {
        error: 'Simulation not supported',
        details: 'The current payment provider uses hosted checkout. Use test card numbers in the checkout flow instead.',
        code: 'SIMULATE_NOT_SUPPORTED',
      },
    }
  }

  if (isPayPalEnabled()) {
    const params = body as { intentId?: string; taskId?: string; action?: string }
    const intentId = params?.intentId || (params as { paymentIntentId?: string })?.paymentIntentId
    if (!intentId) {
      return {
        status: 400,
        body: { error: 'Missing intentId or paymentIntentId for simulation' },
      }
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
    const result = await paypalSimulatePayment(
      {
        intentId,
        taskId: params?.taskId,
        action: (params?.action as 'payment_succeeded') || 'payment_succeeded',
      },
      supabase
    )
    if (!result.success) {
      return {
        status: 500,
        body: { error: result.message || 'PayPal simulation failed' },
      }
    }
    return {
      success: true,
      data: {
        status: result.status || 'paid',
        message: result.message,
        payout: result.payout,
      },
    }
  }

  if (!isAirwallexEnabled()) {
    return { status: 503, body: getProviderNotEnabledError('airwallex') }
  }

  const response = await fetch(`${baseUrl}/api/airwallex/simulate-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: cookieHeader },
    body: JSON.stringify(body),
  })

  const data = await response.json()

  if (!response.ok) {
    return {
      status: response.status,
      body: { error: data.error || 'Simulation failed', details: data.details },
    }
  }

  return { success: true, data }
}
