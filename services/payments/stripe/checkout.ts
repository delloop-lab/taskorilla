/**
 * Stripe Checkout Integration
 * 
 * Implements Stripe Checkout session creation with destination charges.
 * Applies Taskorilla fee rules:
 * - €2 tasker fee (charged to the person paying)
 * - 10% helper commission (platform takes from helper's earnings)
 * 
 * NOT wired into the app yet - these are internal functions only.
 */

import { stripeClient } from './stripeClient'
import { getOnboardingStatus } from './helpers'
import type Stripe from 'stripe'

/**
 * Fee configuration for Taskorilla
 */
export const TASKORILLA_FEES = {
  /** Fixed fee charged to tasker (in cents) */
  TASKER_FEE_CENTS: 200, // €2.00
  
  /** Platform commission percentage taken from helper earnings */
  HELPER_COMMISSION_PERCENT: 10, // 10%
  
  /** Default currency */
  DEFAULT_CURRENCY: 'eur',
} as const

/**
 * Parameters for creating a checkout session
 */
export interface CreateCheckoutSessionParams {
  /** Task ID from our database */
  taskId: string
  
  /** Task title for display */
  taskTitle: string
  
  /** Task budget amount in cents (e.g., 10000 = €100.00) */
  taskBudgetCents: number
  
  /** Helper's Stripe Connected Account ID */
  helperStripeAccountId: string
  
  /** Helper's internal user ID */
  helperId: string
  
  /** Tasker's internal user ID */
  taskerId: string
  
  /** URL to redirect after successful payment */
  successUrl: string
  
  /** URL to redirect if payment is cancelled */
  cancelUrl: string
  
  /** Currency (defaults to EUR) */
  currency?: string
  
  /** Tasker's email for receipt */
  taskerEmail?: string
}

/**
 * Result of creating a checkout session
 */
export interface CheckoutSessionResult {
  /** Stripe Checkout Session ID */
  sessionId: string
  
  /** URL to redirect the user to Stripe's hosted checkout */
  checkoutUrl: string
  
  /** Breakdown of the payment */
  breakdown: PaymentBreakdown
}

/**
 * Detailed breakdown of payment amounts
 */
export interface PaymentBreakdown {
  /** Original task budget in cents */
  taskBudgetCents: number
  
  /** Tasker fee in cents */
  taskerFeeCents: number
  
  /** Total amount charged to tasker in cents */
  totalChargeCents: number
  
  /** Platform commission from helper in cents */
  helperCommissionCents: number
  
  /** Total application fee (tasker fee + helper commission) in cents */
  applicationFeeCents: number
  
  /** Amount helper will receive in cents */
  helperReceivesCents: number
  
  /** Currency */
  currency: string
}

/**
 * Error thrown when helper onboarding is incomplete
 */
export class HelperNotOnboardedError extends Error {
  constructor(
    public readonly stripeAccountId: string,
    public readonly onboardingStatus: {
      detailsSubmitted: boolean
      chargesEnabled: boolean
      payoutsEnabled: boolean
    }
  ) {
    super(
      `Helper account ${stripeAccountId} has not completed Stripe onboarding. ` +
      `Details submitted: ${onboardingStatus.detailsSubmitted}, ` +
      `Charges enabled: ${onboardingStatus.chargesEnabled}, ` +
      `Payouts enabled: ${onboardingStatus.payoutsEnabled}`
    )
    this.name = 'HelperNotOnboardedError'
  }
}

/**
 * Calculate payment breakdown based on task budget
 * 
 * @param taskBudgetCents - Task budget in cents
 * @param currency - Currency code
 * @returns Detailed payment breakdown
 */
export function calculatePaymentBreakdown(
  taskBudgetCents: number,
  currency: string = TASKORILLA_FEES.DEFAULT_CURRENCY
): PaymentBreakdown {
  // Tasker fee is fixed at €2
  const taskerFeeCents = TASKORILLA_FEES.TASKER_FEE_CENTS
  
  // Total charged to tasker = task budget + tasker fee
  const totalChargeCents = taskBudgetCents + taskerFeeCents
  
  // Helper commission = 10% of task budget
  const helperCommissionCents = Math.round(
    taskBudgetCents * (TASKORILLA_FEES.HELPER_COMMISSION_PERCENT / 100)
  )
  
  // Application fee = tasker fee + helper commission
  // This is what the platform keeps
  const applicationFeeCents = taskerFeeCents + helperCommissionCents
  
  // Helper receives = task budget - commission
  const helperReceivesCents = taskBudgetCents - helperCommissionCents
  
  return {
    taskBudgetCents,
    taskerFeeCents,
    totalChargeCents,
    helperCommissionCents,
    applicationFeeCents,
    helperReceivesCents,
    currency,
  }
}

/**
 * Create a Stripe Checkout session for task payment
 * 
 * Uses destination charges where:
 * - Payment is processed on platform account
 * - Funds are immediately transferred to helper's connected account
 * - Platform keeps the application fee (tasker fee + helper commission)
 * 
 * @param params - Checkout session parameters
 * @returns Checkout session details including redirect URL
 * @throws HelperNotOnboardedError if helper hasn't completed Stripe onboarding
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<CheckoutSessionResult> {
  const {
    taskId,
    taskTitle,
    taskBudgetCents,
    helperStripeAccountId,
    helperId,
    taskerId,
    successUrl,
    cancelUrl,
    currency = TASKORILLA_FEES.DEFAULT_CURRENCY,
    taskerEmail,
  } = params

  // Check if helper has completed onboarding
  const onboardingStatus = await getOnboardingStatus(helperStripeAccountId)
  
  if (!onboardingStatus.isFullyOnboarded) {
    throw new HelperNotOnboardedError(helperStripeAccountId, {
      detailsSubmitted: onboardingStatus.detailsSubmitted,
      chargesEnabled: onboardingStatus.chargesEnabled,
      payoutsEnabled: onboardingStatus.payoutsEnabled,
    })
  }

  // Calculate payment breakdown
  const breakdown = calculatePaymentBreakdown(taskBudgetCents, currency)

  // Create Stripe Checkout Session with destination charge
  const session = await stripeClient.checkout.sessions.create({
    mode: 'payment',
    
    // Line items shown on checkout page
    line_items: [
      {
        price_data: {
          currency: currency,
          product_data: {
            name: taskTitle,
            description: `Task payment for: ${taskTitle}`,
          },
          unit_amount: breakdown.taskBudgetCents,
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: currency,
          product_data: {
            name: 'Service Fee',
            description: 'Taskorilla platform fee',
          },
          unit_amount: breakdown.taskerFeeCents,
        },
        quantity: 1,
      },
    ],

    // Payment intent configuration for destination charge
    payment_intent_data: {
      // Application fee goes to platform
      application_fee_amount: breakdown.applicationFeeCents,
      
      // Transfer remaining funds to helper's connected account
      transfer_data: {
        destination: helperStripeAccountId,
      },
      
      // Metadata for tracking
      metadata: {
        task_id: taskId,
        helper_id: helperId,
        tasker_id: taskerId,
        task_budget_cents: String(breakdown.taskBudgetCents),
        tasker_fee_cents: String(breakdown.taskerFeeCents),
        helper_commission_cents: String(breakdown.helperCommissionCents),
        helper_receives_cents: String(breakdown.helperReceivesCents),
        platform: 'taskorilla',
      },
    },

    // Redirect URLs - handle URLs that may already have query params
    success_url: successUrl.includes('?') 
      ? `${successUrl}&session_id={CHECKOUT_SESSION_ID}`
      : `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,

    // Optional: pre-fill customer email
    ...(taskerEmail && { customer_email: taskerEmail }),

    // Session metadata
    metadata: {
      task_id: taskId,
      helper_id: helperId,
      tasker_id: taskerId,
      platform: 'taskorilla',
    },
  })

  if (!session.url) {
    throw new Error('Failed to create checkout session: no URL returned')
  }

  return {
    sessionId: session.id,
    checkoutUrl: session.url,
    breakdown,
  }
}

/**
 * Retrieve a checkout session by ID
 * 
 * @param sessionId - Stripe Checkout Session ID
 * @returns The checkout session object
 */
export async function getCheckoutSession(
  sessionId: string
): Promise<Stripe.Checkout.Session> {
  return await stripeClient.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent', 'line_items'],
  })
}

/**
 * Get the payment status for a checkout session
 * 
 * @param sessionId - Stripe Checkout Session ID
 * @returns Payment status details
 */
export async function getCheckoutSessionStatus(
  sessionId: string
): Promise<{
  status: Stripe.Checkout.Session.Status | null
  paymentStatus: Stripe.Checkout.Session.PaymentStatus
  amountTotal: number | null
  currency: string | null
}> {
  const session = await stripeClient.checkout.sessions.retrieve(sessionId)
  
  return {
    status: session.status,
    paymentStatus: session.payment_status,
    amountTotal: session.amount_total,
    currency: session.currency,
  }
}

/**
 * Format amount from cents to display string
 * 
 * @param amountCents - Amount in cents
 * @param currency - Currency code
 * @returns Formatted amount string (e.g., "€10.00")
 */
export function formatAmountForDisplay(
  amountCents: number,
  currency: string = 'eur'
): string {
  const amount = amountCents / 100
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount)
}
