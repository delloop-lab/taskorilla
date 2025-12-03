import { NextResponse } from 'next/server'

/**
 * Create Airwallex payment
 * POST /api/airwallex/create-payment
 * 
 * Server-side only - API key is never exposed to frontend
 */
export async function POST(req: Request) {
  try {
    // Validate API key is configured
    if (!process.env.AIRWALLEX_API_KEY) {
      console.error('[API Route] AIRWALLEX_API_KEY is not set in environment variables')
      return NextResponse.json(
        { 
          error: 'Server configuration error', 
          details: 'AIRWALLEX_API_KEY environment variable is not set. Please add it to .env.local and restart the server.' 
        },
        { status: 500 }
      )
    }

    // Parse request body
    let body
    try {
      body = await req.json()
    } catch (parseError: any) {
      console.error('[API Route] Failed to parse request body:', parseError)
      return NextResponse.json(
        { error: 'Invalid request body', details: 'Request body must be valid JSON' },
        { status: 400 }
      )
    }

    const { amount, currency, merchant_order_id, return_url, customer_id } = body

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount', details: 'amount is required and must be greater than 0' },
        { status: 400 }
      )
    }

    if (!currency) {
      return NextResponse.json(
        { error: 'Missing required field', details: 'currency is required' },
        { status: 400 }
      )
    }

    if (!return_url) {
      return NextResponse.json(
        { error: 'Missing required field', details: 'return_url is required' },
        { status: 400 }
      )
    }

    // customer_id is optional for one-time payments
    // If not provided, the payment will be a guest checkout

    console.log('[API Route] Creating payment...', {
      amount,
      currency,
      merchant_order_id,
      return_url,
      customer_id,
    })
    console.log('[API Route] Using API key:', process.env.AIRWALLEX_API_KEY ? `${process.env.AIRWALLEX_API_KEY.substring(0, 10)}...` : 'NOT SET')
    console.log('[API Route] Using Client ID:', process.env.AIRWALLEX_CLIENT_ID ? `${process.env.AIRWALLEX_CLIENT_ID.substring(0, 10)}...` : 'NOT SET')

    // Step 1: Authenticate to get a token
    const authUrl = process.env.AIRWALLEX_ENVIRONMENT === 'production'
      ? 'https://api.airwallex.com/api/v1/authentication/login'
      : 'https://api-demo.airwallex.com/api/v1/authentication/login'
    
    console.log('[Create Payment] Step 1: AUTH REQUEST')
    console.log('[Create Payment]   URL:', authUrl)
    console.log('[Create Payment]   Method: POST')
    
    let authToken
    try {
      const authResponse = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': process.env.AIRWALLEX_CLIENT_ID || '',
          'x-api-key': process.env.AIRWALLEX_API_KEY || '',
        },
      })
      
      const authText = await authResponse.text()
      console.log('[Create Payment] AUTH RESPONSE')
      console.log('[Create Payment]   Status:', authResponse.status)
      console.log('[Create Payment]   Raw (first 200):', authText.substring(0, 200))
      
      let authData
      try {
        authData = JSON.parse(authText)
      } catch {
        console.error('[Create Payment] Auth response is not JSON')
        return NextResponse.json(
          { error: 'Invalid auth response', details: authText.substring(0, 200) },
          { status: 500 }
        )
      }
      
      if (!authResponse.ok) {
        return NextResponse.json(
          { 
            error: 'Authentication failed', 
            details: authData,
            status: authResponse.status,
          },
          { status: authResponse.status }
        )
      }
      
      authToken = authData.token
      console.log('[Create Payment] Auth successful, token received')
    } catch (authError: any) {
      console.error('[API Route] Authentication error:', authError)
      return NextResponse.json(
        { 
          error: 'Authentication failed', 
          details: authError.message,
        },
        { status: 500 }
      )
    }

    // Step 2: Create payment with the auth token
    console.log('[API Route] Step 2: Creating payment...')
    
    // Generate unique request_id for idempotency
    const request_id = `payment_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    const paymentPayload = {
      request_id: request_id,
      amount: amount, // Amount in the smallest currency unit (cents for EUR)
      currency: currency.toUpperCase(),
      merchant_order_id: merchant_order_id || `order_${Date.now()}`,
      return_url: return_url,
      // Enable multiple payment methods - Airwallex will show available options
      payment_method_types: ['card', 'googlepay', 'applepay', 'ideal', 'bancontact', 'giropay', 'sofort', 'eps'],
      // Capture immediately when payment is confirmed
      capture_method: 'automatic',
      // Include customer_id if provided (should be cus_ from PA customer creation)
      ...(customer_id ? { customer_id } : {}),
    }

    // Step 2: Create payment intent
    const airwallexUrl = process.env.AIRWALLEX_ENVIRONMENT === 'production'
      ? 'https://api.airwallex.com/api/v1/pa/payment_intents/create'
      : 'https://api-demo.airwallex.com/api/v1/pa/payment_intents/create'
    
    console.log('[Create Payment] Step 2: PAYMENT REQUEST')
    console.log('[Create Payment]   URL:', airwallexUrl)
    console.log('[Create Payment]   Method: POST')
    console.log('[Create Payment]   Payload:', JSON.stringify(paymentPayload))
    
    const response = await fetch(airwallexUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(paymentPayload),
    })

    // Parse response
    let data
    try {
      const responseText = await response.text()
      console.log('[Create Payment] PAYMENT RESPONSE')
      console.log('[Create Payment]   Status:', response.status)
      console.log('[Create Payment]   Raw (first 200):', responseText.substring(0, 200))
      
      try {
        data = JSON.parse(responseText)
      } catch {
        // If not JSON, return the text
        data = { message: responseText }
      }
    } catch (parseError: any) {
      console.error('[Create Payment] Failed to parse Airwallex response:', parseError)
      return NextResponse.json(
        { 
          error: 'Failed to parse Airwallex response', 
          details: parseError.message 
        },
        { status: 500 }
      )
    }

    console.log('[Create Payment] Parsed response:', JSON.stringify(data).substring(0, 200))

    if (!response.ok) {
      console.error('[API Route] Airwallex API error:', {
        status: response.status,
        statusText: response.statusText,
        data: data,
      })
      return NextResponse.json(
        { 
          error: 'Airwallex API error', 
          details: data,
          status: response.status,
        },
        { status: response.status }
      )
    }

    console.log('[API Route] Payment created successfully:', data.id)
    return NextResponse.json(data, { status: 200 })
  } catch (err: any) {
    console.error('[API Route] Unexpected error:', err)
    console.error('[API Route] Error stack:', err.stack)
    return NextResponse.json(
      { 
        error: 'Server error', 
        details: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      },
      { status: 500 }
    )
  }
}
