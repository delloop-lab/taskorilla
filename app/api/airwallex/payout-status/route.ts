import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAirwallexEnabled } from '@/services/payments/airwallex-gate'

// This route reads request.nextUrl.searchParams and must run dynamically
export const dynamic = 'force-dynamic'

const AIRWALLEX_BASE_URL = process.env.AIRWALLEX_ENVIRONMENT === 'production'
  ? 'https://api.airwallex.com/api/v1'
  : 'https://api-demo.airwallex.com/api/v1'

/**
 * Get Airwallex payout status
 * GET /api/airwallex/payout-status?payoutId=xxx
 */
export async function GET(request: NextRequest) {
  const gate = requireAirwallexEnabled()
  if (gate) return gate

  if (request.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    // Validate API credentials
    if (!process.env.AIRWALLEX_API_KEY || !process.env.AIRWALLEX_CLIENT_ID) {
      console.error('[API Route] Airwallex credentials not set in environment variables')
      return NextResponse.json(
        { 
          error: 'Server configuration error', 
          details: 'Airwallex API credentials (AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY) are not set. Please add them to .env.local and restart the server.' 
        },
        { status: 500 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const payoutId = searchParams.get('payoutId')

    if (!payoutId) {
      return NextResponse.json(
        { error: 'payoutId is required' },
        { status: 400 }
      )
    }

    console.log('[API Route] Checking Airwallex payout status:', payoutId)

    // Step 1: Authenticate to get a token
    console.log('[API Route] Step 1: Authenticating with Airwallex...')
    const authUrl = `${AIRWALLEX_BASE_URL}/authentication/login`
    
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
      console.log('[API Route] Authentication successful')
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

    // Step 2: Get transfer status with the auth token
    // Airwallex uses /transfers/{id} endpoint (not /payouts/{id})
    console.log('[API Route] Step 2: Getting transfer status...')
    const payoutUrl = `${AIRWALLEX_BASE_URL}/transfers/${payoutId}`
    console.log('[API Route] Airwallex Transfer URL:', payoutUrl)
    
    const response = await fetch(payoutUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    })

    let data
    try {
      const responseText = await response.text()
      console.log('[API Route] Raw Airwallex payout response status:', response.status)
      console.log('[API Route] Raw Airwallex payout response:', responseText.substring(0, 500))
      
      try {
        data = JSON.parse(responseText)
      } catch {
        data = { message: responseText }
      }
    } catch (parseError: any) {
      console.error('[API Route] Failed to parse Airwallex payout response:', parseError)
      return NextResponse.json(
        { 
          error: 'Failed to parse Airwallex payout response', 
          details: parseError.message 
        },
        { status: 500 }
      )
    }

    console.log('[API Route] Airwallex payout response:', data)

    if (!response.ok) {
      console.error('[API Route] Airwallex payout API error:', {
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

    // Optionally update database if payout record exists
    try {
      const supabase = createServerSupabaseClient(request)
      const { data: payoutRecord } = await supabase
        .from('payouts')
        .select('status, task_id')
        .eq('airwallex_payout_id', payoutId)
        .single()

      if (payoutRecord && payoutRecord.status !== data.status) {
        await supabase
          .from('payouts')
          .update({
            status: data.status,
            completed_at: data.status === 'succeeded' || data.status === 'completed' ? new Date().toISOString() : null,
          })
          .eq('airwallex_payout_id', payoutId)

        // Update task payout status
        if (payoutRecord.task_id) {
          await supabase
            .from('tasks')
            .update({ payout_status: data.status })
            .eq('id', payoutRecord.task_id)
        }
      }
    } catch (dbError: any) {
      console.error('[API Route] Database error (non-fatal):', dbError)
      // Continue even if database update fails
    }

    return NextResponse.json({
      success: true,
      payoutId: data.id,
      status: data.status,
      amount: data.amount ? data.amount / 100 : undefined, // Convert back from cents if present
      currency: data.currency,
      payout: data,
    }, { status: 200 })
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


