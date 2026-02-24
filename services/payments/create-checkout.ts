/**
 * Create Checkout - Provider orchestration
 * All provider selection logic lives here. Routes must not contain provider conditionals.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { isStripeEnabled, isPayPalEnabled } from '@/lib/payment-provider'

export interface CreateCheckoutParams {
  taskId: string
  task: { id: string; title: string; budget: number }
  helperProfile: { id: string; email: string | null; full_name: string | null; stripe_account_id: string | null; iban: string | null; paypal_email?: string | null }
  taskerId: string
  taskerEmail: string | null
  returnUrl?: string
  cancelUrl?: string
  serviceFee: number
}

export interface CreateCheckoutResult {
  id: string
  paymentIntentId?: string
  sessionId?: string
  amount: number
  clientSecret?: string
  redirectUrl?: string
  checkoutUrl?: string
  next_action?: { url?: string }
  breakdown?: unknown
}

export interface CreateCheckoutError {
  status: number
  body: { error: string; code?: string; message?: string; details?: unknown; onboardingStatus?: unknown }
}

export async function executeCreateCheckout(
  supabase: SupabaseClient,
  params: CreateCheckoutParams,
  requestContext: { cookieHeader: string; baseUrl: string }
): Promise<CreateCheckoutResult | CreateCheckoutError> {
  const { taskId, task, helperProfile, taskerId, taskerEmail, returnUrl, cancelUrl, serviceFee } = params
  const { cookieHeader, baseUrl } = requestContext
  const defaultReturnUrl = `${baseUrl}/tasks/${taskId}?payment=success`
  const defaultCancelUrl = `${baseUrl}/tasks/${taskId}?payment=cancelled`

  if (isStripeEnabled()) {
    if (!helperProfile.stripe_account_id) {
      return {
        status: 400,
        body: {
          error: 'Helper has not set up payment account',
          code: 'HELPER_NOT_ONBOARDED',
          message: 'The helper needs to complete their payment account setup before you can pay.',
        },
      }
    }

    const { createCheckoutSession, HelperNotOnboardedError } = await import('./stripe/checkout')

    try {
      const result = await createCheckoutSession({
        taskId: task.id,
        taskTitle: task.title,
        taskBudgetCents: Math.round(task.budget * 100),
        helperStripeAccountId: helperProfile.stripe_account_id,
        helperId: helperProfile.id,
        taskerId,
        successUrl: returnUrl || defaultReturnUrl,
        cancelUrl: cancelUrl || defaultCancelUrl,
        taskerEmail: taskerEmail || undefined,
      })

      return {
        id: result.sessionId,
        sessionId: result.sessionId,
        amount: result.breakdown.totalChargeCents,
        redirectUrl: result.checkoutUrl,
        checkoutUrl: result.checkoutUrl,
        breakdown: result.breakdown,
      }
    } catch (error) {
      if (error instanceof HelperNotOnboardedError) {
        return {
          status: 400,
          body: {
            error: 'Helper has not completed payment account onboarding',
            code: 'HELPER_NOT_ONBOARDED',
            onboardingStatus: error.onboardingStatus,
          },
        }
      }
      throw error
    }
  }

  if (isPayPalEnabled()) {
    if (!helperProfile.paypal_email) {
      return {
        status: 400,
        body: {
          error: 'Helper has not set up their PayPal email',
          code: 'HELPER_NOT_ONBOARDED',
          message: 'The helper needs to add their PayPal email to their profile before you can pay.',
        },
      }
    }
    const { createCheckout } = await import('./paypal/checkout')
    const totalAmount = task.budget + serviceFee
    const result = await createCheckout(taskId, totalAmount, {
      returnUrl: returnUrl || defaultReturnUrl,
      cancelUrl: cancelUrl || defaultCancelUrl,
    })
    await supabase
      .from('tasks')
      .update({
        payment_provider: 'paypal',
        payment_intent_id: result.paymentIntentId,
        payment_status: 'pending',
      })
      .eq('id', taskId)
    return {
      id: result.paymentIntentId ?? result.id,
      paymentIntentId: result.paymentIntentId,
      amount: result.amount * 100,
      redirectUrl: result.approvalUrl,
      checkoutUrl: result.approvalUrl,
      next_action: result.approvalUrl ? { url: result.approvalUrl } : undefined,
    }
  }

  // Airwallex path
  if (!helperProfile.iban) {
    return {
      status: 400,
      body: {
        error: 'Helper has not set up their IBAN',
        code: 'HELPER_NOT_ONBOARDED',
        message: 'The helper needs to add their IBAN to their profile before you can pay.',
      },
    }
  }

  const totalAmountCents = Math.round((task.budget + serviceFee) * 100)
  const airwallexPayload = {
    amount: totalAmountCents,
    currency: 'EUR',
    merchant_order_id: `payment-${taskId}-${Date.now()}`,
    return_url: returnUrl || defaultReturnUrl,
    request_id: `req_${Date.now()}`,
    metadata: {
      task_id: taskId,
      helper_id: helperProfile.id,
      tasker_id: taskerId,
      base_amount: task.budget,
      service_fee: serviceFee,
    },
    payment_method_types: ['card', 'multibanco'],
  }

  const airwallexResponse = await fetch(`${baseUrl}/api/airwallex/create-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: cookieHeader },
    body: JSON.stringify(airwallexPayload),
  })

  const airwallexResult = await airwallexResponse.json()

  if (!airwallexResponse.ok) {
    return {
      status: airwallexResponse.status,
      body: {
        error: airwallexResult.error || 'Failed to create payment',
        details: airwallexResult.details,
      },
    }
  }

  const intentId = airwallexResult.id || airwallexResult.payment_intent_id
  const amountParam = airwallexResult.amount ?? totalAmountCents
  const checkoutPath = intentId
    ? `/checkout/${intentId}?taskId=${taskId}&amount=${amountParam}${airwallexResult.client_secret ? `&clientSecret=${encodeURIComponent(airwallexResult.client_secret)}` : ''}`
    : null
  const redirectUrl = airwallexResult.next_action?.url || checkoutPath

  return {
    id: intentId,
    paymentIntentId: intentId,
    amount: airwallexResult.amount ?? totalAmountCents,
    clientSecret: airwallexResult.client_secret,
    redirectUrl: redirectUrl || undefined,
    next_action: airwallexResult.next_action,
  }
}
