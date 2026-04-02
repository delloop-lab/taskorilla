import { supabase as defaultSupabase } from './supabase'

export type EmailType = 
  | 'new_bid'
  | 'bid_updated'
  | 'bid_accepted'
  | 'bid_rejected'
  | 'bid_withdrawn'
  | 'bid_selected_pending_payment'
  | 'new_message'
  | 'message_blocked_pre_bid'
  | 'task_completed'
  | 'task_cancelled'
  | 'task_progress_update'
  | 'helper_finished'
  | 'revision_requested'
  | 'revision_completed'
  | 'payout_initiated'
  | 'admin_email'
  | 'profile_completion'
  | 'template_email'
  | 'test_email'
  | 'helper_task_match'
  | 'user_paused'

export interface EmailLogData {
  recipient_email: string
  recipient_name?: string
  subject: string
  email_type: EmailType
  status: 'sent' | 'failed' | 'pending'
  error_message?: string
  sent_by?: string
  related_task_id?: string
  related_user_id?: string
  metadata?: Record<string, any>
}

/**
 * Log an email to the database
 * This function is non-blocking and won't throw errors to avoid breaking email sending
 * Pass a server-side supabase client when calling from API routes to ensure auth context is correct
 */
export async function logEmail(data: EmailLogData, client?: any): Promise<void> {
  const supabase = client || defaultSupabase
  try {
    // Get current user if available (for admin emails)
    const { data: { user } } = await supabase.auth.getUser()
    
    // Use the SECURITY DEFINER function to bypass RLS
    const { error } = await supabase.rpc('log_email', {
      p_recipient_email: data.recipient_email,
      p_recipient_name: data.recipient_name || null,
      p_subject: data.subject,
      p_email_type: data.email_type,
      p_status: data.status,
      p_error_message: data.error_message || null,
      p_sent_by: data.sent_by || user?.id || null,
      p_related_task_id: data.related_task_id || null,
      p_related_user_id: data.related_user_id || null,
      p_metadata: data.metadata || null,
    })

    if (error) {
      // Log error but don't throw - we don't want email logging failures to break email sending
      console.error('Failed to log email to database:', error)
    }
  } catch (error) {
    // Silently fail - email logging should never break the email sending process
    console.error('Error logging email:', error)
  }
}

