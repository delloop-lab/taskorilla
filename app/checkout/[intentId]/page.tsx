'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatEuro } from '@/lib/currency'
import Link from 'next/link'

export default function CheckoutPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const hasCheckedStatus = useRef(false)
  
  const intentId = params.intentId as string
  const taskId = searchParams?.get('taskId') || ''
  const amount = parseFloat(searchParams?.get('amount') || '0') / 100
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [payoutInfo, setPayoutInfo] = useState<{
    success: boolean
    amount?: number
    recipientName?: string
    recipientEmail?: string
    platformFee?: number
    error?: string
  } | null>(null)

  const addDebug = (msg: string) => {
    console.log(`[Checkout] ${msg}`)
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`])
  }

  // Check return status from Airwallex - only once
  useEffect(() => {
    if (hasCheckedStatus.current) return
    hasCheckedStatus.current = true

    const status = searchParams?.get('status')
    const paymentParam = searchParams?.get('payment')
    
    if (status === 'SUCCEEDED' || status === 'succeeded' || paymentParam === 'success') {
      addDebug('Detected successful payment from URL params')
      handlePaymentSuccess()
    } else if (status === 'FAILED' || status === 'failed') {
      setError('Payment failed. Please try again.')
    } else if (status === 'CANCELLED' || status === 'cancelled') {
      setError('Payment was cancelled.')
    }
  }, [])

  const handlePaymentSuccess = async () => {
    addDebug('Processing payment success...')
    setSuccess(true)
    
    if (taskId) {
      addDebug(`Updating task ${taskId} payment status via admin endpoint...`)
      
      // Use admin endpoint to bypass RLS
      try {
        const response = await fetch('/api/admin/update-payment-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId,
            paymentStatus: 'paid',
            paymentIntentId: intentId,
          }),
        })
        
        const result = await response.json()
        
        if (result.success) {
          addDebug(`✅ Task updated successfully: ${result.message}`)
        } else {
          addDebug(`⚠️ Admin update failed: ${result.error}`)
          // Fallback to direct update (in case RLS allows it)
          const { error: updateError } = await supabase
            .from('tasks')
            .update({ payment_status: 'paid' })
            .eq('id', taskId)
          
          if (updateError) {
            addDebug(`Fallback also failed: ${updateError.message}`)
          } else {
            addDebug('Fallback update succeeded')
          }
        }
      } catch (err: any) {
        addDebug(`Error calling admin endpoint: ${err.message}`)
      }
    }
  }

  /**
   * Simulate payment via Airwallex sandbox API
   * Calls POST /api/airwallex/simulate-payment which in turn calls:
   * POST https://api-demo.airwallex.com/api/v1/pa/payment_intents/{intentId}/simulate_shopper_action
   */
  const simulatePayment = async (paymentIntentId: string) => {
    addDebug('=== Starting Payment Simulation ===')
    addDebug(`Intent ID: ${paymentIntentId}`)
    addDebug(`Task ID: ${taskId || 'MISSING'}`)
    
    if (!paymentIntentId) {
      const errMsg = 'Missing payment intent ID'
      addDebug(`❌ ${errMsg}`)
      throw new Error(errMsg)
    }

    addDebug('Calling /api/airwallex/simulate-payment...')
    
    const response = await fetch('/api/airwallex/simulate-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intentId: paymentIntentId,
        taskId,
        action: 'payment_succeeded',
      }),
    })

    addDebug(`Response status: ${response.status}`)

    // Get response text first to handle HTML responses safely
    const responseText = await response.text()
    addDebug(`Response length: ${responseText.length} chars`)

    // Check if response is HTML (error page)
    if (responseText.trim().startsWith('<') || responseText.trim().startsWith('<!')) {
      addDebug('❌ Received HTML response instead of JSON')
      addDebug(`HTML preview: ${responseText.substring(0, 100)}...`)
      throw new Error('Server returned HTML instead of JSON. Check server logs.')
    }

    // Try to parse as JSON
    let data
    try {
      data = JSON.parse(responseText)
      addDebug(`Parsed JSON: ${JSON.stringify(data)}`)
    } catch (parseError) {
      addDebug(`❌ Failed to parse response as JSON: ${responseText.substring(0, 200)}`)
      throw new Error('Invalid JSON response from server')
    }

    // Check for API errors
    if (!response.ok) {
      const errorMsg = data.error || data.details?.message || data.message || 'Simulation failed'
      addDebug(`❌ API error: ${errorMsg}`)
      throw new Error(errorMsg)
    }

    addDebug(`✅ Simulation successful! Status: ${data.status}`)
    return data
  }

  // Button click handler
  const handleSimulateClick = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await simulatePayment(intentId)
      addDebug(`Payment simulation complete: ${result.status}`)
      
      // Capture payout info if available
      if (result.payout) {
        setPayoutInfo(result.payout)
        addDebug(`Payout info: ${JSON.stringify(result.payout)}`)
      }
      
      setSuccess(true)
    } catch (err: any) {
      addDebug(`❌ Simulation failed: ${err.message}`)
      setError(err.message || 'Failed to simulate payment')
    } finally {
      setLoading(false)
    }
  }

  // Manual redirect button
  const handleGoToTask = () => {
    window.location.href = `/tasks/${taskId}?payment=success`
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-4">Your payment of {formatEuro(amount)} has been processed.</p>
          
          {/* Payout Confirmation */}
          {payoutInfo && (
            <div className={`rounded-lg p-4 mb-6 text-left ${
              payoutInfo.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-amber-50 border border-amber-200'
            }`}>
              <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${
                payoutInfo.success ? 'text-green-800' : 'text-amber-800'
              }`}>
                {payoutInfo.success ? '💰 Helper Payout Initiated' : '⚠️ Payout Notice'}
              </h3>
              
              {payoutInfo.success ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Recipient:</span>
                    <span className="font-medium text-gray-900">{payoutInfo.recipientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium text-gray-900">{payoutInfo.recipientEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platform Fee (10%):</span>
                    <span className="text-gray-700">€{payoutInfo.platformFee?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-green-200 pt-2 mt-2">
                    <span className="font-semibold text-green-800">Payout Amount:</span>
                    <span className="font-bold text-green-800 text-lg">€{payoutInfo.amount?.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-green-700 mt-2">
                    ✓ The helper will receive this amount in their bank account.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-amber-800">
                  {payoutInfo.error || 'Payout could not be processed. The helper may need to add their IBAN.'}
                </p>
              )}
            </div>
          )}
          
          <button
            onClick={handleGoToTask}
            className="w-full bg-primary-600 text-white py-3 px-4 rounded-md font-medium hover:bg-primary-700"
          >
            Go to Task →
          </button>
          
          {/* Debug log on success */}
          {debugInfo.length > 0 && (
            <div className="mt-6 bg-gray-100 rounded-lg p-4 text-left">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Debug Log:</h3>
              <div className="text-xs font-mono text-gray-600 space-y-1 max-h-32 overflow-y-auto">
                {debugInfo.map((msg, i) => (
                  <div key={i}>{msg}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <img src="/images/taskorilla_header_logo.png" alt="Taskorilla" className="h-10" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Complete Your Payment</h1>
        </div>

        {/* Payment Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Task Payment:</span>
              <span className="font-semibold text-lg text-primary-600">{formatEuro(amount)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Payment ID:</span>
              <span className="font-mono truncate max-w-[200px]">{intentId}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Task ID:</span>
              <span className="font-mono">{taskId || 'MISSING'}</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-red-900 mb-1">⚠️ Error</h3>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Sandbox Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ Sandbox Mode</h3>
          <p className="text-xs text-blue-800">
            Click the button below to simulate a successful payment using Airwallex's sandbox API.
          </p>
        </div>

        {/* Simulate Payment Button */}
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-green-900 mb-2 text-center">🧪 Sandbox Testing</h3>
          <button
            onClick={handleSimulateClick}
            disabled={loading}
            className="w-full bg-green-600 text-white py-4 px-4 rounded-md font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Simulating...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Simulate Payment
              </>
            )}
          </button>
          {!intentId && (
            <p className="text-xs text-red-600 mt-2 text-center">
              ⚠️ Payment Intent ID is missing. Go back to the task and click "Pay Now" again.
            </p>
          )}
        </div>

        {/* Debug Info */}
        {debugInfo.length > 0 && (
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Debug Log:</h3>
            <div className="text-xs font-mono text-gray-600 space-y-1 max-h-48 overflow-y-auto">
              {debugInfo.map((msg, i) => (
                <div key={i}>{msg}</div>
              ))}
            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="text-center">
          <Link 
            href={taskId ? `/tasks/${taskId}` : '/tasks'}
            className="text-sm text-gray-600 hover:text-primary-600"
          >
            ← Back to task
          </Link>
        </div>
      </div>
    </div>
  )
}
