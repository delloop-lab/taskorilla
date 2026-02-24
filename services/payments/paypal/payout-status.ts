/**
 * PayPal Payout Batch Status
 * Uses PayPal Payouts API to fetch batch status.
 * @see https://developer.paypal.com/docs/api/payments.payouts-batch/v1/
 */

const PAYPAL_BASE =
  process.env.PAYPAL_ENV === 'production' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com'

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set')
  }
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`PayPal OAuth failed: ${response.status} ${err}`)
  }
  const data = (await response.json()) as { access_token: string }
  return data.access_token
}

export interface PayPalPayoutStatusResult {
  payoutId: string
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'DENIED' | 'CANCELED'
  batchStatus?: string
  amount?: number
}

export async function getPayoutStatus(payoutBatchId: string): Promise<PayPalPayoutStatusResult> {
  const accessToken = await getAccessToken()
  const response = await fetch(`${PAYPAL_BASE}/v1/payments/payouts/${payoutBatchId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })
  const data = (await response.json()) as {
    batch_header?: { payout_batch_id?: string; batch_status?: string }
    items?: Array<{ payout_item?: { amount?: { value?: string } } }>
  }
  if (!response.ok) {
    throw new Error(`PayPal payout status failed: ${response.status}`)
  }
  const batchStatus = (data.batch_header?.batch_status || 'UNKNOWN').toUpperCase()
  const amount = data.items?.[0]?.payout_item?.amount?.value
    ? parseFloat(data.items[0].payout_item!.amount!.value!)
    : undefined
  const statusMap: Record<string, PayPalPayoutStatusResult['status']> = {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    SUCCESS: 'SUCCESS',
    DENIED: 'DENIED',
    CANCELED: 'CANCELED',
  }
  return {
    payoutId: data.batch_header?.payout_batch_id || payoutBatchId,
    status: statusMap[batchStatus] || 'PENDING',
    batchStatus,
    amount,
  }
}
