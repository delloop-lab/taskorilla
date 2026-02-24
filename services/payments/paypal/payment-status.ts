/**
 * PayPal Payment (Order) Status
 * Uses PayPal Orders API to fetch order details.
 * @see https://developer.paypal.com/docs/api/orders/v2/
 */

import paypal from '@paypal/checkout-server-sdk'
import { paypalClient } from './paypalClient'

export interface PayPalPaymentStatusResult {
  id: string
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED'
  amount?: number
  paymentIntentId?: string
}

export async function getPaymentStatus(
  orderId: string
): Promise<PayPalPaymentStatusResult> {
  const request = new paypal.orders.OrdersGetRequest(orderId)
  const response = await paypalClient.execute(request)
  const result = response.result as {
    id?: string
    status?: string
    purchase_units?: Array<{ amount?: { value?: string; currency_code?: string } }>
  }
  const amount = result.purchase_units?.[0]?.amount?.value
    ? parseFloat(result.purchase_units[0].amount!.value!)
    : undefined
  return {
    id: result.id || orderId,
    status: (result.status || 'UNKNOWN') as PayPalPaymentStatusResult['status'],
    amount,
    paymentIntentId: result.id,
  }
}
