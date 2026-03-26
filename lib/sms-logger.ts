/**
 * Logs outgoing SMS messages to the sms_logs table.
 * Pass the server-side Supabase client from API routes.
 */

export interface SmsLogData {
  recipient_phone: string
  recipient_name?: string
  message: string
  status?: 'sent' | 'failed'
  related_task_id?: string
  related_user_id?: string
  metadata?: Record<string, unknown>
}

export async function logSms(data: SmsLogData, client: any): Promise<void> {
  try {
    await client.from('sms_logs').insert({
      recipient_phone: data.recipient_phone,
      recipient_name: data.recipient_name ?? null,
      message: data.message,
      status: data.status ?? 'sent',
      related_task_id: data.related_task_id ?? null,
      related_user_id: data.related_user_id ?? null,
      metadata: data.metadata ?? null,
    })
  } catch (err) {
    // Non-blocking — never throw
    console.warn('sms-logger: failed to log SMS:', err)
  }
}
