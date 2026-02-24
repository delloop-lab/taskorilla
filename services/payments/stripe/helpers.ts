/**
 * Stripe Helper Onboarding Functions
 * 
 * This module handles Stripe Connect onboarding for helpers who receive payouts.
 * Uses Stripe Connect Express accounts with the Express Dashboard.
 * 
 * NOT exposed to UI yet - these are internal functions only.
 */

import { stripeClient } from './stripeClient'
import type Stripe from 'stripe'

/**
 * Result of creating a connected account
 */
export interface CreateConnectedAccountResult {
  accountId: string
  account: Stripe.Account
}

/**
 * Result of creating an onboarding link
 */
export interface OnboardingLinkResult {
  url: string
  expiresAt: Date
}

/**
 * Onboarding status for a connected account
 */
export interface OnboardingStatus {
  accountId: string
  detailsSubmitted: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
  requirements: {
    currentlyDue: string[]
    eventuallyDue: string[]
    pastDue: string[]
    pendingVerification: string[]
  }
  isFullyOnboarded: boolean
}

/**
 * Create a Stripe Connected Account for a helper
 * 
 * Uses Express account type with Express Dashboard access.
 * The helper will complete onboarding through Stripe's hosted flow.
 * 
 * @param helperId - The internal helper/user ID from our database
 * @param email - Helper's email address
 * @param country - Two-letter ISO country code (e.g., 'IE', 'US', 'GB')
 * @returns The created account details including the Stripe account ID
 */
export async function createConnectedAccount(
  helperId: string,
  email: string,
  country: string = 'IE'
): Promise<CreateConnectedAccountResult> {
  const account = await stripeClient.accounts.create({
    type: 'express',
    country: country.toUpperCase(),
    email: email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
    metadata: {
      helper_id: helperId,
      platform: 'taskorilla',
    },
    settings: {
      payouts: {
        schedule: {
          interval: 'manual', // Platform controls when payouts happen
        },
      },
    },
  })

  return {
    accountId: account.id,
    account,
  }
}

/**
 * Create an onboarding link for a helper to complete Stripe Connect setup
 * 
 * This generates a URL that redirects the helper to Stripe's hosted
 * onboarding flow where they can provide required information.
 * 
 * @param stripeAccountId - The Stripe Connected Account ID
 * @param refreshUrl - URL to redirect if the link expires or user needs to restart
 * @param returnUrl - URL to redirect after successful onboarding
 * @returns The onboarding URL and expiration time
 */
export async function createOnboardingLink(
  stripeAccountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<OnboardingLinkResult> {
  const accountLink = await stripeClient.accountLinks.create({
    account: stripeAccountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
    collection_options: {
      fields: 'eventually_due',
      future_requirements: 'include',
    },
  })

  return {
    url: accountLink.url,
    expiresAt: new Date(accountLink.expires_at * 1000),
  }
}

/**
 * Create a login link for a helper to access their Express Dashboard
 * 
 * This allows helpers to view their balance, payouts, and earnings.
 * Only works for accounts that have completed onboarding.
 * 
 * @param stripeAccountId - The Stripe Connected Account ID
 * @returns The dashboard login URL
 */
export async function createDashboardLoginLink(
  stripeAccountId: string
): Promise<string> {
  const loginLink = await stripeClient.accounts.createLoginLink(stripeAccountId)
  return loginLink.url
}

/**
 * Fetch the current onboarding status for a connected account
 * 
 * Queries Stripe directly to get the latest account status.
 * Use this to check if a helper has completed onboarding.
 * 
 * @param stripeAccountId - The Stripe Connected Account ID
 * @returns The current onboarding status
 */
export async function getOnboardingStatus(
  stripeAccountId: string
): Promise<OnboardingStatus> {
  const account = await stripeClient.accounts.retrieve(stripeAccountId)

  const isFullyOnboarded = Boolean(
    account.details_submitted &&
    account.charges_enabled &&
    account.payouts_enabled
  )

  return {
    accountId: account.id,
    detailsSubmitted: account.details_submitted ?? false,
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    requirements: {
      currentlyDue: account.requirements?.currently_due ?? [],
      eventuallyDue: account.requirements?.eventually_due ?? [],
      pastDue: account.requirements?.past_due ?? [],
      pendingVerification: account.requirements?.pending_verification ?? [],
    },
    isFullyOnboarded,
  }
}

/**
 * Check if a connected account can receive payouts
 * 
 * Quick check to determine if a helper is ready to receive payments.
 * 
 * @param stripeAccountId - The Stripe Connected Account ID
 * @returns True if the account can receive payouts
 */
export async function canReceivePayouts(
  stripeAccountId: string
): Promise<boolean> {
  const status = await getOnboardingStatus(stripeAccountId)
  return status.payoutsEnabled
}

/**
 * Get the connected account details
 * 
 * Retrieves the full Stripe account object for a connected account.
 * 
 * @param stripeAccountId - The Stripe Connected Account ID
 * @returns The Stripe Account object
 */
export async function getConnectedAccount(
  stripeAccountId: string
): Promise<Stripe.Account> {
  return await stripeClient.accounts.retrieve(stripeAccountId)
}

/**
 * Update a connected account's metadata
 * 
 * @param stripeAccountId - The Stripe Connected Account ID
 * @param metadata - Key-value pairs to store on the account
 */
export async function updateAccountMetadata(
  stripeAccountId: string,
  metadata: Record<string, string>
): Promise<Stripe.Account> {
  return await stripeClient.accounts.update(stripeAccountId, {
    metadata,
  })
}
