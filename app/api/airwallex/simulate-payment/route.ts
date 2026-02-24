import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAirwallexEnabled } from '@/services/payments/airwallex-gate'

// Use service role key to bypass RLS for server-side updates
// IMPORTANT: SUPABASE_SERVICE_ROLE_KEY must be set in .env.local for this to work!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// Log at startup if service key is missing
if (!serviceRoleKey) {
  console.warn('[Simulate Payment] ⚠️ SUPABASE_SERVICE_ROLE_KEY not set! Updates may fail due to RLS.')
}

/**
 * Simulate Payment in Airwallex Sandbox
 * POST /api/airwallex/simulate-payment
 * 
 * For sandbox testing, this endpoint:
 * 1. Verifies the payment intent exists via Airwallex API
 * 2. Marks the task as paid in the database
 * 
 * Note: Airwallex's actual simulate_shopper_action API requires a next_action.url
 * from a confirmed payment, which requires going through their HPP flow first.
 * For sandbox testing, we skip that and directly update our database.
 */
export async function POST(req: Request) {
  const gate = requireAirwallexEnabled()
  if (gate) return gate

  console.log('[Simulate Payment] === Starting simulation ===')
  
  try {
    // Validate credentials
    if (!process.env.AIRWALLEX_API_KEY || !process.env.AIRWALLEX_CLIENT_ID) {
      console.error('[Simulate Payment] Missing AIRWALLEX_API_KEY or AIRWALLEX_CLIENT_ID')
      return NextResponse.json(
        { error: 'Airwallex credentials not configured in environment variables' },
        { status: 500 }
      )
    }

    // Parse request body
    let body
    try {
      body = await req.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { intentId, taskId, action = 'payment_succeeded' } = body

    if (!intentId) {
      return NextResponse.json(
        { error: 'Missing required field: intentId' },
        { status: 400 }
      )
    }

    console.log(`[Simulate Payment] Intent: ${intentId}`)
    console.log(`[Simulate Payment] Task: ${taskId || 'none'}`)
    console.log(`[Simulate Payment] Action: ${action}`)

    // ============================================
    // Step 1: Authenticate with Airwallex
    // ============================================
    const authUrl = 'https://api-demo.airwallex.com/api/v1/authentication/login'
    console.log('[Simulate Payment] Step 1: AUTH REQUEST')
    console.log('[Simulate Payment]   URL:', authUrl)
    console.log('[Simulate Payment]   Method: POST')

    let authToken: string

    try {
      const authResponse = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': process.env.AIRWALLEX_CLIENT_ID,
          'x-api-key': process.env.AIRWALLEX_API_KEY,
        } as Record<string, string>,
      })

      const authText = await authResponse.text()
      console.log('[Simulate Payment] AUTH RESPONSE')
      console.log('[Simulate Payment]   Status:', authResponse.status)
      console.log('[Simulate Payment]   Raw (first 200):', authText.substring(0, 200))

      if (!authResponse.ok) {
        console.error('[Simulate Payment] Auth failed:', authText.substring(0, 300))
        return NextResponse.json(
          { 
            error: 'Airwallex authentication failed', 
            status: authResponse.status,
            details: authText.substring(0, 300)
          },
          { status: 401 }
        )
      }

      let authData
      try {
        authData = JSON.parse(authText)
      } catch {
        console.error('[Simulate Payment] Auth response is not JSON:', authText.substring(0, 200))
        return NextResponse.json(
          { error: 'Invalid auth response from Airwallex', details: authText.substring(0, 200) },
          { status: 500 }
        )
      }

      authToken = authData.token
      if (!authToken) {
        return NextResponse.json(
          { error: 'No token in auth response', details: authData },
          { status: 500 }
        )
      }

      console.log('[Simulate Payment] Auth successful, token received')

    } catch (authError: any) {
      console.error('[Simulate Payment] Auth network error:', authError.message)
      return NextResponse.json(
        { error: 'Network error during authentication', details: authError.message },
        { status: 500 }
      )
    }

    // ============================================
    // Step 2: Verify payment intent exists
    // ============================================
    const getIntentUrl = `https://api-demo.airwallex.com/api/v1/pa/payment_intents/${intentId}`
    console.log('[Simulate Payment] Step 2: GET PAYMENT INTENT')
    console.log('[Simulate Payment]   URL:', getIntentUrl)
    console.log('[Simulate Payment]   Method: GET')

    try {
      const intentResponse = await fetch(getIntentUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      })

      const intentText = await intentResponse.text()
      console.log('[Simulate Payment] INTENT RESPONSE')
      console.log('[Simulate Payment]   Status:', intentResponse.status)
      console.log('[Simulate Payment]   Raw (first 200):', intentText.substring(0, 200))

      let intentData
      try {
        intentData = JSON.parse(intentText)
      } catch {
        console.error('[Simulate Payment] Intent response is not JSON')
        return NextResponse.json(
          { 
            error: 'Could not fetch payment intent', 
            status: intentResponse.status,
            details: intentText.substring(0, 300)
          },
          { status: 500 }
        )
      }

      if (!intentResponse.ok) {
        console.error('[Simulate Payment] Failed to get intent:', intentData)
        return NextResponse.json(
          { 
            error: 'Payment intent not found', 
            status: intentResponse.status,
            details: intentData 
          },
          { status: intentResponse.status }
        )
      }

      console.log('[Simulate Payment] Payment intent found!')
      console.log('[Simulate Payment]   ID:', intentData.id)
      console.log('[Simulate Payment]   Status:', intentData.status)
      console.log('[Simulate Payment]   Amount:', intentData.amount, intentData.currency)

      // ============================================
      // Step 3: Update task payment status (sandbox simulation)
      // ============================================
      // In sandbox mode, we simulate success by updating our database
      // Real production would use webhooks from Airwallex
      
      let payoutResult = null
      
      if (action === 'payment_succeeded' && taskId) {
        console.log('[Simulate Payment] Step 3: Updating task', taskId, 'to paid (SANDBOX SIMULATION)')
        console.log('[Simulate Payment] Using Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
        console.log('[Simulate Payment] Service key present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
        
        const { data: updateData, error: updateError } = await supabaseAdmin
          .from('tasks')
          .update({ payment_status: 'paid' })
          .eq('id', taskId)
          .select('*, assigned_to, budget')

        console.log('[Simulate Payment] Update result - data:', updateData)
        console.log('[Simulate Payment] Update result - error:', updateError)

        if (updateError) {
          console.error('[Simulate Payment] Task update failed:', updateError)
          return NextResponse.json(
            { error: 'Failed to update task', details: updateError.message },
            { status: 500 }
          )
        }
        
        if (!updateData || updateData.length === 0) {
          console.error('[Simulate Payment] Task update returned no data - RLS might be blocking or task not found')
          return NextResponse.json(
            { error: 'Task not found or RLS blocking update', taskId },
            { status: 404 }
          )
        }
        
        console.log('[Simulate Payment] ✅ Task updated to paid:', updateData[0]?.payment_status)

        // ============================================
        // Step 4: Trigger payout to helper (sandbox simulation)
        // ============================================
        const taskData = updateData[0]
        if (taskData.assigned_to && taskData.budget) {
          console.log('[Simulate Payment] Step 4: Initiating payout to helper')
          
          // Get helper's profile (IBAN, name, email)
          const { data: helperProfile } = await supabaseAdmin
            .from('profiles')
            .select('iban, full_name, email')
            .eq('id', taskData.assigned_to)
            .single()

          console.log('[Simulate Payment] Helper profile:', helperProfile?.email, 'IBAN:', helperProfile?.iban ? 'Set' : 'Missing')

          if (helperProfile?.iban) {
            // Get platform fee percentage from settings (default 10%)
            let platformFeePercent = 10
            const { data: feeSettings } = await supabaseAdmin
              .from('platform_settings')
              .select('key, value')
              .eq('key', 'platform_fee_percent')
              .single()
            
            if (feeSettings?.value) {
              platformFeePercent = parseFloat(feeSettings.value) || 10
            }

            // Calculate payout: budget × (1 - platformFee%)
            // E.g., €100 budget × 90% = €90 payout (platform keeps €10)
            const platformFee = taskData.budget * (platformFeePercent / 100)
            const payoutAmount = taskData.budget - platformFee

            console.log('[Simulate Payment] 💰 Payout calculation:')
            console.log(`  Task budget: €${taskData.budget}`)
            console.log(`  Platform fee (${platformFeePercent}%): €${platformFee.toFixed(2)}`)
            console.log(`  Helper payout: €${payoutAmount.toFixed(2)}`)
            console.log(`  Recipient: ${helperProfile.full_name} (${helperProfile.email})`)

            // Call the payout endpoint with simulatePayout flag for sandbox
            try {
              const payoutResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/airwallex/create-payout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  taskId: taskId,
                  helperId: taskData.assigned_to,
                  amount: payoutAmount,
                  currency: 'EUR',
                  iban: helperProfile.iban,
                  accountHolderName: helperProfile.full_name || 'Helper',
                  idempotencyKey: `payout-${taskId}-${Date.now()}`,
                  reason: 'PAYMENT_FOR_GOODS_OR_SERVICES',
                  simulatePayout: true, // Sandbox mode - simulate the payout
                }),
              })

              const payoutData = await payoutResponse.json()
              
              if (payoutResponse.ok && payoutData.success) {
                console.log('[Simulate Payment] ✅ Payout simulation successful:', payoutData)
                payoutResult = {
                  success: true,
                  payoutId: payoutData.payoutId,
                  amount: payoutAmount,
                  recipientName: helperProfile.full_name,
                  recipientEmail: helperProfile.email,
                  platformFee: platformFee,
                }
              } else {
                console.error('[Simulate Payment] ⚠️ Payout simulation failed:', payoutData)
                payoutResult = {
                  success: false,
                  error: payoutData.error || 'Unknown payout error',
                }
              }
            } catch (payoutError: any) {
              console.error('[Simulate Payment] ⚠️ Payout request error:', payoutError.message)
              payoutResult = {
                success: false,
                error: payoutError.message,
              }
            }
          } else {
            console.warn('[Simulate Payment] ⚠️ Helper has no IBAN configured')
            payoutResult = {
              success: false,
              error: 'Helper has no IBAN configured in their profile',
            }
          }
        } else {
          console.log('[Simulate Payment] Skipping payout - no helper assigned or no budget')
        }
      } else {
        console.log('[Simulate Payment] Skipping task update - action:', action, 'taskId:', taskId || 'MISSING')
      }

      // Return success with payout info
      return NextResponse.json({
        success: true,
        status: 'SUCCEEDED',
        intentId: intentData.id,
        intentStatus: intentData.status,
        amount: intentData.amount,
        currency: intentData.currency,
        message: `🧪 SANDBOX: Payment simulation completed successfully`,
        note: 'This is a sandbox simulation. The payment intent was verified and the task has been marked as paid.',
        payout: payoutResult,
      })

    } catch (intentError: any) {
      console.error('[Simulate Payment] Intent fetch error:', intentError.message)
      return NextResponse.json(
        { error: 'Network error fetching payment intent', details: intentError.message },
        { status: 500 }
      )
    }

  } catch (err: any) {
    console.error('[Simulate Payment] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Server error', details: err.message },
      { status: 500 }
    )
  }
}
