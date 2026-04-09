import { createClient } from '@supabase/supabase-js'

const ALLOWED_TEMPLATES = ['tasker_welcome', 'helper_welcome'] as const
export type WelcomeTemplateType = (typeof ALLOWED_TEMPLATES)[number]
export type QueueWelcomeSource =
  | 'register'
  | 'become_helper'
  | 'auth_callback'
  | 'unknown'

const DELAY_MS = 60 * 60 * 1000 // 1 hour
/** Client-called API rejects stale signups to limit abuse. */
export const MAX_PROFILE_AGE_MS_FOR_CLIENT_QUEUE = 20 * 60 * 1000

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

const EMAIL_CONFIRMED_FRESH_MS = 15 * 60 * 1000

export type QueueWelcomeResult =
  | {
      ok: true
      skipped?: 'duplicate' | 'confirmation_not_recent' | 'no_confirmation_timestamp'
    }
  | { ok: false; reason: string }

async function writeWelcomeAttemptAudit(params: {
  supabaseAdmin: any
  relatedUserId?: string
  recipientEmail?: string
  templateType?: WelcomeTemplateType
  source?: QueueWelcomeSource
  ok: boolean
  skippedReason?: string
  errorReason?: string
  meta?: Record<string, unknown>
}) {
  const {
    supabaseAdmin,
    relatedUserId,
    recipientEmail,
    templateType,
    source = 'unknown',
    ok,
    skippedReason,
    errorReason,
    meta = {},
  } = params
  try {
    await (supabaseAdmin.from('welcome_email_attempts' as any) as any).insert({
      related_user_id: relatedUserId || null,
      recipient_email: recipientEmail || null,
      template_type: templateType || null,
      source,
      ok,
      skipped_reason: skippedReason || null,
      error_reason: errorReason || null,
      meta,
    })
  } catch (auditError) {
    // Fail-open: observability must never block auth/signup paths.
    console.error('writeWelcomeAttemptAudit failed:', auditError)
  }
}

export async function queueScheduledWelcomeEmail(params: {
  recipientEmail: string
  recipientName: string
  relatedUserId: string
  templateType: WelcomeTemplateType
  source?: QueueWelcomeSource
  meta?: Record<string, unknown>
  /** When true (default), only allow queuing shortly after profile creation. */
  enforceRecentProfile?: boolean
}): Promise<QueueWelcomeResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return { ok: false, reason: 'Server misconfiguration' }
  }

  const {
    recipientEmail,
    recipientName,
    relatedUserId,
    templateType,
    source = 'unknown',
    meta = {},
    enforceRecentProfile = true,
  } = params

  if (!recipientEmail || !isValidEmail(recipientEmail) || !relatedUserId) {
    // Best-effort audit using a temporary client if config is present.
    if (url && serviceKey) {
      const supabaseAdmin = createClient(url, serviceKey)
      await writeWelcomeAttemptAudit({
        supabaseAdmin,
        relatedUserId,
        recipientEmail,
        templateType,
        source,
        ok: false,
        errorReason: 'Invalid payload',
        meta: { ...meta, enforceRecentProfile },
      })
    }
    return { ok: false, reason: 'Invalid payload' }
  }

  const supabaseAdmin = createClient(url, serviceKey)

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, created_at')
    .eq('id', relatedUserId)
    .maybeSingle()

  if (profileError || !profile?.created_at) {
    await writeWelcomeAttemptAudit({
      supabaseAdmin,
      relatedUserId,
      recipientEmail,
      templateType,
      source,
      ok: false,
      errorReason: 'Profile not found',
      meta: { ...meta, profileError: profileError?.message || null },
    })
    return { ok: false, reason: 'Profile not found' }
  }

  if (enforceRecentProfile) {
    const createdAt = new Date(profile.created_at).getTime()
    if (
      Number.isNaN(createdAt) ||
      Date.now() - createdAt > MAX_PROFILE_AGE_MS_FOR_CLIENT_QUEUE
    ) {
      await writeWelcomeAttemptAudit({
        supabaseAdmin,
        relatedUserId,
        recipientEmail,
        templateType,
        source,
        ok: false,
        errorReason: 'Invalid signup window',
        meta: { ...meta, profileCreatedAt: profile.created_at },
      })
      return { ok: false, reason: 'Invalid signup window' }
    }
  }

  const { data: existing } = await supabaseAdmin
    .from('scheduled_emails')
    .select('id')
    .eq('related_user_id', relatedUserId)
    .eq('template_type', templateType)
    .is('sent_at', null)
    .maybeSingle()

  if (existing) {
    await writeWelcomeAttemptAudit({
      supabaseAdmin,
      relatedUserId,
      recipientEmail,
      templateType,
      source,
      ok: true,
      skippedReason: 'duplicate',
      meta,
    })
    return { ok: true, skipped: 'duplicate' }
  }

  const sendAfter = new Date(Date.now() + DELAY_MS).toISOString()

  const { error: insertError } = await supabaseAdmin.from('scheduled_emails').insert({
    send_after: sendAfter,
    template_type: templateType,
    recipient_email: recipientEmail,
    recipient_name: recipientName || null,
    related_user_id: relatedUserId,
  })

  if (insertError) {
    // DB-level dedupe guard (partial unique index) should be treated as successful duplicate.
    if (insertError.code === '23505') {
      await writeWelcomeAttemptAudit({
        supabaseAdmin,
        relatedUserId,
        recipientEmail,
        templateType,
        source,
        ok: true,
        skippedReason: 'duplicate',
        meta: { ...meta, dedupeCode: insertError.code },
      })
      return { ok: true, skipped: 'duplicate' }
    }
    await writeWelcomeAttemptAudit({
      supabaseAdmin,
      relatedUserId,
      recipientEmail,
      templateType,
      source,
      ok: false,
      errorReason: 'Could not queue email',
      meta: { ...meta, insertError: insertError.message || null },
    })
    console.error('queueScheduledWelcomeEmail insert:', insertError)
    return { ok: false, reason: 'Could not queue email' }
  }

  await writeWelcomeAttemptAudit({
    supabaseAdmin,
    relatedUserId,
    recipientEmail,
    templateType,
    source,
    ok: true,
    meta: { ...meta, sendAfter },
  })
  return { ok: true }
}

/**
 * After the user confirms email (server-side), queue welcome ~1h from now.
 * Chooses helper vs tasker template from profile flags.
 *
 * Supabase confirmation links often use `type=email` (token_hash). Those share the same OTP
 * shape as some login flows, so when `requireRecentEmailConfirmation` is true we only queue if
 * `email_confirmed_at` is very recent (this verification pass).
 */
export async function queueWelcomeEmailAfterEmailConfirmation(
  userId: string,
  options?: {
    requireRecentEmailConfirmation?: boolean
    source?: QueueWelcomeSource
    meta?: Record<string, unknown>
  }
): Promise<QueueWelcomeResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return { ok: false, reason: 'Server misconfiguration' }
  }
  const source = options?.source || 'auth_callback'
  const sharedMeta = options?.meta || {}

  const supabaseAdmin = createClient(url, serviceKey)

  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (userError || !userData?.user?.email) {
    await writeWelcomeAttemptAudit({
      supabaseAdmin,
      relatedUserId: userId,
      recipientEmail: userData?.user?.email || undefined,
      source,
      ok: false,
      errorReason: 'User not found',
      meta: { ...sharedMeta, userError: userError?.message || null },
    })
    return { ok: false, reason: 'User not found' }
  }

  if (options?.requireRecentEmailConfirmation) {
    const at = userData.user.email_confirmed_at
    if (!at) {
      await writeWelcomeAttemptAudit({
        supabaseAdmin,
        relatedUserId: userId,
        recipientEmail: userData.user.email,
        source,
        ok: true,
        skippedReason: 'no_confirmation_timestamp',
        meta: sharedMeta,
      })
      return { ok: true, skipped: 'no_confirmation_timestamp' }
    }
    const confirmedMs = new Date(at).getTime()
    if (Number.isNaN(confirmedMs)) {
      await writeWelcomeAttemptAudit({
        supabaseAdmin,
        relatedUserId: userId,
        recipientEmail: userData.user.email,
        source,
        ok: false,
        errorReason: 'Invalid confirmation timestamp',
        meta: { ...sharedMeta, emailConfirmedAt: at },
      })
      return { ok: false, reason: 'Invalid confirmation timestamp' }
    }
    const ageMs = Date.now() - confirmedMs
    if (ageMs > EMAIL_CONFIRMED_FRESH_MS) {
      await writeWelcomeAttemptAudit({
        supabaseAdmin,
        relatedUserId: userId,
        recipientEmail: userData.user.email,
        source,
        ok: true,
        skippedReason: 'confirmation_not_recent',
        meta: { ...sharedMeta, ageMs },
      })
      return { ok: true, skipped: 'confirmation_not_recent' }
    }
  }

  const email = userData.user.email
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, is_helper')
    .eq('id', userId)
    .maybeSingle()

  const templateType: WelcomeTemplateType = profile?.is_helper ? 'helper_welcome' : 'tasker_welcome'
  const recipientName = profile?.full_name?.trim() || ''

  return queueScheduledWelcomeEmail({
    recipientEmail: email,
    recipientName,
    relatedUserId: userId,
    templateType,
    source,
    meta: sharedMeta,
    enforceRecentProfile: false,
  })
}
