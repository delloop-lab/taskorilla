/**
 * Helper Onboarding - Provider orchestration
 * All provider selection logic lives here. Routes must not contain provider conditionals.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { isStripeEnabled, isPayPalEnabled } from '@/lib/payment-provider'

export interface OnboardingPostParams {
  userId: string
  userEmail: string | null | undefined
  profile: { id: string; email: string | null; full_name: string | null; is_helper: boolean; stripe_account_id: string | null; iban: string | null; paypal_email?: string | null }
  body?: { country?: string; paypal_email?: string }
}

export interface OnboardingGetParams {
  profile: { id: string; is_helper: boolean; stripe_account_id: string | null; iban: string | null; paypal_email?: string | null }
}

export type OnboardingPostResult =
  | { success: true; data: object }
  | { status: number; body: object }

export type OnboardingGetResult =
  | { success: true; data: object }
  | { status: number; body: object }

export async function executeHelperOnboardingPost(
  supabase: SupabaseClient,
  params: OnboardingPostParams
): Promise<OnboardingPostResult> {
  const { userId, userEmail, profile, body } = params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (isStripeEnabled()) {
    const { createConnectedAccount, createOnboardingLink } = await import('./stripe/helpers')

    let stripeAccountId = profile.stripe_account_id

    if (!stripeAccountId) {
      const country = body?.country || 'IE'
      const { accountId } = await createConnectedAccount(userId, profile.email || userEmail || '', country)
      stripeAccountId = accountId

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', userId)

      if (updateError) {
        console.error('[Helper Onboarding] Failed to save Stripe account ID:', updateError)
      }
    }

    const { url, expiresAt } = await createOnboardingLink(
      stripeAccountId,
      `${baseUrl}/profile/payouts?refresh=true`,
      `${baseUrl}/profile/payouts?onboarding=complete`
    )

    return {
      success: true,
      data: {
        provider: 'stripe',
        stripeAccountId,
        onboardingUrl: url,
        expiresAt: expiresAt.toISOString(),
        message: 'Redirect user to onboardingUrl to complete Stripe setup',
      },
    }
  }

  if (isPayPalEnabled()) {
    const paypalEmail = body?.paypal_email || profile.paypal_email

    if (paypalEmail && paypalEmail !== profile.paypal_email) {
      await supabase
        .from('profiles')
        .update({ paypal_email: paypalEmail })
        .eq('id', userId)
    }

    return {
      success: true,
      data: {
        provider: 'paypal',
        hasPaypalEmail: Boolean(paypalEmail || profile.paypal_email),
        message: paypalEmail || profile.paypal_email
          ? 'PayPal email is configured. Helper can receive payouts.'
          : 'Please add your PayPal email in your profile to receive payouts.',
        setupUrl: '/profile',
      },
    }
  }

  return {
    success: true,
    data: {
      provider: 'airwallex',
      hasIban: Boolean(profile.iban),
      message: profile.iban
        ? 'IBAN is configured. Helper can receive payouts.'
        : 'Please add your IBAN in your profile to receive payouts.',
      setupUrl: '/profile',
    },
  }
}

export async function executeHelperOnboardingGet(
  params: OnboardingGetParams
): Promise<OnboardingGetResult> {
  const { profile } = params

  if (isStripeEnabled()) {
    if (!profile.stripe_account_id) {
      return {
        success: true,
        data: {
          provider: 'stripe',
          onboarded: false,
          message: 'Payment account not created. Call POST to start onboarding.',
        },
      }
    }

    const { getOnboardingStatus } = await import('./stripe/helpers')
    const status = await getOnboardingStatus(profile.stripe_account_id)

    return {
      success: true,
      data: {
        provider: 'stripe',
        stripeAccountId: profile.stripe_account_id,
        onboarded: status.isFullyOnboarded,
        detailsSubmitted: status.detailsSubmitted,
        chargesEnabled: status.chargesEnabled,
        payoutsEnabled: status.payoutsEnabled,
        requirements: status.requirements,
      },
    }
  }

  if (isPayPalEnabled()) {
    return {
      success: true,
      data: {
        provider: 'paypal',
        onboarded: Boolean(profile.paypal_email),
        hasPaypalEmail: Boolean(profile.paypal_email),
        message: profile.paypal_email
          ? 'PayPal email is configured. Helper can receive payouts.'
          : 'Please add your PayPal email in your profile to receive payouts.',
      },
    }
  }

  return {
    success: true,
    data: {
      provider: 'airwallex',
      onboarded: Boolean(profile.iban),
      hasIban: Boolean(profile.iban),
      message: profile.iban
        ? 'IBAN is configured. Helper can receive payouts.'
        : 'Please add your IBAN in your profile to receive payouts.',
    },
  }
}
