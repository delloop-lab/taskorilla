import { NextResponse } from 'next/server'
import { requireAirwallexEnabled } from '@/services/payments/airwallex-gate'

/**
 * Create Airwallex customer
 * POST /api/airwallex/create-customer
 * Provider gate is in services/payments/airwallex-gate.ts
 */
export async function POST(req: Request) {
  const gate = requireAirwallexEnabled()
  if (gate) return gate

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

    const { email, first_name, last_name } = body

    // Validate required fields
    if (!email || !first_name || !last_name) {
      return NextResponse.json(
        { 
          error: 'Missing required fields', 
          details: 'email, first_name, and last_name are required' 
        },
        { status: 400 }
      )
    }

    console.log('[API Route] Creating customer...', { email, first_name, last_name })
    console.log('[API Route] Using API key:', process.env.AIRWALLEX_API_KEY ? `${process.env.AIRWALLEX_API_KEY.substring(0, 10)}...` : 'NOT SET')
    console.log('[API Route] Using Client ID:', process.env.AIRWALLEX_CLIENT_ID ? `${process.env.AIRWALLEX_CLIENT_ID.substring(0, 10)}...` : 'NOT SET')
    
    // First, authenticate to get a token
    console.log('[API Route] Step 1: Authenticating with Airwallex...')
    const authUrl = process.env.AIRWALLEX_ENVIRONMENT === 'production'
      ? 'https://api.airwallex.com/api/v1/authentication/login'
      : 'https://api-demo.airwallex.com/api/v1/authentication/login'
    
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
      
      const authData = await authResponse.json()
      console.log('[API Route] Auth response status:', authResponse.status)
      console.log('[API Route] Auth response:', JSON.stringify(authData, null, 2))
      
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
      console.log('[API Route] Authentication successful, token:', authToken ? `${authToken.substring(0, 20)}...` : 'NOT RECEIVED')
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
    
    // Now create the customer with the auth token
    console.log('[API Route] Step 2: Creating customer...')
    // Use Payment Acceptance (PA) customer endpoint for payment customers (cus_)
    // NOT billing_customers which creates bcus_
    const airwallexUrl = process.env.AIRWALLEX_ENVIRONMENT === 'production'
      ? 'https://api.airwallex.com/api/v1/pa/customers/create'
      : 'https://api-demo.airwallex.com/api/v1/pa/customers/create'
    
    console.log('[API Route] Customer creation URL:', airwallexUrl)
    const requestBody = {
      request_id: `customer_${Date.now()}_${Math.random().toString(36).substring(7)}`, // Unique request ID for idempotency
      merchant_customer_id: `merchant_${Date.now()}`, // Your internal customer ID
      first_name,
      last_name,
      email,
    }

    console.log('[API Route] Request payload:', JSON.stringify(requestBody, null, 2))

    // Make request to Airwallex with better error handling
    let response
    try {
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      response = await fetch(airwallexUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
    } catch (fetchError: any) {
      console.error('[API Route] Fetch error details:', {
        message: fetchError.message,
        name: fetchError.name,
        cause: fetchError.cause,
        code: fetchError.code,
      })
      
      // Provide helpful error message based on error type
      if (fetchError.name === 'AbortError' || fetchError.message.includes('timeout')) {
        return NextResponse.json(
          { 
            error: 'Request timeout', 
            details: 'The request to Airwallex took too long. Please check your internet connection and try again.' 
          },
          { status: 504 }
        )
      }
      
      if (fetchError.message.includes('ENOTFOUND') || fetchError.message.includes('getaddrinfo')) {
        return NextResponse.json(
          { 
            error: 'DNS resolution failed', 
            details: 'Cannot resolve sandbox-api.airwallex.com. Please check your internet connection and DNS settings.' 
          },
          { status: 500 }
        )
      }
      
      if (fetchError.message.includes('certificate') || fetchError.message.includes('SSL')) {
        return NextResponse.json(
          { 
            error: 'SSL/TLS error', 
            details: 'SSL certificate verification failed. This might be a network/proxy issue.' 
          },
          { status: 500 }
        )
      }
      
      // Generic fetch error
      return NextResponse.json(
        { 
          error: 'Network error', 
          details: `Failed to connect to Airwallex: ${fetchError.message}. Please check your internet connection and firewall settings.`,
          errorType: fetchError.name,
        },
        { status: 500 }
      )
    }

    // Parse response
    let data
    try {
      const responseText = await response.text()
      console.log('[API Route] Raw Airwallex response status:', response.status)
      console.log('[API Route] Raw Airwallex response:', responseText.substring(0, 500))
      
      try {
        data = JSON.parse(responseText)
      } catch {
        // If not JSON, return the text
        data = { message: responseText }
      }
    } catch (parseError: any) {
      console.error('[API Route] Failed to parse Airwallex response:', parseError)
      return NextResponse.json(
        { 
          error: 'Failed to parse Airwallex response', 
          details: parseError.message 
        },
        { status: 500 }
      )
    }

    console.log('[API Route] Airwallex response:', data)

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

    console.log('[API Route] Customer created successfully:', data.id)
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
