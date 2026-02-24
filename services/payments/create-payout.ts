/**
 * Create Payout - Provider orchestration
 * All provider selection logic lives here. Routes must not contain provider conditionals.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { isStripeEnabled, isAirwallexEnabled, isPayPalEnabled, getProviderNotEnabledError } from '@/lib/payment-provider'

export interface CreatePayoutParams {
  taskId?: string
  helperId?: string
  amount: number
  currency?: string
  iban?: string
  accountHolderName?: string
  paypalEmail?: string
  idempotencyKey?: string
  simulatePayout?: boolean
  [key: string]: unknown
}

export type CreatePayoutResult =
  | { success: true; payoutId?: string | null; amount?: number; currency?: string; status?: string; simulated?: boolean; message?: string }
  | { status: 503; body: ReturnType<typeof getProviderNotEnabledError> }
  | { status: number; body: { error: string; details?: unknown } }

export async function executeCreatePayout(
  params: CreatePayoutParams,
  requestContext: { cookieHeader: string; baseUrl: string; supabase?: SupabaseClient }
): Promise<CreatePayoutResult> {
  const { cookieHeader, baseUrl, supabase } = requestContext

  if (isStripeEnabled()) {
    return {
      success: true,
      payoutId: null,
      message: 'Payout will be processed automatically via the payment provider',
    }
  }

  if (isPayPalEnabled()) {
    let paypalEmail = params.paypalEmail
    if (!paypalEmail && (params.helperId || params.taskId) && supabase) {
      let helperId = params.helperId
      if (!helperId && params.taskId) {
        const { data: task } = await supabase
          .from('tasks')
          .select('assigned_to')
          .eq('id', params.taskId)
          .single()
        helperId = task?.assigned_to
      }
      if (helperId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, paypal_email')
          .eq('id', helperId)
          .single()
        const p = profile as { paypal_email?: string; email?: string } | null
        paypalEmail = p?.paypal_email ?? p?.email ?? ''
      }
    }
    if (!paypalEmail) {
      return {
        status: 400,
        body: {
          error: 'Helper has not set up PayPal email',
          details: 'The helper needs to add their PayPal email to their profile to receive payouts.',
        },
      }
    }
    const { createPayout } = await import('./paypal/payout')
    const result = await createPayout(paypalEmail, params.amount, { taskId: params.taskId })
    if (result.status === 'SUCCESS' && supabase && params.taskId && params.helperId) {
      const paypalEnv = process.env.PAYPAL_ENV || 'sandbox'
      const payoutStatusForTask = paypalEnv === 'production' ? 'processing' : 'simulated'
      const currency = params.currency || 'EUR'
      await supabase.from('payouts').insert({
        task_id: params.taskId,
        helper_id: params.helperId,
        amount: params.amount,
        currency,
        status: 'processing',
        paypal_payout_id: result.payoutId,
        iban: `paypal:${paypalEmail}`, // PayPal uses email; iban column required, stores recipient identifier
      })
      // Keep task payout status in sync so UI does not remain stuck at "Pending".
      await supabase
        .from('tasks')
        .update({
          payout_id: result.payoutId || null,
          payout_status: payoutStatusForTask,
        })
        .eq('id', params.taskId)
    }
    if (result.status === 'SUCCESS') {
      return {
        success: true,
        payoutId: result.payoutId || null,
        amount: params.amount,
        status: result.status,
        message: 'Payout initiated',
      }
    }
    return {
      status: 500,
      body: { error: 'PayPal payout failed', details: result.payoutId ? `Batch ${result.payoutId}` : 'Unknown error' },
    }
  }

  if (!isAirwallexEnabled()) {
    return { status: 503, body: getProviderNotEnabledError('airwallex') }
  }

  const response = await fetch(`${baseUrl}/api/airwallex/create-payout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: cookieHeader },
    body: JSON.stringify(params),
  })

  const data = await response.json()

  if (!response.ok) {
    return {
      status: response.status,
      body: { error: data.error || 'Failed to create payout', details: data.details },
    }
  }

  return {
    success: true,
    payoutId: data.payoutId || data.id,
    amount: data.amount,
    currency: data.currency,
    status: data.status,
    simulated: data.simulated,
    message: data.message,
  }
}
