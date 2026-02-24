import paypal from '@paypal/checkout-server-sdk'
import { paypalClient } from './paypalClient'

export interface PayPalCheckoutResult {
  id: string
  approvalUrl: string
  amount: number
  paymentIntentId?: string
  sessionId?: string
  redirectUrl?: string
  checkoutUrl?: string
  next_action?: { url?: string }
}

export interface CreateCheckoutOptions {
  returnUrl: string
  cancelUrl: string
}

export async function createCheckout(
  taskId: string,
  amount: number,
  options?: CreateCheckoutOptions
): Promise<PayPalCheckoutResult> {
  const request = new paypal.orders.OrdersCreateRequest()
  request.prefer('return=representation')
  const body = {
    intent: 'CAPTURE' as const,
    purchase_units: [
      {
        amount: { currency_code: 'EUR', value: amount.toFixed(2) },
        custom_id: taskId,
      },
    ],
    ...(options?.returnUrl || options?.cancelUrl
      ? {
          application_context: {
            return_url: options.returnUrl,
            cancel_url: options.cancelUrl,
            brand_name: 'Taskorilla',
            user_action: 'PAY_NOW' as const,
          },
        }
      : {}),
  }
  request.requestBody(body)

  const response = await paypalClient.execute(request)
  const approvalUrl = response.result.links.find((link: { rel?: string; href?: string }) => link.rel === 'approve')?.href!
  return {
    id: taskId,
    approvalUrl,
    amount,
    paymentIntentId: response.result.id,
    sessionId: response.result.id,
    redirectUrl: approvalUrl,
    checkoutUrl: approvalUrl,
    next_action: approvalUrl ? { url: approvalUrl } : undefined,
  }
}

export async function captureOrder(orderId: string) {
  const request = new paypal.orders.OrdersCaptureRequest(orderId)
  request.requestBody({} as any)
  const response = await paypalClient.execute(request)
  return response.result
}
