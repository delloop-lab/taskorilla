/**
 * Airwallex API Client Library
 * Documentation: https://www.airwallex.com/docs/developer-tools__api
 */

// Airwallex API base URLs
// Demo/Sandbox: https://api-demo.airwallex.com
// Production: https://api.airwallex.com
const AIRWALLEX_API_BASE_URL = process.env.AIRWALLEX_ENVIRONMENT === 'production'
  ? 'https://api.airwallex.com'
  : 'https://api-demo.airwallex.com'

// For server-side calls, we use x-client-id and x-api-key headers
const AIRWALLEX_CLIENT_ID = process.env.AIRWALLEX_CLIENT_ID || ''
const AIRWALLEX_API_KEY = process.env.AIRWALLEX_API_KEY || ''

interface AirwallexPaymentIntent {
  id: string
  amount: number
  currency: string
  status: string
  payment_method_types?: string[]
  client_secret?: string
  return_url?: string
  [key: string]: any
}

interface AirwallexPayout {
  id: string
  amount: number
  currency: string
  status: string
  destination?: {
    type: string
    bank_account?: {
      bank_account_number?: string
      swift_code?: string
      account_holder_name?: string
    }
  }
  [key: string]: any
}

/**
 * Get API key for server-side authentication
 * For server-side calls, use the API key directly as Bearer token
 * Client ID is only for frontend/OAuth flows
 */
function getApiKey(): string {
  if (!AIRWALLEX_API_KEY) {
    throw new Error('Airwallex API key not configured. Please set AIRWALLEX_API_KEY environment variable in .env.local')
  }
  return AIRWALLEX_API_KEY
}

/**
 * Make authenticated request to Airwallex API
 * Uses API key directly as Bearer token for server-side calls
 */
async function makeRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const apiKey = getApiKey()
  
  const url = endpoint.startsWith('http') ? endpoint : `${AIRWALLEX_API_BASE_URL}${endpoint}`
  
  console.log(`[Airwallex] Making request to: ${url}`)
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': AIRWALLEX_CLIENT_ID,
      'x-api-key': apiKey,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorData
    try {
      errorData = JSON.parse(errorText)
    } catch {
      errorData = { message: errorText || response.statusText }
    }
    
    // Capture Allow header for 405 errors (shows which methods are allowed)
    const allowedMethods = response.headers.get('Allow') || response.headers.get('allow')
    
    // Log full error details
    console.error('[Airwallex] API error response:', {
      url,
      status: response.status,
      statusText: response.statusText,
      errorData: errorData,
      allowedMethods: allowedMethods || 'Not specified',
      fullResponse: errorText, // Full response, not truncated
    })
    
    // Create error with full details
    const error = new Error(`Airwallex API error: HTTP ${response.status} ${response.statusText}`) as any
    error.status = response.status
    error.statusText = response.statusText
    error.errorData = errorData
    error.response = { data: errorData }
    
    if (response.status === 405 && allowedMethods) {
      error.message = `Airwallex API error: HTTP ${response.status} ${response.statusText}. ` +
        `Endpoint exists but POST is not allowed. Allowed methods: ${allowedMethods}. ` +
        `Please check Airwallex API documentation for the correct HTTP method.`
    }
    
    throw error
  }

  return response.json()
}

/**
 * Create a payment in Airwallex
 * Endpoint: POST /api/v1/payments
 * 
 * @param payload - Complete Airwallex payment payload
 */
export async function createPaymentIntent(payload: {
  amount: number // Amount in cents
  currency: string
  payment_method_types: string[]
  return_url: string
  customer_id: string // REQUIRED: must start with cus_
  merchant_order_id: string // REQUIRED
  request_id?: string // Optional: unique per request
  metadata?: Record<string, string>
}): Promise<AirwallexPaymentIntent> {
  // Airwallex Payment API endpoint
  const endpoint = '/api/v1/payments'
  
  // Remove request_id if present (not needed for /payments endpoint)
  const { request_id, ...paymentPayload } = payload
  
  console.log(`[Airwallex] Creating payment at: ${AIRWALLEX_API_BASE_URL}${endpoint}`)
  console.log(`[Airwallex] Payload:`, JSON.stringify(paymentPayload, null, 2))
  
  const result = await makeRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(paymentPayload),
  })
  
  console.log(`[Airwallex] Payment created successfully:`, result.id)
  return result
}

/**
 * Get payment intent status - Airwallex uses "Payment Intent"
 * Endpoint: GET /api/v1/pa/payment_intents/{id}
 */
export async function getPaymentIntent(paymentIntentId: string): Promise<AirwallexPaymentIntent> {
  const endpoint = `/api/v1/pa/payment_intents/${paymentIntentId}`
  console.log(`[Airwallex] Getting payment intent: ${paymentIntentId}`)
  return await makeRequest(endpoint)
}

/**
 * Create a payment customer in Airwallex (for payment intents)
 * Endpoint: POST /api/v1/pa/customers/create
 * Creates a customer with ID starting with cus_ (not bcus_)
 * Documentation: https://www.airwallex.com/docs/api (Payment Acceptance API)
 */
export async function createCustomer(params: {
  first_name: string
  last_name: string
  email: string
}): Promise<{ id: string; [key: string]: any }> {
  const endpoint = '/api/v1/pa/customers/create'
  
  const payload = {
    request_id: `customer_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    merchant_customer_id: `merchant_${Date.now()}`,
    first_name: params.first_name,
    last_name: params.last_name,
    email: params.email,
  }
  
  console.log(`[Airwallex] Creating payment customer at: ${AIRWALLEX_API_BASE_URL}${endpoint}`)
  console.log(`[Airwallex] Payload:`, JSON.stringify(payload, null, 2))
  
  const result = await makeRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  
  console.log(`[Airwallex] Payment customer created successfully:`, result.id)
  return result
}

/**
 * Create a payout/transfer to a bank account
 */
export async function createPayout(params: {
  amount: number
  currency: string
  destination: {
    type: 'bank_account'
    bankAccountNumber: string
    swiftCode?: string
    accountHolderName: string
    bankName?: string
    bankCountryCode?: string
  }
  metadata?: Record<string, string>
  idempotencyKey?: string
}): Promise<AirwallexPayout> {
  const { amount, currency, destination, metadata, idempotencyKey } = params

  const payload: any = {
    amount: Math.round(amount * 100), // Convert to cents
    currency: currency.toUpperCase(),
    destination: {
      type: destination.type,
      bank_account: {
        bank_account_number: destination.bankAccountNumber,
        account_holder_name: destination.accountHolderName,
      },
    },
  }

  if (destination.swiftCode) {
    payload.destination.bank_account.swift_code = destination.swiftCode
  }

  if (destination.bankName) {
    payload.destination.bank_account.bank_name = destination.bankName
  }

  if (destination.bankCountryCode) {
    payload.destination.bank_account.bank_country_code = destination.bankCountryCode
  }

  if (metadata) {
    payload.metadata = metadata
  }

  const headers: Record<string, string> = {}
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey
  }

  return makeRequest('/api/v1/payouts/create', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
}

/**
 * Get payout status
 */
export async function getPayout(payoutId: string): Promise<AirwallexPayout> {
  return makeRequest(`/api/v1/payouts/${payoutId}`)
}

/**
 * Validate IBAN format (basic validation)
 */
export function validateIBAN(iban: string): boolean {
  // Remove spaces and convert to uppercase
  const cleaned = iban.replace(/\s/g, '').toUpperCase()
  
  // Basic IBAN format check (2 letters + 2 digits + up to 30 alphanumeric)
  const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/
  
  if (!ibanRegex.test(cleaned)) {
    return false
  }

  // Portuguese IBAN format: PT50 XXXX XXXX XXXX XXXX XXXX XX (23 characters)
  if (cleaned.startsWith('PT')) {
    return cleaned.length === 25 // PT + 2 check digits + 21 account digits
  }

  return true
}

/**
 * Format IBAN for display (add spaces every 4 characters)
 */
export function formatIBAN(iban: string): string {
  const cleaned = iban.replace(/\s/g, '').toUpperCase()
  return cleaned.match(/.{1,4}/g)?.join(' ') || cleaned
}

