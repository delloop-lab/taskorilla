import { NextResponse } from 'next/server'

/**
 * Create Airwallex Checkout Session with Hosted Payment Page
 * POST /api/airwallex/create-checkout
 * 
 * This creates a payment intent and returns a hosted checkout URL
 * where users can choose from multiple payment methods
 */
export async function POST(req: Request) {
  try {
    if (!process.env.AIRWALLEX_API_KEY || !process.env.AIRWALLEX_CLIENT_ID) {
      console.error('[Create Checkout] Airwallex credentials not set')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { amount, currency = 'EUR', taskId, taskTitle, returnUrl } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount is required and must be greater than 0' },
        { status: 400 }
      )
    }

    if (!returnUrl) {
      return NextResponse.json(
        { error: 'Return URL is required' },
        { status: 400 }
      )
    }

    console.log('[Create Checkout] Creating checkout session for:', { amount, currency, taskId })

    // Step 1: Authenticate
    const authUrl = process.env.AIRWALLEX_ENVIRONMENT === 'production'
      ? 'https://api.airwallex.com/api/v1/authentication/login'
      : 'https://api-demo.airwallex.com/api/v1/authentication/login'

    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.AIRWALLEX_CLIENT_ID || '',
        'x-api-key': process.env.AIRWALLEX_API_KEY || '',
      },
    })

    const authData = await authResponse.json()
    if (!authResponse.ok) {
      console.error('[Create Checkout] Auth failed:', authData)
      return NextResponse.json(
        { error: 'Authentication failed', details: authData },
        { status: 401 }
      )
    }

    const authToken = authData.token

    // Step 2: Create Payment Intent
    const request_id = `checkout_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    const paymentIntentPayload = {
      request_id,
      amount,
      currency: currency.toUpperCase(),
      merchant_order_id: `task-${taskId}-${Date.now()}`,
      return_url: returnUrl,
      // Multiple payment methods for hosted page
      payment_method_types: ['card'],
      // Metadata for tracking
      metadata: {
        task_id: taskId,
        task_title: taskTitle || '',
      },
      // Auto capture on confirmation
      capture_method: 'automatic',
    }

    const baseUrl = process.env.AIRWALLEX_ENVIRONMENT === 'production'
      ? 'https://api.airwallex.com'
      : 'https://api-demo.airwallex.com'

    const piResponse = await fetch(`${baseUrl}/api/v1/pa/payment_intents/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(paymentIntentPayload),
    })

    const piData = await piResponse.json()
    console.log('[Create Checkout] Payment Intent response:', piData)

    if (!piResponse.ok) {
      console.error('[Create Checkout] Payment Intent failed:', piData)
      return NextResponse.json(
        { error: 'Failed to create payment intent', details: piData },
        { status: piResponse.status }
      )
    }

    // Step 3: Generate Hosted Payment Page URL
    // Airwallex provides a checkout page URL based on the payment intent
    const checkoutBaseUrl = process.env.AIRWALLEX_ENVIRONMENT === 'production'
      ? 'https://checkout.airwallex.com'
      : 'https://checkout-demo.airwallex.com'

    // The hosted payment page URL format
    const hostedCheckoutUrl = `${checkoutBaseUrl}/checkout?client_secret=${piData.client_secret}&intent_id=${piData.id}&mode=payment`

    console.log('[Create Checkout] Generated checkout URL:', hostedCheckoutUrl)

    return NextResponse.json({
      success: true,
      paymentIntentId: piData.id,
      clientSecret: piData.client_secret,
      // Option 1: Use our custom checkout page
      customCheckoutUrl: `/checkout/${piData.id}?taskId=${taskId}&amount=${amount}&clientSecret=${piData.client_secret}`,
      // Option 2: Use Airwallex hosted checkout (if available)
      hostedCheckoutUrl,
      amount,
      currency: currency.toUpperCase(),
    })

  } catch (err: any) {
    console.error('[Create Checkout] Error:', err)
    return NextResponse.json(
      { error: 'Server error', details: err.message },
      { status: 500 }
    )
  }
}




