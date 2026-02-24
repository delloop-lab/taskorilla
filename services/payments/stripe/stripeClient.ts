/**
 * Stripe Client Configuration
 * 
 * Lazy-loaded Stripe client instance for use across the application.
 * Only initializes when first accessed (prevents crashes when PAYMENT_PROVIDER=airwallex).
 * Reads API key from STRIPE_SECRET_KEY environment variable.
 */

import Stripe from 'stripe'

let _stripeClient: Stripe | null = null

/**
 * Get the Stripe client instance (lazy initialization)
 * 
 * This ensures the app doesn't crash on startup if STRIPE_SECRET_KEY is not set,
 * allowing Airwallex to work without Stripe configuration.
 * 
 * @throws Error if STRIPE_SECRET_KEY is not set when called
 */
function getStripeClient(): Stripe {
  if (_stripeClient) {
    return _stripeClient
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY

  if (!stripeSecretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set in environment variables. ' +
      'Please add STRIPE_SECRET_KEY to your .env.local file.'
    )
  }

  _stripeClient = new Stripe(stripeSecretKey, {
    typescript: true,
  })

  return _stripeClient
}

/**
 * Configured Stripe client instance (lazy-loaded)
 * 
 * Usage:
 *   import { stripeClient } from '@/services/payments/stripe/stripeClient'
 *   const paymentIntent = await stripeClient.paymentIntents.create({ ... })
 * 
 * Note: This is a getter that initializes on first access. Will throw if
 * STRIPE_SECRET_KEY is not configured.
 */
export const stripeClient = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripeClient()
    const value = (client as any)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})

/**
 * Check if Stripe client can be initialized
 * (i.e., STRIPE_SECRET_KEY is set)
 */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}
