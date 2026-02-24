import { NextRequest, NextResponse } from 'next/server'
import { validateIBAN } from '@/lib/airwallex'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { requireAirwallexEnabled } from '@/services/payments/airwallex-gate'

const AIRWALLEX_BASE_URL = process.env.AIRWALLEX_ENVIRONMENT === 'production'
  ? 'https://api.airwallex.com/api/v1'
  : 'https://api-demo.airwallex.com/api/v1'

// Admin client with service role key - bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * Create Airwallex payout to helper/tasker
 * POST /api/airwallex/create-payout
 */
export async function POST(request: NextRequest) {
  const gate = requireAirwallexEnabled()
  if (gate) return gate

  try {
    // Debug logging at the top
    console.log('[API Route] ENV:', {
      CLIENT_ID: process.env.AIRWALLEX_CLIENT_ID,
      API_KEY: process.env.AIRWALLEX_API_KEY ? 'Loaded' : 'Missing',
      ENVIRONMENT: process.env.AIRWALLEX_ENVIRONMENT,
    })

    if (request.method !== 'POST') {
      return NextResponse.json(
        { error: 'Method not allowed' }, 
        { 
          status: 405,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Force-parse body early for debugging
    let body
    try {
      body = await request.json()
      console.log('[API Route] Request body:', body)
    } catch (parseError: any) {
      console.error('[API Route] Failed to parse request body:', parseError)
      return NextResponse.json(
        { 
          error: 'Invalid request body', 
          details: 'Request body must be valid JSON',
          message: parseError.message,
        },
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Validate API credentials
    if (!process.env.AIRWALLEX_API_KEY || !process.env.AIRWALLEX_CLIENT_ID) {
      console.error('[API Route] Airwallex credentials not set in environment variables')
      return NextResponse.json(
        { 
          error: 'Server configuration error', 
          details: 'Airwallex API credentials (AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY) are not set. Please add them to .env.local and restart the server.' 
        },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    const {
      taskId,
      helperId,
      amount,
      currency = 'EUR',
      iban,
      accountHolderName,
      idempotencyKey,
      reason,
      reference,
      // Optional address fields - if not provided, we'll use defaults
      addressLine1,
      addressCity,
      addressPostcode,
      addressCountryCode,
      bankName,
      // Sandbox simulation flag
      simulatePayout = false,
    } = body

    // SANDBOX SIMULATION MODE - Skip Airwallex API and return success
    if (simulatePayout && process.env.AIRWALLEX_ENVIRONMENT !== 'production') {
      console.log('[API Route] 🧪 SANDBOX: Simulating successful payout')
      console.log(`[API Route] 🧪 Simulated payout: €${amount} to ${accountHolderName} (${iban?.substring(0, 8)}...)`)
      
      // Record the simulated payout in database using admin client (bypasses RLS)
      if (taskId) {
        try {
          const { error: updateError } = await supabaseAdmin
            .from('tasks')
            .update({ payout_status: 'simulated' })
            .eq('id', taskId)
          
          if (updateError) {
            console.error('[API Route] Error updating task payout status:', updateError)
          } else {
            console.log('[API Route] ✅ Task payout_status updated to "simulated"')
          }
        } catch (err) {
          console.error('[API Route] Error updating task payout status:', err)
        }
      }

      return NextResponse.json({
        success: true,
        simulated: true,
        payoutId: `sim_payout_${Date.now()}`,
        amount,
        currency,
        beneficiaryName: accountHolderName,
        status: 'COMPLETED',
        message: `🧪 SANDBOX: Simulated payout of €${amount.toFixed(2)} to ${accountHolderName}`,
      }, { status: 200 })
    }

    // Validate required fields - always return JSON
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount is required and must be greater than 0' },
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    if (!iban) {
      return NextResponse.json(
        { error: 'IBAN is required for payout' },
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    if (!accountHolderName) {
      return NextResponse.json(
        { error: 'Account holder name is required' },
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Validate IBAN format - always return JSON
    // Clean IBAN first (remove dots, spaces, dashes)
    const cleanedIban = iban.replace(/[.\s-]/g, '').toUpperCase()
    
    if (!validateIBAN(cleanedIban)) {
      return NextResponse.json(
        { 
          error: 'Invalid IBAN format',
          details: 'IBAN must be a valid format (15-34 characters, no dots or spaces)',
        },
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Extract bank details from IBAN (using cleaned IBAN from validation above)
    const countryCode = cleanedIban.substring(0, 2)
    
    // Use country code from IBAN for address if not provided
    const beneficiaryCountryCode = addressCountryCode || countryCode

    console.log('[API Route] Creating Airwallex payout...', {
      amount,
      currency,
      iban: cleanedIban.substring(0, 8) + '...',
      accountHolderName,
    })
    console.log('[API Route] Using Client ID:', process.env.AIRWALLEX_CLIENT_ID ? `${process.env.AIRWALLEX_CLIENT_ID.substring(0, 10)}...` : 'NOT SET')
    console.log('[API Route] Using API key:', process.env.AIRWALLEX_API_KEY ? `${process.env.AIRWALLEX_API_KEY.substring(0, 10)}...` : 'NOT SET')

    // Step 1: Authenticate to get a token
    const authUrl = `${AIRWALLEX_BASE_URL}/authentication/login`
    console.log('[Create Payout] Step 1: AUTH REQUEST')
    console.log('[Create Payout]   URL:', authUrl)
    console.log('[Create Payout]   Method: POST')
    
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
      console.log('[Create Payout] AUTH RESPONSE')
      console.log('[Create Payout]   Status:', authResponse.status)
      console.log('[Create Payout]   Raw (first 200):', authText.substring(0, 200))
      
      let authData
      try {
        authData = JSON.parse(authText)
      } catch {
        console.error('[Create Payout] Auth response is not JSON')
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
          { 
            status: authResponse.status,
            headers: {
              'Content-Type': 'application/json',
            },
          }
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
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Step 2: Get the API schema for this payout scenario first
    const schemaUrl = `${AIRWALLEX_BASE_URL}/beneficiary_api_schemas/generate`
    const schemaPayload = {
      bank_country_code: countryCode,
      account_currency: currency.toUpperCase(),
      transfer_method: 'LOCAL',
      entity_type: 'PERSONAL',
    }
    console.log('[Create Payout] Step 2: SCHEMA REQUEST')
    console.log('[Create Payout]   URL:', schemaUrl)
    console.log('[Create Payout]   Method: POST')
    console.log('[Create Payout]   Payload:', JSON.stringify(schemaPayload))
    
    const schemaResponse = await fetch(schemaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(schemaPayload),
    })
    
    const schemaText = await schemaResponse.text()
    console.log('[Create Payout] SCHEMA RESPONSE')
    console.log('[Create Payout]   Status:', schemaResponse.status)
    console.log('[Create Payout]   Raw (first 200):', schemaText.substring(0, 200))
    
    // Build beneficiary object for validation and transfer
    // IMPORTANT: type: 'BANK_ACCOUNT' is REQUIRED per Airwallex docs
    
    // Default address values based on bank country (from IBAN)
    const defaultAddressByCountry: Record<string, { street: string; city: string; postcode: string }> = {
      DE: { street: 'Musterstraße 123', city: 'Berlin', postcode: '10115' },
      PT: { street: 'Rua Example 123', city: 'Lisbon', postcode: '1000-001' },
      GB: { street: '123 Test Street', city: 'London', postcode: 'SW1A 1AA' },
      FR: { street: '123 Rue Example', city: 'Paris', postcode: '75001' },
      ES: { street: 'Calle Ejemplo 123', city: 'Madrid', postcode: '28001' },
      IT: { street: 'Via Example 123', city: 'Rome', postcode: '00100' },
      NL: { street: 'Voorbeeldstraat 123', city: 'Amsterdam', postcode: '1012 AB' },
    }
    
    const defaultAddr = defaultAddressByCountry[countryCode] || defaultAddressByCountry['DE']
    
    const beneficiaryData: any = {
      type: 'BANK_ACCOUNT', // Required field - BANK_ACCOUNT or DIGITAL_WALLET
      entity_type: 'PERSONAL',
      first_name: accountHolderName.split(' ')[0] || accountHolderName,
      last_name: accountHolderName.split(' ').slice(1).join(' ') || accountHolderName,
      address: {
        street_address: addressLine1 || defaultAddr.street,
        city: addressCity || defaultAddr.city,
        postcode: addressPostcode || defaultAddr.postcode,
        country_code: addressCountryCode || countryCode,
      },
      bank_details: {
        account_name: accountHolderName,
        bank_country_code: countryCode,
        account_currency: currency.toUpperCase(),
        iban: cleanedIban,
      },
    }
    
    // Step 3: Validate beneficiary
    const validateUrl = `${AIRWALLEX_BASE_URL}/beneficiaries/validate`
    const validatePayload = {
      beneficiary: beneficiaryData,
      transfer_methods: ['LOCAL'], // Plural array for beneficiaries API
    }
    console.log('[Create Payout] Step 3: VALIDATE REQUEST')
    console.log('[Create Payout]   URL:', validateUrl)
    console.log('[Create Payout]   Method: POST')
    console.log('[Create Payout]   Payload:', JSON.stringify(validatePayload))
    
    const validateResponse = await fetch(validateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(validatePayload),
    })
    
    const validateText = await validateResponse.text()
    console.log('[Create Payout] VALIDATE RESPONSE')
    console.log('[Create Payout]   Status:', validateResponse.status)
    console.log('[Create Payout]   Raw (first 200):', validateText.substring(0, 200))
    
    if (!validateResponse.ok) {
      let validateData
      try {
        validateData = JSON.parse(validateText)
      } catch {
        validateData = { raw: validateText }
      }
      return NextResponse.json(
        { 
          error: 'Beneficiary validation failed', 
          details: validateData,
          status: validateResponse.status,
          suggestion: 'Check the IBAN format and beneficiary details',
        },
        { status: validateResponse.status, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Step 4: Create transfer with the auth token
    // Build the payload according to Airwallex API structure
    // Amount must be in cents (minor units) - 50 EUR = 5000 cents
    const amountInCents = Math.round(amount * 100)
    
    const payoutPayload: any = {
      request_id: idempotencyKey || `payout_${Date.now()}`,
      transfer_amount: amountInCents,
      transfer_currency: currency.toUpperCase(),
      source_currency: currency.toUpperCase(),
      transfer_method: 'LOCAL',
      reason: reason || 'PAYMENT_FOR_GOODS_OR_SERVICES',
      reference: reference || `payout-${taskId || Date.now()}`,
      beneficiary: beneficiaryData,
    }

    // Add metadata if provided
    if (taskId || helperId) {
      payoutPayload.metadata = {}
      if (taskId) payoutPayload.metadata.task_id = taskId
      if (helperId) payoutPayload.metadata.helper_id = helperId
    }

    // Airwallex uses /transfers/create endpoint for payouts (not /payouts)
    const payoutUrl = `${AIRWALLEX_BASE_URL}/transfers/create`
    console.log('[Create Payout] Step 4: TRANSFER REQUEST')
    console.log('[Create Payout]   URL:', payoutUrl)
    console.log('[Create Payout]   Method: POST')
    console.log('[Create Payout]   Payload:', JSON.stringify(payoutPayload))
    
    const response = await fetch(payoutUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(payoutPayload),
    })

    let data
    try {
      const responseText = await response.text()
      console.log('[Create Payout] TRANSFER RESPONSE')
      console.log('[Create Payout]   Status:', response.status)
      console.log('[Create Payout]   Raw (first 200):', responseText.substring(0, 200))
      
      // Always try to parse as JSON first
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        // If not JSON, return a structured error response
        console.error('[API Route] Failed to parse Airwallex response as JSON:', parseError)
        return NextResponse.json(
          { 
            error: 'Airwallex API error', 
            details: {
              message: 'Invalid JSON response from Airwallex',
              status: response.status,
              statusText: response.statusText,
              responsePreview: responseText.substring(0, 500),
            },
            status: response.status,
          },
          { status: response.status || 500 }
        )
      }
    } catch (readError: any) {
      console.error('[API Route] Failed to read Airwallex payout response:', readError)
      return NextResponse.json(
        { 
          error: 'Failed to read Airwallex payout response', 
          details: readError.message 
        },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    console.log('[API Route] Airwallex payout response:', data)

    if (!response.ok) {
      console.error('[API Route] Airwallex payout API error:', {
        status: response.status,
        statusText: response.statusText,
        data: data,
        attemptedUrl: payoutUrl,
      })
      
      // If 404, suggest trying alternative endpoints
      if (response.status === 404) {
        return NextResponse.json(
          { 
            error: 'Airwallex API endpoint not found (404)', 
            details: {
              ...data,
              attemptedUrl: payoutUrl,
              suggestion: 'The payout endpoint might be different. Try: /payouts/create, /pa/payouts/create, or /transfers/create',
            },
            status: response.status,
          },
          { 
            status: response.status,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Airwallex API error', 
          details: data,
          status: response.status,
        },
        { 
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    console.log('[API Route] Payout created successfully:', data.id)

    // Optionally store in database if taskId/helperId provided
    if (taskId && helperId) {
      try {
        const supabase = createServerSupabaseClient(request)
        const { error: dbError } = await supabase
          .from('payouts')
          .insert({
            task_id: taskId,
            helper_id: helperId,
            amount,
            currency,
            status: data.status || 'pending',
            airwallex_payout_id: data.id,
            iban: cleanedIban,
          })

        if (dbError) {
          console.error('[API Route] Error storing payout in database:', dbError)
          // Don't fail the request, payout was created successfully
        }

        // Update task with payout ID using admin client (bypasses RLS)
        const { error: taskUpdateError } = await supabaseAdmin
          .from('tasks')
          .update({
            payout_id: data.id,
            payout_status: data.status || 'pending',
          })
          .eq('id', taskId)

        if (taskUpdateError) {
          console.error('[API Route] Error updating task with payout ID:', taskUpdateError)
        }
      } catch (dbError: any) {
        console.error('[API Route] Database error (non-fatal):', dbError)
        // Continue even if database update fails
      }
    }

    return NextResponse.json({
      success: true,
      payoutId: data.id,
      status: data.status,
      amount: data.amount ? data.amount / 100 : amount, // Convert back from cents if present
      currency: data.currency || currency,
      payout: data,
    }, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (err: any) {
    console.error('[API Route] CRASHED:', err)
    console.error('[API Route] Error stack:', err.stack)
    
    // Force JSON output even on crashes
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: err.message || 'An unexpected error occurred',
        ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}


