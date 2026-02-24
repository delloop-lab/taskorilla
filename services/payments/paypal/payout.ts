/**
 * PayPal Payouts API
 * Note: Payouts API is not in @paypal/checkout-server-sdk; we use REST directly.
 * @see https://developer.paypal.com/docs/api/payments.payouts-batch/v1/
 */

export interface PayPalPayoutResult {
  payoutId: string
  status: 'SUCCESS' | 'FAILED'
}

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

export async function createPayout(
  helperPayPalEmail: string,
  amount: number,
  options?: { taskId?: string }
): Promise<PayPalPayoutResult> {
  try {
    const accessToken = await getAccessToken()
    const senderBatchId = `payout_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    const senderItemId = options?.taskId ? `task_${options.taskId}` : `item_${Date.now()}`

    const body = {
      sender_batch_header: {
        sender_batch_id: senderBatchId,
        email_subject: 'You have a payout!',
        email_message: 'You have received a payout from the platform.',
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: amount.toFixed(2),
            currency: 'EUR',
          },
          note: 'Payout for completed task',
          sender_item_id: senderItemId,
          receiver: helperPayPalEmail,
        },
      ],
    }

    const response = await fetch(`${PAYPAL_BASE}/v1/payments/payouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    })

    const data = (await response.json()) as {
      batch_header?: { payout_batch_id?: string; batch_status?: string }
      name?: string
      message?: string
    }

    if (!response.ok) {
      console.error('[PayPal Payout] API error:', data)
      return {
        payoutId: data.batch_header?.payout_batch_id ?? '',
        status: 'FAILED',
      }
    }

    const payoutId = data.batch_header?.payout_batch_id ?? ''
    const batchStatus = (data.batch_header?.batch_status ?? '').toUpperCase()
    const status: 'SUCCESS' | 'FAILED' =
      batchStatus === 'SUCCESS' || batchStatus === 'PENDING' ? 'SUCCESS' : 'FAILED'

    return { payoutId, status }
  } catch (error) {
    console.error('[PayPal Payout] Error:', error)
    return { payoutId: '', status: 'FAILED' }
  }
}
