import { NextResponse } from 'next/server'

/**
 * Confirm Airwallex payment
 * POST /api/airwallex/confirm-payment
 * 
 * This endpoint confirms a payment intent with payment method details
 */
export async function POST(req: Request) {
  try {
    // Validate API key is configured
    if (!process.env.AIRWALLEX_API_KEY) {
      console.error('[API Route] AIRWALLEX_API_KEY is not set')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { payment_intent_id, client_secret, payment_method } = body

    if (!payment_intent_id) {
      return NextResponse.json(
        { error: 'Missing payment_intent_id' },
        { status: 400 }
      )
    }

    console.log('[Confirm Payment] Confirming payment:', payment_intent_id)

    // Step 1: Authenticate
    const authUrl = process.env.AIRWALLEX_ENVIRONMENT === 'production'
      ? 'https://api.airwallex.com/api/v1/authentication/login'
      : 'https://api-demo.airwallex.com/api/v1/authentication/login'
    
    console.log('[Confirm Payment] Step 1: AUTH REQUEST')
    console.log('[Confirm Payment]   URL:', authUrl)
    console.log('[Confirm Payment]   Method: POST')
    
    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.AIRWALLEX_CLIENT_ID || '',
        'x-api-key': process.env.AIRWALLEX_API_KEY || '',
      },
    })
    
    const authText = await authResponse.text()
    console.log('[Confirm Payment] AUTH RESPONSE')
    console.log('[Confirm Payment]   Status:', authResponse.status)
    console.log('[Confirm Payment]   Raw (first 200):', authText.substring(0, 200))
    
    let authData
    try {
      authData = JSON.parse(authText)
    } catch {
      console.error('[Confirm Payment] Auth response is not JSON')
      return NextResponse.json(
        { error: 'Invalid auth response', details: authText.substring(0, 200) },
        { status: 500 }
      )
    }
    
    if (!authResponse.ok) {
      console.error('[Confirm Payment] Auth failed:', authData)
      return NextResponse.json(
        { error: 'Authentication failed', details: authData },
        { status: 401 }
      )
    }
    
    const authToken = authData.token
    console.log('[Confirm Payment] Auth successful, token received')

    // Step 2: Confirm the payment intent
    const confirmUrl = process.env.AIRWALLEX_ENVIRONMENT === 'production'
      ? `https://api.airwallex.com/api/v1/pa/payment_intents/${payment_intent_id}/confirm`
      : `https://api-demo.airwallex.com/api/v1/pa/payment_intents/${payment_intent_id}/confirm`

    const confirmPayload: any = {
      request_id: `confirm_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    }

    // Add payment method if provided
    if (payment_method) {
      confirmPayload.payment_method = payment_method
    }

    console.log('[Confirm Payment] Step 2: CONFIRM REQUEST')
    console.log('[Confirm Payment]   URL:', confirmUrl)
    console.log('[Confirm Payment]   Method: POST')
    console.log('[Confirm Payment]   Payload:', JSON.stringify(confirmPayload))

    const confirmResponse = await fetch(confirmUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(confirmPayload),
    })

    const confirmText = await confirmResponse.text()
    console.log('[Confirm Payment] CONFIRM RESPONSE')
    console.log('[Confirm Payment]   Status:', confirmResponse.status)
    console.log('[Confirm Payment]   Raw (first 200):', confirmText.substring(0, 200))
    
    let confirmData
    try {
      confirmData = JSON.parse(confirmText)
    } catch {
      console.error('[Confirm Payment] Confirm response is not JSON')
      return NextResponse.json(
        { error: 'Invalid confirm response', details: confirmText.substring(0, 200) },
        { status: 500 }
      )
    }

    if (!confirmResponse.ok) {
      console.error('[Confirm Payment] Confirm failed:', confirmData)
      return NextResponse.json(
        { error: 'Payment confirmation failed', details: confirmData },
        { status: confirmResponse.status }
      )
    }

    console.log('[Confirm Payment] Payment confirmed successfully')
    return NextResponse.json(confirmData)

  } catch (err: any) {
    console.error('[Confirm Payment] Error:', err)
    return NextResponse.json(
      { error: 'Server error', details: err.message },
      { status: 500 }
    )
  }
}

