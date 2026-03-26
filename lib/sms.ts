/**
 * SMSGate integration — https://sms-gate.app
 *
 * Env vars required:
 *   SMS_GATE_USER   – SMSGate account username
 *   SMS_GATE_PASS   – SMSGate account password
 *   SMS_GATE_DEVICE – (optional) Android device ID to route through
 */

const SMS_GATE_API = 'https://api.sms-gate.app/3rdparty/v1'

export interface SmsSendResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send an SMS via SMSGate to one or more phone numbers.
 * Phone numbers must be in E.164 format, e.g. +351912345678
 */
export async function sendHelperAlert(
  phone: string | string[],
  message: string,
): Promise<SmsSendResult> {
  const user = process.env.SMS_GATE_USER
  const pass = process.env.SMS_GATE_PASS
  const deviceId = process.env.SMS_GATE_DEVICE

  if (!user || !pass) {
    return { success: false, error: 'SMS_GATE_USER or SMS_GATE_PASS env vars are not set' }
  }

  const phoneNumbers = Array.isArray(phone) ? phone : [phone]

  const body: Record<string, unknown> = {
    message,
    phoneNumbers,
  }
  if (deviceId) {
    body.deviceId = deviceId
  }

  try {
    const credentials = Buffer.from(`${user}:${pass}`).toString('base64')

    const res = await fetch(`${SMS_GATE_API}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      return { success: false, error: `SMSGate returned ${res.status}: ${text}` }
    }

    const json = await res.json().catch(() => null)
    return { success: true, messageId: json?.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
