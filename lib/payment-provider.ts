/**
 * Payment Provider Configuration
 *
 * This module provides utilities for switching between payment providers.
 * Currently supports: 'airwallex', 'stripe', and 'paypal'
 *
 * Set PAYMENT_PROVIDER environment variable to control which provider is active.
 * Default: 'airwallex' (for backward compatibility)
 */

export type PaymentProvider = 'airwallex' | 'stripe' | 'paypal'

/**
 * Get the currently configured payment provider
 * Defaults to 'airwallex' if not set (backward compatibility)
 */
export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER?.toLowerCase()

  if (provider === 'stripe') return 'stripe'
  if (provider === 'paypal') return 'paypal'

  return 'airwallex'
}

/**
 * Check if PayPal is the active payment provider
 */
export function isPayPalEnabled(): boolean {
  return getPaymentProvider() === 'paypal'
}

/**
 * Check if Airwallex is the active payment provider
 */
export function isAirwallexEnabled(): boolean {
  return getPaymentProvider() === 'airwallex'
}

/**
 * Check if Stripe is the active payment provider
 */
export function isStripeEnabled(): boolean {
  return getPaymentProvider() === 'stripe'
}

/**
 * Get a standardized error response for when a payment provider is not enabled
 */
export function getProviderNotEnabledError(requestedProvider: PaymentProvider) {
  const currentProvider = getPaymentProvider()
  return {
    error: 'Payment provider not enabled',
    details: `This endpoint requires ${requestedProvider} but the current payment provider is set to '${currentProvider}'. Set PAYMENT_PROVIDER=${requestedProvider} in your environment to enable this endpoint.`,
    currentProvider,
    requestedProvider,
  }
}

/**
 * Log payment provider status (for debugging)
 */
export function logPaymentProviderStatus(context: string): void {
  const provider = getPaymentProvider()
  console.log(`[${context}] Payment provider: ${provider}`)
}

/**
 * Get full provider configuration for API responses.
 * All provider selection logic is centralized here.
 */
export function getProviderConfig() {
  const provider = getPaymentProvider()
  return {
    provider,
    isStripeEnabled: isStripeEnabled(),
    isAirwallexEnabled: isAirwallexEnabled(),
    isPayPalEnabled: isPayPalEnabled(),
    message: `Payment provider is set to '${provider}'`,
  }
}
