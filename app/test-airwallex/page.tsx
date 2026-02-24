'use client'

import { useState } from 'react'
import { formatEuro } from '@/lib/currency'

export default function TestPaymentsPage() {
  const [testType, setTestType] = useState<'payment' | 'payout' | 'customer'>('payment')
  const [amount, setAmount] = useState('50.00')
  const [taskId, setTaskId] = useState('')
  const [helperId, setHelperId] = useState('')
  const [iban, setIban] = useState('PT50001234567890123456789')
  const [accountHolderName, setAccountHolderName] = useState('Test Helper')
  const [customerId, setCustomerId] = useState('cus_test_123') // Default sandbox customer ID
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleTestPayment = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Step 1: Create customer first
      console.log('Step 1: Creating customer...')
      const customerRes = await fetch('/api/payments/create-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `test_${Date.now()}@example.com`,
          first_name: 'Test',
          last_name: 'Customer',
        }),
      })

      const customerData = await customerRes.json()

      if (!customerRes.ok) {
        throw new Error(`Failed to create customer: ${JSON.stringify(customerData)}`)
      }

      console.log('Customer created:', customerData.id)
      setCustomerId(customerData.id)

      // Step 2: Create payment with customer_id
      console.log('Step 2: Creating payment...')
      const amountNumber = parseFloat(amount) || 1.00
      const amountInCents = Math.round(amountNumber * 100)

      const paymentRes = await fetch('/api/payments/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_order_id: `test-${Date.now()}`,
          amount: amountInCents,
          currency: 'EUR',
          return_url: 'https://example.com/return',
          customer_id: customerData.id,
        }),
      })

      const paymentData = await paymentRes.json()

      if (!paymentRes.ok) {
        throw new Error(`Failed to create payment: ${JSON.stringify(paymentData)}`)
      }

      console.log('Payment created:', paymentData)
      setResult(paymentData)
    } catch (err: any) {
      console.error('Payment Error:', err)
      setError(err.message || 'Error creating payment')
    } finally {
      setLoading(false)
    }
  }

  const handleTestPayout = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/payments/create-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: taskId || `test-task-${Date.now()}`,
          helperId: helperId || `test-helper-${Date.now()}`,
          amount: parseFloat(amount),
          currency: 'EUR',
          iban,
          accountHolderName,
          idempotencyKey: `test-payout-${Date.now()}`,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payout')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Error creating payout')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckPaymentStatus = async () => {
    const intentId = result?.paymentIntentId || result?.id
    if (!intentId) {
      setError('No payment intent ID available')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/payments/payment-status?paymentIntentId=${intentId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check payment status')
      }

      setResult({ ...result, statusCheck: data })
    } catch (err: any) {
      setError(err.message || 'Error checking payment status')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckPayoutStatus = async () => {
    const payoutId = result?.payoutId || result?.id
    if (!payoutId) {
      setError('No payout ID available')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/payments/payout-status?payoutId=${payoutId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check payout status')
      }

      setResult({ ...result, statusCheck: data })
    } catch (err: any) {
      setError(err.message || 'Error checking payout status')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCustomer = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/payments/create-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `test_${Date.now()}@example.com`,
          first_name: 'Lou',
          last_name: 'Schillaci',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(`Failed to create customer: ${JSON.stringify(data)}`)
      }

      console.log('Customer created:', data)
      setCustomerId(data.id) // Update customer ID for payment tests
      setResult(data)
    } catch (err: any) {
      console.error('Customer creation error:', err)
      setError(err.message || 'Error creating customer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Test Payment Integration</h1>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">⚠️ Test Environment</h3>
        <p className="text-sm text-yellow-800">
          This page is for testing payment integration. Configure <code className="bg-yellow-100 px-1 rounded">PAYMENT_PROVIDER</code> and credentials in <code className="bg-yellow-100 px-1 rounded">.env.local</code>.
        </p>
      </div>

      {/* Test Type Selector */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => {
              setTestType('payment')
              setResult(null)
              setError(null)
            }}
            className={`px-4 py-2 rounded-md font-medium ${
              testType === 'payment'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Test Payment
          </button>
          <button
            onClick={() => {
              setTestType('payout')
              setResult(null)
              setError(null)
            }}
            className={`px-4 py-2 rounded-md font-medium ${
              testType === 'payout'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Test Payout
          </button>
          <button
            onClick={() => {
              setTestType('customer')
              setResult(null)
              setError(null)
            }}
            className={`px-4 py-2 rounded-md font-medium ${
              testType === 'customer'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Create Customer
          </button>
        </div>

        {/* Customer ID Display */}
        {customerId && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Current Customer ID:</strong> <code className="bg-blue-100 px-2 py-1 rounded">{customerId}</code>
            </p>
          </div>
        )}

        {/* Payment Test Form */}
        {testType === 'payment' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task ID (optional)
              </label>
              <input
                type="text"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                placeholder="Leave empty for auto-generated"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (€)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <button
              onClick={handleTestPayment}
              disabled={loading || !amount}
              className="w-full bg-primary-600 text-white px-4 py-2 rounded-md font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Creating Payment...' : `Create Payment for ${formatEuro(parseFloat(amount) || 0)}`}
            </button>
          </div>
        )}

        {/* Payout Test Form */}
        {testType === 'payout' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task ID (optional)
              </label>
              <input
                type="text"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                placeholder="Leave empty for auto-generated"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Helper ID (optional)
              </label>
              <input
                type="text"
                value={helperId}
                onChange={(e) => setHelperId(e.target.value)}
                placeholder="Leave empty for auto-generated"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (€)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IBAN
              </label>
              <input
                type="text"
                value={iban}
                onChange={(e) => setIban(e.target.value.replace(/\s/g, '').toUpperCase())}
                placeholder="PT50001234567890123456789"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Holder Name
              </label>
              <input
                type="text"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <button
              onClick={handleTestPayout}
              disabled={loading || !amount || !iban}
              className="w-full bg-primary-600 text-white px-4 py-2 rounded-md font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Creating Payout...' : `Create Payout for ${formatEuro(parseFloat(amount) || 0)}`}
            </button>
          </div>
        )}

        {/* Customer Creation Form */}
        {testType === 'customer' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Create Sandbox Customer</h3>
              <p className="text-sm text-blue-800 mb-4">
                Create a sandbox customer. The customer ID will be used for payment tests when supported by the active provider.
              </p>
              <button
                onClick={handleCreateCustomer}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating Customer...' : 'Create Customer'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
          <p className="text-sm text-red-800 whitespace-pre-wrap">{error}</p>
          <details className="mt-2">
            <summary className="text-xs text-red-600 cursor-pointer">Show full error details</summary>
            <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto max-h-60">{error}</pre>
          </details>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Result</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Response:</h4>
              <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>

            {testType === 'payment' && (result.paymentIntentId || result.id) && (
              <div>
                <button
                  onClick={handleCheckPaymentStatus}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Check Payment Status
                </button>
              </div>
            )}

            {testType === 'payout' && (result.payoutId || result.id) && (
              <div>
                <button
                  onClick={handleCheckPayoutStatus}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Check Payout Status
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Documentation */}
      <div className="mt-6 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">API Routes</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li><code className="bg-gray-200 px-1 rounded">POST /api/payments/create-checkout</code> - Task-based checkout</li>
          <li><code className="bg-gray-200 px-1 rounded">POST /api/payments/create-payment</code> - Standalone payment</li>
          <li><code className="bg-gray-200 px-1 rounded">POST /api/payments/create-payout</code> - Payout to helper</li>
          <li><code className="bg-gray-200 px-1 rounded">GET /api/payments/provider</code> - Active provider status</li>
        </ul>
      </div>
    </div>
  )
}

