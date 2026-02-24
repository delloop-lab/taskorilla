/**
 * PayPal Simulate Payment (Sandbox/Testing only)
 * Marks a task as paid and optionally triggers helper payout for testing.
 * PayPal sandbox doesn't have a "simulate" API; we update DB directly like Airwallex simulate.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import { captureOrder } from './checkout'
import { createPayout } from './payout'

export interface SimulatePaymentParams {
  intentId: string
  taskId?: string
  action?: 'payment_succeeded'
}

export interface SimulatePaymentResult {
  success: boolean
  status?: string
  message?: string
  payout?: {
    success: boolean
    amount?: number
    payoutId?: string
    error?: string
  }
}

export async function simulatePayment(
  params: SimulatePaymentParams,
  supabase?: SupabaseClient
): Promise<SimulatePaymentResult> {
  const { intentId, taskId, action } = params
  const db = supabase ?? createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  try {
    // 1. Capture the PayPal order (if it was approved but not yet captured)
    try {
      await captureOrder(intentId)
    } catch (captureErr) {
      console.warn('[PayPal Simulate] Capture may have already completed:', captureErr)
    }

    // 2. Update task payment_status
    const updatePayload: Record<string, unknown> = {
      payment_status: 'paid',
      payment_intent_id: intentId,
      payment_provider: 'paypal',
    }
    const { data: updateData, error } = await db
      .from('tasks')
      .update(updatePayload)
      .eq('payment_intent_id', intentId)
      .select('id, payment_status')
      .limit(1)

    if (error && taskId) {
      const byTask = await db.from('tasks').update(updatePayload).eq('id', taskId).select('id').limit(1)
      if (byTask.error || !byTask.data?.length) {
        return {
          success: false,
          message: `Failed to update task: ${error.message}`,
        }
      }
    } else if (error && !taskId) {
      return {
        success: false,
        message: `Failed to update task: ${error.message}. Provide taskId to update by task.`,
      }
    }

    let payoutResult: SimulatePaymentResult['payout'] | undefined

    // 3. If taskId provided, try to create helper payout (like Airwallex simulate)
    if (taskId && action === 'payment_succeeded') {
      const { data: task } = await db
        .from('tasks')
        .select('assigned_to, budget')
        .eq('id', taskId)
        .single()

      if (task?.assigned_to && task.budget != null) {
        const budgetNum = typeof task.budget === 'number' ? task.budget : parseFloat(String(task.budget))
        const platformFee = Math.round(budgetNum * 0.1 * 100) / 100
        const payoutAmount = Math.round((budgetNum - platformFee) * 100) / 100

        const { data: profile } = await db
          .from('profiles')
          .select('email, paypal_email, full_name')
          .eq('id', task.assigned_to)
          .single()

        const paypalEmail = (profile as { paypal_email?: string; email?: string })?.paypal_email
          ?? (profile as { email?: string })?.email

        if (paypalEmail && payoutAmount > 0) {
          const payout = await createPayout(paypalEmail, payoutAmount, { taskId })
          if (payout.status === 'SUCCESS') {
            await db.from('payouts').insert({
              task_id: taskId,
              helper_id: task.assigned_to,
              amount: payoutAmount,
              currency: 'EUR',
              status: 'processing',
              paypal_payout_id: payout.payoutId,
              iban: `paypal:${paypalEmail}`,
            })
            payoutResult = {
              success: true,
              amount: payoutAmount,
              payoutId: payout.payoutId,
            }
          } else {
            payoutResult = {
              success: false,
              amount: payoutAmount,
              error: 'PayPal payout API failed',
            }
          }
        } else {
          payoutResult = {
            success: false,
            amount: payoutAmount,
            error: 'Helper has not set up PayPal email',
          }
        }
      }
    }

    return {
      success: true,
      status: 'paid',
      message: 'Payment simulated successfully',
      payout: payoutResult,
    }
  } catch (error) {
    console.error('[PayPal Simulate] Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Simulation failed',
    }
  }
}
