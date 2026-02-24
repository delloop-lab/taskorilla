/**
 * PayPal Helper Onboarding / Account Linking
 *
 * PayPal Payouts sends money to a recipient's PayPal account by email.
 * There is no Connect-style onboarding: helpers add their PayPal email in their profile.
 * These helpers expose URLs for profile setup and optional PayPal account creation.
 */

export interface PayPalOnboardingUrls {
  setupUrl: string
  returnUrl: string
  refreshUrl: string
  payPalSignupUrl: string
}

const PAYPAL_SIGNUP_URL = 'https://www.paypal.com/signup'
const PAYPAL_SANDBOX_SIGNUP_URL = 'https://www.sandbox.paypal.com/signup'

/**
 * Get return URL for PayPal flows (e.g. after adding PayPal email in profile)
 */
export function getReturnUrl(baseUrl: string, path = '/profile/payouts'): string {
  const base = baseUrl.replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}?onboarding=complete`
}

/**
 * Get refresh URL for PayPal flows (e.g. if user needs to retry or link expires)
 */
export function getRefreshUrl(baseUrl: string, path = '/profile/payouts'): string {
  const base = baseUrl.replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}?refresh=true`
}

/**
 * Get the URL where helpers add their PayPal email (profile payouts section)
 */
export function getSetupUrl(baseUrl: string, path = '/profile/payouts'): string {
  const base = baseUrl.replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * Get PayPal sign-up URL for helpers who don't have an account
 */
export function getPayPalSignupUrl(): string {
  return process.env.PAYPAL_ENV === 'production' ? PAYPAL_SIGNUP_URL : PAYPAL_SANDBOX_SIGNUP_URL
}

/**
 * Get all onboarding-related URLs for PayPal helpers
 *
 * @param baseUrl - App base URL (e.g. NEXT_PUBLIC_APP_URL or request origin)
 */
export function getOnboardingUrls(baseUrl: string, profilePath = '/profile/payouts'): PayPalOnboardingUrls {
  return {
    setupUrl: getSetupUrl(baseUrl, profilePath),
    returnUrl: getReturnUrl(baseUrl, profilePath),
    refreshUrl: getRefreshUrl(baseUrl, profilePath),
    payPalSignupUrl: getPayPalSignupUrl(),
  }
}
