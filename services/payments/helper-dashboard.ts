/**
 * Helper Dashboard - Provider orchestration
 * All provider selection logic lives here. Routes must not contain provider conditionals.
 */

import { isStripeEnabled } from '@/lib/payment-provider'

export interface HelperDashboardParams {
  profile: { id: string; is_helper: boolean; stripe_account_id: string | null; iban: string | null }
}

export type HelperDashboardResult =
  | { success: true; data: object }
  | { status: 400; body: object }

export async function executeHelperDashboard(
  params: HelperDashboardParams
): Promise<HelperDashboardResult> {
  const { profile } = params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (isStripeEnabled()) {
    if (!profile.stripe_account_id) {
      return {
        status: 400,
        body: {
          provider: 'stripe',
          error: 'Payment account not set up',
          setupRequired: true,
          setupUrl: `${baseUrl}/profile/payouts`,
        },
      }
    }

    const { getOnboardingStatus, createDashboardLoginLink } = await import('./stripe/helpers')
    const status = await getOnboardingStatus(profile.stripe_account_id)

    if (!status.isFullyOnboarded) {
      return {
        status: 400,
        body: {
          provider: 'stripe',
          error: 'Payment account onboarding not complete',
          onboardingRequired: true,
          onboardingStatus: status,
          setupUrl: `${baseUrl}/profile/payouts`,
        },
      }
    }

    const dashboardUrl = await createDashboardLoginLink(profile.stripe_account_id)

    return {
      success: true,
      data: {
        provider: 'stripe',
        dashboardUrl,
        message: 'Redirect user to dashboardUrl to access payment dashboard',
      },
    }
  }

  return {
    success: true,
    data: {
      provider: 'airwallex',
      dashboardUrl: `${baseUrl}/profile/payouts`,
      message: 'View payouts in your profile',
    },
  }
}
